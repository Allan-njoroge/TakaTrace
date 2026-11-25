import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Payout } from "../types/api";

export interface PayoutsResponse {
  items: Payout[];
  totals: { paidToday: number; pending: number; failed: number };
}

export function usePayouts(filters: { status?: string } = {}) {
  const query = filters.status ? `?status=${filters.status}` : "";
  return useQuery<PayoutsResponse>({
    queryKey: queryKeys.payouts(filters),
    queryFn: () => api.get<PayoutsResponse>(`/api/payouts${query}`),
  });
}

export function useRetryPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payoutId: string) => api.post(`/api/payouts/${payoutId}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payouts"] }),
  });
}
