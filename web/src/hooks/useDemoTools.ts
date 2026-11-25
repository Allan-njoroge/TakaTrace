import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useTamperReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { receiptId: string; field: "weightKg" | "material" | "pickerCode" | "weighedOn"; value: string }) =>
      api.post("/api/demo/tamper", input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["verify", input.receiptId] }),
  });
}

export function useRestoreReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: string) => api.post("/api/demo/restore", { receiptId }),
    onSuccess: (_, receiptId) => queryClient.invalidateQueries({ queryKey: ["verify", receiptId] }),
  });
}

export function useResetDemoData() {
  return useMutation({
    mutationFn: () => api.post("/api/demo/reset", { confirm: "RESET" }),
  });
}

export function useSeedSampleWeek() {
  return useMutation({
    mutationFn: () => api.post("/api/demo/seed-week"),
  });
}

export function useReanchorAll() {
  return useMutation({
    mutationFn: () => api.post("/api/demo/reanchor-all"),
  });
}
