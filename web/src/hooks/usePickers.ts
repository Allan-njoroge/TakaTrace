import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Paginated, Picker } from "../types/api";

export function usePickers(filters: { q?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();

  return useQuery<Paginated<Picker>>({
    queryKey: queryKeys.pickers(filters),
    queryFn: () => api.get<Paginated<Picker>>(`/api/pickers${query ? `?${query}` : ""}`),
  });
}

export function usePickerLookup(q: string, enabled: boolean) {
  return useQuery<Picker | null>({
    queryKey: ["pickers", "lookup", q],
    queryFn: async () => {
      try {
        return await api.get<Picker>(`/api/pickers/lookup?q=${encodeURIComponent(q)}`);
      } catch {
        return null;
      }
    },
    enabled: enabled && q.length > 0,
    staleTime: 0,
  });
}

export function usePicker(pickerId: string | undefined) {
  return useQuery<Picker>({
    queryKey: queryKeys.picker(pickerId ?? ""),
    queryFn: () => api.get<Picker>(`/api/pickers/${pickerId}`),
    enabled: Boolean(pickerId),
  });
}

export interface CreatePickerInput {
  firstName: string;
  lastName?: string;
  phone: string;
  language: "en" | "sw";
  idNumber?: string;
  consentConfirmed: boolean;
}

export function useCreatePicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePickerInput) => api.post<Picker>("/api/pickers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickers"] }),
  });
}

export function useSuspendPicker(pickerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.post(`/api/pickers/${pickerId}/suspend`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.picker(pickerId) }),
  });
}

export function useSendTestSms(pickerId: string) {
  return useMutation({
    mutationFn: () => api.post(`/api/pickers/${pickerId}/test-sms`),
  });
}
