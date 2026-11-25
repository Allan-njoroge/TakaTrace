import { chainStatus, getContract } from "./provider.js";

export interface OnChainRole {
  isAdmin: boolean;
  isBuyingCentre: boolean;
  isBrand: boolean;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: OnChainRole; at: number }>();

export async function getOnChainRole(address: string): Promise<OnChainRole> {
  const key = address.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  if (!chainStatus.contractDeployed) {
    const value: OnChainRole = { isAdmin: false, isBuyingCentre: false, isBrand: false };
    cache.set(key, { value, at: Date.now() });
    return value;
  }

  const contract = getContract();
  const [admin, isBuyingCentre, isBrand] = await Promise.all([
    contract.admin() as Promise<string>,
    contract.isBuyingCentre(address) as Promise<boolean>,
    contract.isBrand(address) as Promise<boolean>,
  ]);
  const value: OnChainRole = { isAdmin: admin.toLowerCase() === key, isBuyingCentre, isBrand };
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** Called by the indexer when a *Added/*Removed event changes an address's role. */
export function clearRoleCache(address: string): void {
  cache.delete(address.toLowerCase());
}

export function clearAllRoleCache(): void {
  cache.clear();
}
