import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { CentreSummary, Paginated, Receipt, TimelineEntry } from "../types/api";

export interface ReceiptFilters {
  status?: string;
  material?: string;
  pickerId?: string;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
}

function toQueryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useReceipts(filters: ReceiptFilters = {}) {
  return useQuery<Paginated<Receipt>>({
    queryKey: queryKeys.receipts(filters),
    queryFn: () => api.get<Paginated<Receipt>>(`/api/receipts${toQueryString(filters)}`),
  });
}

export function useReceipt(receiptId: string | undefined) {
  return useQuery<Receipt>({
    queryKey: queryKeys.receipt(receiptId ?? ""),
    queryFn: () => api.get<Receipt>(`/api/receipts/${receiptId}`),
    enabled: Boolean(receiptId),
  });
}

export function useReceiptTimeline(receiptId: string | undefined) {
  return useQuery<TimelineEntry[]>({
    queryKey: queryKeys.receiptTimeline(receiptId ?? ""),
    queryFn: () => api.get<TimelineEntry[]>(`/api/receipts/${receiptId}/timeline`),
    enabled: Boolean(receiptId),
  });
}

export function useCentreSummary(date: string) {
  return useQuery<CentreSummary>({
    queryKey: queryKeys.centreSummary(date),
    queryFn: () => api.get<CentreSummary>(`/api/centre/summary?date=${date}`),
  });
}

interface CreateReceiptInput {
  pickerId: string;
  material: string;
  weightKg: number;
  weighedOn: string;
  photoId?: string;
  note?: string;
  operatorConfirmed: boolean;
  idempotencyKey: string;
}

export interface CreateReceiptResponse {
  receiptId: string;
  recordText: string;
  dataHash: string;
  payoutKes: number;
  status: "DRAFT";
  contract: { address: string; chainId: number };
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: CreateReceiptInput) =>
      api.post<CreateReceiptResponse>("/api/receipts", body, { idempotencyKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["centre-summary"] });
    },
  });
}

export function useAnchorReceipt(receiptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txHash: string) => api.post(`/api/receipts/${receiptId}/anchor`, { txHash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receipt(receiptId) });
    },
  });
}

export function useReportAnchorCancelled(receiptId: string) {
  return useMutation({
    mutationFn: (reason: "USER_REJECTED" | "WRONG_NETWORK" | "OTHER") =>
      api.post(`/api/receipts/${receiptId}/anchor-cancelled`, { reason }),
  });
}

export function useDiscardDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: string) => api.delete(`/api/receipts/${receiptId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useSetDisputeFlag(receiptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { txHash: string; disputed: boolean }) =>
      api.post(`/api/receipts/${receiptId}/dispute-flag`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.receipt(receiptId) }),
  });
}
