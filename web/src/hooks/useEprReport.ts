import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Material } from "../types/api";

export interface EprReportLine {
  receiptId: string;
  material: Material;
  weightKg: number;
  dataHash: string;
  claimTxHash: string;
  blockNumber: number;
  claimedAt: string;
}

export interface EprReport {
  brand: string;
  year: number;
  contractAddress: string;
  totalsByMaterial: Array<{ material: Material; kg: number }>;
  totalsByMonth: Array<{ month: string; kg: number }>;
  lines: EprReportLine[];
  mismatches: Array<{ receiptId: string; reason: string }>;
}

export function useEprReport(year: number) {
  return useQuery<EprReport>({
    queryKey: ["epr-report", year],
    queryFn: () => api.get<EprReport>(`/api/reports/epr?year=${year}&format=json`),
  });
}
