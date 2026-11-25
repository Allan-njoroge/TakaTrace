import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { ContractInfo } from "../types/api";

export function usePublicContract() {
  return useQuery<ContractInfo>({
    queryKey: queryKeys.publicContract(),
    queryFn: () => api.get<ContractInfo>("/api/public/contract"),
    staleTime: 60_000,
  });
}
