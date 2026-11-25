import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { HealthResponse } from "../types/api";

/** Polls GET /api/health for the system banners (spec 6.4): backend reachability, contract deployment, chain reset. */
export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: queryKeys.health(),
    queryFn: () => api.get<HealthResponse>("/api/health"),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
