import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { PublicActivity, PublicMaterial, PublicPartner, PublicStats } from "../types/api";

export function usePublicStats() {
  return useQuery<PublicStats>({
    queryKey: queryKeys.publicStats(),
    queryFn: () => api.get<PublicStats>("/api/public/stats"),
  });
}

export function usePublicMaterials() {
  return useQuery<PublicMaterial[]>({
    queryKey: queryKeys.publicMaterials(),
    queryFn: () => api.get<PublicMaterial[]>("/api/public/materials"),
  });
}

export function usePublicPartners() {
  return useQuery<PublicPartner[]>({
    queryKey: queryKeys.publicPartners(),
    queryFn: () => api.get<PublicPartner[]>("/api/public/partners"),
  });
}

export function usePublicActivity() {
  return useQuery<PublicActivity>({
    queryKey: queryKeys.publicActivity(),
    queryFn: () => api.get<PublicActivity>("/api/public/activity"),
  });
}
