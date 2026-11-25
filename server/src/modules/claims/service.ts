import { verifyTx } from "../../chain/txVerifier.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { gramsToKgNumber } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import { buildRecordText, hashRecordText } from "../../lib/record.js";
import type { SessionUser } from "../../middleware/session.js";

export interface AvailableCreditFilters {
  material?: string;
  county?: string;
  centreCode?: string;
  from?: string;
  to?: string;
  minKg?: number;
  sort?: "oldest" | "largest";
}

/** Anchored, unclaimed, undisputed, past the claim hold, and re-verified MATCH. */
export async function listAvailableCredits(filters: AvailableCreditFilters) {
  const holdCutoff = new Date(Date.now() - config.CLAIM_HOLD_HOURS * 3_600_000);
  const receipts = await prisma.receipt.findMany({
    where: {
      status: "ANCHORED",
      claimStatus: "UNCLAIMED",
      disputeFlagOnChain: false,
      anchoredAt: { lte: holdCutoff },
      disputes: { none: { status: { in: ["OPEN", "UNDER_REVIEW"] } } },
      material: filters.material,
      organization: filters.centreCode || filters.county ? { code: filters.centreCode, county: filters.county } : undefined,
      weighedOn: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    },
    include: { organization: true },
    orderBy: filters.sort === "largest" ? { weightGrams: "desc" } : { createdAt: "asc" },
    take: 200,
  });

  const result: { receiptId: string; centre: { name: string; code: string; county: string }; material: string; weightKg: number; weighedOn: string; verified: true }[] = [];
  for (const r of receipts) {
    if (filters.minKg && r.weightGrams < filters.minKg * 1000) continue;
    const recordText = buildRecordText({ receiptId: r.receiptId, pickerCode: r.pickerCode, material: r.material, weightGrams: r.weightGrams, weighedOn: r.weighedOn, photoCid: r.photoCid, salt: r.salt });
    const currentHash = hashRecordText(recordText);
    if (currentHash !== r.dataHash) continue; // excluded: integrity mismatch
    result.push({
      receiptId: r.receiptId,
      centre: { name: r.organization.name, code: r.organization.code, county: r.organization.county ?? "" },
      material: r.material,
      weightKg: gramsToKgNumber(r.weightGrams),
      weighedOn: r.weighedOn,
      verified: true,
    });
  }
  return result;
}

interface ClaimRow {
  id: string;
  txHash: string;
  complianceYear: number;
  productLine: string | null;
  status: string;
  claimedAt: Date;
  receipt: { receiptId: string; material: string; weightGrams: number; organization: { name: string } };
}

function toClaimDto(c: ClaimRow) {
  return {
    id: c.id,
    receiptId: c.receipt.receiptId,
    material: c.receipt.material,
    weightKg: gramsToKgNumber(c.receipt.weightGrams),
    centre: c.receipt.organization.name,
    claimedAt: c.claimedAt.toISOString(),
    complianceYear: c.complianceYear,
    productLine: c.productLine,
    txHash: c.txHash,
    status: c.status as "CONFIRMED" | "STALE",
  };
}

export interface RecordClaimInput {
  receiptId: string;
  txHash: string;
  complianceYear: number;
  productLine?: string;
}

export async function recordClaim(user: SessionUser, input: RecordClaimInput) {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a brand.");
  const receipt = await prisma.receipt.findUnique({ where: { receiptId: input.receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");

  const result = await verifyTx(input.txHash, user.walletAddress, { name: "CreditClaimed", args: { receiptId: receipt.receiptId, brand: user.walletAddress } });
  if (result.status === "TIMEOUT") throw new AppError("CHAIN_UNAVAILABLE", "The transaction hasn't confirmed yet. Try again shortly.");
  if (result.status !== "CONFIRMED") throw new AppError("TX_MISMATCH", result.reason);

  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  const chainEpoch = state?.epoch ?? 1;

  const existing = await prisma.claim.findFirst({ where: { receiptRef: receipt.id, chainEpoch }, include: { receipt: { include: { organization: true } } } });
  if (existing) {
    const updated = await prisma.claim.update({
      where: { id: existing.id },
      data: { complianceYear: input.complianceYear, productLine: input.productLine },
      include: { receipt: { include: { organization: true } } },
    });
    return toClaimDto(updated);
  }

  const claim = await prisma.$transaction(async (tx) => {
    const created = await tx.claim.create({
      data: {
        receiptRef: receipt.id,
        brandOrgId: user.organizationId as string,
        claimedByAddress: user.walletAddress,
        txHash: input.txHash,
        blockNumber: result.status === "CONFIRMED" ? result.blockNumber : 0,
        chainEpoch,
        complianceYear: input.complianceYear,
        productLine: input.productLine,
        claimedAt: new Date(),
      },
      include: { receipt: { include: { organization: true } } },
    });
    await tx.receipt.update({ where: { id: receipt.id }, data: { claimStatus: "CLAIMED" } });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "CLAIM_RECORDED", entityType: "Receipt", entityId: receipt.id, summary: `Claimed by brand for compliance year ${input.complianceYear}.` });
    return created;
  });

  emitEvent({ name: "receipt.claimed", data: { receiptId: receipt.receiptId, organizationId: receipt.organizationId }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }, { kind: "role", role: "BRAND_OFFICER" }, { kind: "public" }] });
  return toClaimDto(claim);
}

export async function listClaims(user: SessionUser, filters: { year?: number; material?: string }) {
  const rows = await prisma.claim.findMany({
    where: {
      brandOrgId: user.role === "ADMIN" ? undefined : (user.organizationId as string),
      complianceYear: filters.year,
      receipt: filters.material ? { material: filters.material } : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: { receipt: { include: { organization: true } } },
    take: 500,
  });
  return rows.map(toClaimDto);
}

export async function getBrandSummary(user: SessionUser, year: number) {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a brand.");
  const [targets, claims] = await Promise.all([
    prisma.eprTarget.findMany({ where: { brandOrgId: user.organizationId, year } }),
    prisma.claim.findMany({ where: { brandOrgId: user.organizationId, complianceYear: year, status: "CONFIRMED" }, include: { receipt: { include: { organization: true } } }, orderBy: { claimedAt: "desc" } }),
  ]);
  const claimedByMaterial = new Map<string, number>();
  for (const c of claims) claimedByMaterial.set(c.receipt.material, (claimedByMaterial.get(c.receipt.material) ?? 0) + c.receipt.weightGrams);

  const targetRows = targets.map((t) => ({
    material: t.material,
    targetKg: gramsToKgNumber(t.targetGrams),
    claimedKg: gramsToKgNumber(claimedByMaterial.get(t.material) ?? 0),
  }));

  return {
    year,
    targets: targetRows,
    totalTargetKg: targetRows.reduce((s, t) => s + t.targetKg, 0),
    totalClaimedKg: targetRows.reduce((s, t) => s + t.claimedKg, 0),
    recentClaims: claims.slice(0, 20).map(toClaimDto),
  };
}
