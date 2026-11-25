import { Contract, type Signer } from "ethers";
import contractJson from "../../contract.json";
import { getReadProvider } from "./provider";

export interface OnChainReceipt {
  dataHash: string;
  recordedBy: string;
  recordedAt: bigint;
  claimed: boolean;
  claimedBy: string;
}

/** The subset of the ABI this frontend calls, kept explicit so a missing v1.1 function fails clearly. */
export interface TakaTraceContract {
  getReceipt(receiptId: string): Promise<OnChainReceipt>;
  verifyReceipt(receiptId: string, recordText: string): Promise<boolean>;
  recordReceipt(receiptId: string, dataHash: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  claimCredit(receiptId: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  isBrand(address: string): Promise<boolean>;
  isBuyingCentre(address: string): Promise<boolean>;
  admin(): Promise<string>;
  addBuyingCentre(address: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  addBrand(address: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  /** Contract v1.1 — not present in the currently deployed ABI. Call only after checking `supportsFunction`. */
  setDisputed?(receiptId: string, disputed: boolean): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  isDisputed?(receiptId: string): Promise<boolean>;
  removeBuyingCentre?(address: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  removeBrand?(address: string): Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
}

export const contractAddress = contractJson.address;
export const contractChainId = Number(contractJson.chainId);

export function getReadContract(): TakaTraceContract {
  return new Contract(contractJson.address, contractJson.abi, getReadProvider()) as unknown as TakaTraceContract;
}

export function getWriteContract(signer: Signer): TakaTraceContract {
  return new Contract(contractJson.address, contractJson.abi, signer) as unknown as TakaTraceContract;
}

/** True if the deployed ABI includes a function by this name (guards v1.1-only calls, see FRONTEND_PROGRESS.md). */
export function supportsFunction(name: string): boolean {
  return contractJson.abi.some((entry) => entry.type === "function" && entry.name === name);
}
