import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Picker, SmsStatus } from "../types/api";

export interface SimulatedSms {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  text: string;
  status: SmsStatus;
  at: string;
}

export function useDemoPickers() {
  return useQuery<Picker[]>({
    queryKey: ["demo", "pickers"],
    queryFn: () => api.get<Picker[]>("/api/demo/pickers"),
  });
}

export function usePhoneSms(phone: string | null) {
  return useQuery<SimulatedSms[]>({
    queryKey: queryKeys.demoPhoneSms(phone ?? ""),
    queryFn: () => api.get<SimulatedSms[]>(`/api/demo/phone/${encodeURIComponent(phone ?? "")}/sms`),
    enabled: Boolean(phone),
    refetchInterval: 5000,
  });
}

export function useSendInboundSms(phone: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => api.post(`/api/demo/phone/${encodeURIComponent(phone ?? "")}/sms`, { text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.demoPhoneSms(phone ?? "") }),
  });
}

export interface UssdResponse {
  mode: "CON" | "END";
  text: string;
}

/** The USSD endpoint replies text/plain as "CON ..." or "END ..." per the Africa's Talking convention. */
function parseUssdResponse(raw: string): UssdResponse {
  const mode = raw.startsWith("CON") ? "CON" : "END";
  return { mode, text: raw.replace(/^(CON|END)\s*/, "") };
}

export function useUssdSession() {
  return useMutation({
    mutationFn: async (input: { sessionId: string; phoneNumber: string; text: string }) => {
      const raw = await api.post<string>("/api/demo/ussd", { ...input, serviceCode: "*384*123#" });
      return parseUssdResponse(raw);
    },
  });
}
