import { useCallback, useRef, useState } from "react";
import type { Signer } from "ethers";
import { getBrowserProvider } from "../lib/chain/provider";
import { getWriteContract, type TakaTraceContract } from "../lib/chain/contract";
import { getFriendlyChainErrorMessage } from "../lib/chain/errors";

export type TxStatus =
  | "idle"
  | "awaitingSignature"
  | "submitted"
  | "confirmed"
  | "synced"
  | "rejected"
  | "failed"
  | "syncTimeout";

export interface TxState {
  status: TxStatus;
  txHash: string | null;
  blockNumber: number | null;
  errorMessage: string | null;
}

interface RunOptions {
  /** Sends the transaction. Receives the write contract and the connected signer. */
  send: (contract: TakaTraceContract, signer: Signer) => Promise<{ hash: string; wait: (confirmations?: number) => Promise<unknown> }>;
  /** Reports the tx hash to the backend immediately, so it can recover even if the browser closes (spec 13.2). */
  onSubmitted?: (txHash: string) => Promise<void> | void;
  /** Polled until it resolves true, meaning the backend has recorded the on-chain change. Omit to skip this step. */
  waitForSync?: (txHash: string) => Promise<boolean>;
  syncPollMs?: number;
  syncTimeoutMs?: number;
}

const idleState: TxState = { status: "idle", txHash: null, blockNumber: null, errorMessage: null };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Drives the 4-step transaction stepper (spec 13.2): awaitingSignature → submitted → confirmed → synced. */
export function useContractTx() {
  const [state, setState] = useState<TxState>(idleState);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setState(idleState);
  }, []);

  const run = useCallback(async (options: RunOptions): Promise<TxStatus> => {
    cancelledRef.current = false;
    setState({ ...idleState, status: "awaitingSignature" });

    let signer: Signer;
    try {
      signer = await getBrowserProvider().getSigner();
    } catch (error) {
      setState({ ...idleState, status: "rejected", errorMessage: getFriendlyChainErrorMessage(error) });
      return "rejected";
    }

    const contract = getWriteContract(signer);

    let txHash: string;
    try {
      const tx = await options.send(contract, signer);
      txHash = tx.hash;
      if (cancelledRef.current) return "idle";
      setState({ status: "submitted", txHash, blockNumber: null, errorMessage: null });

      await options.onSubmitted?.(txHash);
      if (cancelledRef.current) return "idle";

      await tx.wait(1);
      if (cancelledRef.current) return "idle";
      setState((prev) => ({ ...prev, status: "confirmed" }));
    } catch (error) {
      if (cancelledRef.current) return "idle";
      const message = getFriendlyChainErrorMessage(error);
      const rejected = (error as { code?: string | number }).code === "ACTION_REJECTED" || (error as { code?: string | number }).code === 4001;
      const status: TxStatus = rejected ? "rejected" : "failed";
      setState((prev) => ({ ...prev, status, errorMessage: message }));
      return status;
    }

    if (!options.waitForSync) {
      if (!cancelledRef.current) setState((prev) => ({ ...prev, status: "synced" }));
      return "synced";
    }

    const pollMs = options.syncPollMs ?? 2000;
    const timeoutMs = options.syncTimeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (cancelledRef.current) return "idle";
      try {
        const synced = await options.waitForSync(txHash);
        if (synced) {
          if (!cancelledRef.current) setState((prev) => ({ ...prev, status: "synced" }));
          return "synced";
        }
      } catch {
        // A transient check failure doesn't end the poll; keep trying until the deadline.
      }
      await sleep(pollMs);
    }

    if (!cancelledRef.current) setState((prev) => ({ ...prev, status: "syncTimeout" }));
    return "syncTimeout";
  }, []);

  return { state, run, reset };
}
