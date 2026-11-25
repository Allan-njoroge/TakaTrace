import type { Log } from "ethers";
import { config } from "../config.js";
import { chainStatus, getContract, provider } from "./provider.js";

export type ExpectedEventName =
  | "ReceiptRecorded"
  | "CreditClaimed"
  | "DisputeFlagChanged"
  | "BuyingCentreAdded"
  | "BuyingCentreRemoved"
  | "BrandAdded"
  | "BrandRemoved";

export interface ExpectedEvent {
  name: ExpectedEventName;
  /** Argument values to check, compared case-insensitively for addresses. */
  args: Record<string, string | boolean>;
}

export type TxVerifyResult =
  | { status: "CONFIRMED"; blockNumber: number; args: Record<string, unknown> }
  | { status: "TIMEOUT" }
  | { status: "FAILED"; reason: string }
  | { status: "MISMATCH"; reason: string };

function eq(a: unknown, b: string | boolean): boolean {
  if (typeof b === "boolean") return Boolean(a) === b;
  if (typeof a === "string" && a.startsWith("0x") && a.length === 42) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return String(a) === b;
}

/**
 * Checks a browser-reported transaction actually did what the caller expects:
 * confirmed, sent to our contract, from the expected wallet, and containing the
 * expected event with the expected argument values (BACKEND_SPEC.md section 13.3).
 */
export async function verifyTx(txHash: string, fromAddress: string, expected: ExpectedEvent): Promise<TxVerifyResult> {
  if (!chainStatus.contractDeployed || !chainStatus.contractAddress) {
    return { status: "FAILED", reason: "The smart contract isn't deployed." };
  }

  let receipt;
  try {
    receipt = await provider.waitForTransaction(txHash, config.CONFIRMATIONS, config.TX_WAIT_TIMEOUT_MS);
  } catch {
    return { status: "TIMEOUT" };
  }
  if (!receipt) return { status: "TIMEOUT" };
  if (receipt.status !== 1) return { status: "FAILED", reason: "Transaction reverted." };
  if (receipt.to?.toLowerCase() !== chainStatus.contractAddress.toLowerCase()) {
    return { status: "MISMATCH", reason: "Transaction was not sent to the TakaTrace contract." };
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== fromAddress.toLowerCase()) {
    return { status: "MISMATCH", reason: "Transaction was not sent from the expected wallet." };
  }

  const contract = getContract();
  for (const log of receipt.logs as Log[]) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }
    if (!parsed || parsed.name !== expected.name) continue;

    const args: Record<string, unknown> = {};
    for (const frag of parsed.fragment.inputs) args[frag.name] = parsed.args[frag.name];

    const allMatch = Object.entries(expected.args).every(([key, value]) => eq(args[key], value));
    if (allMatch) return { status: "CONFIRMED", blockNumber: receipt.blockNumber, args };
  }

  return { status: "MISMATCH", reason: `Expected event ${expected.name} with matching values was not found in the transaction.` };
}
