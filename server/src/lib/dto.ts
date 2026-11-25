/**
 * The frontend (web/src/types/api.ts) wants plain numbers for weight and money, not
 * the formatted strings BACKEND_SPEC.md section 11 describes ("both raw and
 * formatted"). These helpers produce the frontend's shape; internal storage (grams,
 * cents) is unchanged.
 */

/** Whole grams -> kg as a number with at most 2 decimals (e.g. 50000 -> 50, 12340 -> 12.34). */
export function gramsToKgNumber(grams: number): number {
  return Math.round(grams) / 1000;
}

/** Integer cents -> KES as a number with at most 2 decimals (e.g. 125000 -> 1250). */
export function centsToKesNumber(cents: number): number {
  return Math.round(cents) / 100;
}

export type FrontendOrgType = "BUYING_CENTRE" | "BRAND";

/** Backend Organization.type ("CENTRE" | "BRAND" | "OPERATOR") -> frontend's OrganizationType. */
export function toFrontendOrgType(dbType: string): FrontendOrgType {
  return dbType === "CENTRE" ? "BUYING_CENTRE" : "BRAND";
}

/** Frontend OrganizationType -> backend Organization.type. */
export function toBackendOrgType(frontendType: FrontendOrgType): "CENTRE" | "BRAND" {
  return frontendType === "BUYING_CENTRE" ? "CENTRE" : "BRAND";
}

export interface OrganizationRow {
  id: string;
  type: string;
  name: string;
  code: string;
  county: string | null;
  status: string;
}

/**
 * Maps a DB organization to the frontend's Organization shape. Returns null for the
 * operator org (type OPERATOR, e.g. the admin's own org) since the frontend's
 * OrganizationType has no equivalent — admin pages never need to show it (every
 * reference in the frontend uses `me.organization?.name`, so null is handled).
 */
export function toOrganizationDto(org: OrganizationRow | null): { id: string; type: FrontendOrgType; name: string; code: string; county: string; status: string } | null {
  if (!org || org.type === "OPERATOR") return null;
  return { id: org.id, type: toFrontendOrgType(org.type), name: org.name, code: org.code, county: org.county ?? "", status: org.status };
}

export interface UserRow {
  id: string;
  walletAddress: string;
  displayName: string;
  role: string;
  onChainApproved: boolean;
}

export function toUserDto(user: UserRow): { id: string; walletAddress: string; displayName: string; role: string; onChainApproved: boolean } {
  return { id: user.id, walletAddress: user.walletAddress, displayName: user.displayName, role: user.role, onChainApproved: user.onChainApproved };
}
