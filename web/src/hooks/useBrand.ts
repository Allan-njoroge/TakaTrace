import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { AvailableCredit, BrandSummary, Claim, Material, Paginated } from "../types/api";

export function useBrandSummary(year: number) {
  return useQuery<BrandSummary>({
    queryKey: queryKeys.brandSummary(year),
    queryFn: () => api.get<BrandSummary>(`/api/brand/summary?year=${year}`),
  });
}

export interface CreditFilters {
  material?: string;
  county?: string;
  centreCode?: string;
  minKg?: number;
  sort?: "oldest" | "largest";
}

export function useAvailableCredits(filters: CreditFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();

  return useQuery<AvailableCredit[]>({
    queryKey: queryKeys.credits(filters),
    queryFn: () => api.get<AvailableCredit[]>(`/api/credits/available${query ? `?${query}` : ""}`),
    staleTime: 10_000,
  });
}

export function useClaims(filters: { year?: number; material?: Material } = {}) {
  const params = new URLSearchParams();
  if (filters.year) params.set("year", String(filters.year));
  if (filters.material) params.set("material", filters.material);
  const query = params.toString();

  return useQuery<Paginated<Claim>>({
    queryKey: queryKeys.claims(filters),
    queryFn: () => api.get<Paginated<Claim>>(`/api/claims${query ? `?${query}` : ""}`),
  });
}

export function useRecordClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { receiptId: string; txHash: string; complianceYear: number; productLine?: string }) =>
      api.post<Claim>("/api/claims", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["brand-summary"] });
    },
  });
}
