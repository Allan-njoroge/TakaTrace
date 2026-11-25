import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { hashRecordText } from "../lib/chain/hash";
import { getReadContract } from "../lib/chain/contract";
import type { VerifyResponse } from "../types/api";

export type ClientVerdict = "MATCH" | "MISMATCH" | "NOT_ON_CHAIN" | "CHAIN_UNAVAILABLE" | "NOT_FOUND";

export interface VerifyReceiptResult {
  server: VerifyResponse | null;
  browserHash: string | null;
  onChainHash: string | null;
  verdict: ClientVerdict;
}

/**
 * Fetches the server's record, then independently recomputes the hash in the browser and reads the
 * contract directly (spec 13.5) — the server can't fake a "genuine" result because the browser checks
 * the blockchain itself, not through the server.
 */
export function useVerifyReceipt(receiptId: string | undefined) {
  return useQuery<VerifyReceiptResult>({
    queryKey: receiptId ? queryKeys.verify(receiptId) : ["verify", "unknown"],
    enabled: Boolean(receiptId),
    staleTime: 0,
    queryFn: async () => {
      if (!receiptId) throw new Error("No receipt ID.");

      let server: VerifyResponse;
      try {
        server = await api.get<VerifyResponse>(`/api/verify/${receiptId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { server: null, browserHash: null, onChainHash: null, verdict: "NOT_FOUND" as const };
        }
        throw error;
      }

      const browserHash = hashRecordText(server.recordText);

      let verdict: ClientVerdict;
      let onChainHash: string | null = null;

      try {
        const contract = getReadContract();
        const onChain = await contract.getReceipt(receiptId);
        if (!onChain.dataHash || /^0x0+$/.test(onChain.dataHash)) {
          verdict = "NOT_ON_CHAIN";
        } else {
          onChainHash = onChain.dataHash;
          const matches = await contract.verifyReceipt(receiptId, server.recordText);
          verdict = matches && onChain.dataHash === browserHash ? "MATCH" : "MISMATCH";
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        verdict = /receipt does not exist/i.test(message) ? "NOT_ON_CHAIN" : "CHAIN_UNAVAILABLE";
      }

      return { server, browserHash, onChainHash, verdict };
    },
  });
}
