import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { AdminOverview, AuditEntry, ChainStatus, IntegrityScanResult, Material, Organization, Paginated, User } from "../types/api";

export function useAdminOverview() {
  return useQuery<AdminOverview>({
    queryKey: queryKeys.adminOverview(),
    queryFn: () => api.get<AdminOverview>("/api/admin/overview"),
  });
}

export interface OrganizationWallet {
  address: string;
  name: string;
  role: "CENTRE_OPERATOR" | "BRAND_OFFICER";
  onChainApproved: boolean;
  status: "ACTIVE" | "SUSPENDED";
}

export interface OrganizationDetail extends Organization {
  wallets: OrganizationWallet[];
  targets: Array<{ year: number; material: Material; targetKg: number }>;
}

export function useAdminOrganizations(filters: { type?: string } = {}) {
  const query = filters.type ? `?type=${filters.type}` : "";
  return useQuery<Paginated<Organization & { wallets: number; onChainApproved: boolean }>>({
    queryKey: queryKeys.adminOrganizations(filters),
    queryFn: () => api.get(`/api/admin/organizations${query}`),
  });
}

export function useAdminOrganization(orgId: string | undefined) {
  return useQuery<OrganizationDetail>({
    queryKey: queryKeys.adminOrganization(orgId ?? ""),
    queryFn: () => api.get<OrganizationDetail>(`/api/admin/organizations/${orgId}`),
    enabled: Boolean(orgId),
  });
}

export interface CreateOrganizationInput {
  type: "BUYING_CENTRE" | "BRAND";
  name: string;
  code: string;
  county: string;
  contactName: string;
  email: string;
  phone: string;
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => api.post<Organization>("/api/admin/organizations", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] }),
  });
}

export function useRoleSync(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txHash: string) => api.post("/api/admin/role-sync", { txHash }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminOrganization(orgId) }),
  });
}

export function useAdminUsers() {
  return useQuery<User[]>({
    queryKey: queryKeys.adminUsers(),
    queryFn: () => api.get<User[]>("/api/admin/users"),
  });
}

export function useAdminChain() {
  return useQuery<ChainStatus>({
    queryKey: queryKeys.adminChain(),
    queryFn: () => api.get<ChainStatus>("/api/admin/chain"),
    refetchInterval: 15_000,
  });
}

export function useResyncChain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/admin/chain/resync"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminChain() }),
  });
}

export function useIntegrityScan() {
  return useMutation({
    mutationFn: () => api.post<IntegrityScanResult>("/api/admin/integrity-scan"),
  });
}

export function useAdminAudit(filters: { action?: string; entityId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.entityId) params.set("entityId", filters.entityId);
  const query = params.toString();

  return useQuery<Paginated<AuditEntry>>({
    queryKey: queryKeys.adminAudit(filters),
    queryFn: () => api.get<Paginated<AuditEntry>>(`/api/admin/audit${query ? `?${query}` : ""}`),
  });
}

export interface IntegrationCard {
  name: "sms" | "ussd" | "mpesa" | "ipfs" | "blockchain";
  mode: string;
  health: "ok" | "degraded" | "down";
  webhookUrl?: string;
  recentCalls: Array<{ at: string; status: string; summary: string }>;
}

export function useAdminIntegrations() {
  return useQuery<IntegrationCard[]>({
    queryKey: queryKeys.adminIntegrations(),
    queryFn: () => api.get<IntegrationCard[]>("/api/admin/integrations"),
  });
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: (input: { kind: "sms" | "payout" | "storage"; phone?: string }) =>
      api.post(`/api/admin/integrations/test-${input.kind}`, input),
  });
}
