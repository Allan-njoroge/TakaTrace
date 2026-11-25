import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Material, Price } from "../types/api";

export function usePrices() {
  return useQuery<Price[]>({
    queryKey: queryKeys.prices(),
    queryFn: () => api.get<Price[]>("/api/prices"),
  });
}

export function useUpdatePrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prices: Array<{ material: Material; pricePerKgKes: number }>) => api.put("/api/prices", { prices }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.prices() }),
  });
}
