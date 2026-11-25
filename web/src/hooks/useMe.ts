import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Me } from "../types/api";

/** Wraps GET /api/auth/me. Resolves to null when signed out, rather than throwing. */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      try {
        return await api.get<Me>("/api/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}
