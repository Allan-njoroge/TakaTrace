import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { centsToKesNumber } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { kesStringToCents } from "../../lib/money.js";
import { MATERIALS } from "../../lib/record.js";
import type { SessionUser } from "../../middleware/session.js";

export async function getCurrentPrices(user: SessionUser, orgId: string | undefined, history: boolean) {
  const organizationId = resolveOrgId(user, orgId);
  if (history) {
    const rows = await prisma.price.findMany({ where: { organizationId }, orderBy: { effectiveFrom: "desc" }, take: 200 });
    return rows.map((p) => ({ material: p.material, pricePerKgKes: centsToKesNumber(p.pricePerKgCents), effectiveFrom: p.effectiveFrom.toISOString() }));
  }
  const current: { material: string; pricePerKgKes: number; effectiveFrom: string }[] = [];
  for (const material of MATERIALS) {
    const price = await prisma.price.findFirst({ where: { organizationId, material, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: "desc" } });
    if (price) current.push({ material, pricePerKgKes: centsToKesNumber(price.pricePerKgCents), effectiveFrom: price.effectiveFrom.toISOString() });
  }
  return current;
}

export interface SetPriceInput {
  material: string;
  pricePerKgKes: string;
  effectiveFrom?: string;
}

export async function setPrices(user: SessionUser, orgId: string | undefined, prices: SetPriceInput[]): Promise<void> {
  const organizationId = resolveOrgId(user, orgId);
  for (const p of prices) {
    if (!(MATERIALS as readonly string[]).includes(p.material)) throw new AppError("VALIDATION", "Choose a valid material.", { material: "Invalid" });
    const cents = kesStringToCents(p.pricePerKgKes);
    if (cents < 1 || cents > 100_000) throw new AppError("VALIDATION", "Price must be between KES 0.01 and 1,000.00 per kg.", { pricePerKgKes: "Out of range" });

    await prisma.price.create({
      data: { organizationId, material: p.material, pricePerKgCents: cents, effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom) : new Date(), createdByUserId: user.id },
    });
    await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "PRICE_SET", entityType: "Organization", entityId: organizationId, summary: `${p.material} price set to KES ${p.pricePerKgKes}/kg.` });
  }
}

function resolveOrgId(user: SessionUser, orgId: string | undefined): string {
  if (user.role === "ADMIN" && orgId) return orgId;
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a buying centre.");
  return user.organizationId;
}
