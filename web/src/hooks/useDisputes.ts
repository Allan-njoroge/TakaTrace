import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Dispute, Paginated, Receipt } from "../types/api";

export function useDisputes(filters: { status?: string } = {}) {
  const query = filters.status ? `?status=${filters.status}` : "";
  return useQuery<Paginated<Dispute>>({
    queryKey: queryKeys.disputes(filters),
    queryFn: () => api.get<Paginated<Dispute>>(`/api/disputes${query}`),
  });
}

export interface DisputeDetail extends Dispute {
  receipt: Receipt;
  message: string;
}

export function useDispute(disputeId: string | undefined) {
  return useQuery<DisputeDetail>({
    queryKey: queryKeys.dispute(disputeId ?? ""),
    queryFn: () => api.get<DisputeDetail>(`/api/disputes/${disputeId}`),
    enabled: Boolean(disputeId),
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { receiptId: string; reason: string; message: string }) => api.post<Dispute>("/api/disputes", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["disputes"] }),
  });
}

export function useRejectDispute(disputeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => api.post(`/api/disputes/${disputeId}/resolve`, { outcome: "REJECTED", note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dispute(disputeId) }),
  });
}
