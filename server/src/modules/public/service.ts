import { chainStatus } from "../../chain/provider.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { AppError } from "../../lib/errors.js";
import { MATERIALS } from "../../lib/record.js";
import { startOfNairobiMonth } from "../../lib/time.js";
import { centsToKesNumber, gramsToKgNumber } from "../../lib/dto.js";

let statsCache: { data: unknown; at: number } | null = null;
const STATS_TTL_MS = 30_000;

export function clearStatsCache(): void {
  statsCache = null;
}

export async function getPublicStats() {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.data;

  const [anchored, claimed, sinceMonth, centres, brands] = await Promise.all([
    prisma.receipt.findMany({ where: { status: "ANCHORED" } }),
    prisma.receipt.count({ where: { status: "ANCHORED", claimStatus: "CLAIMED" } }),
    startOfNairobiMonthPayouts(),
    prisma.organization.count({ where: { type: "CENTRE", status: "ACTIVE" } }),
    prisma.organization.count({ where: { type: "BRAND", status: "ACTIVE" } }),
  ]);
  const notSuperseded = await prisma.receipt.count({ where: { status: { not: "SUPERSEDED" } } });
  const kgAnchored = anchored.reduce((s, r) => s + r.weightGrams, 0) / 1000;
  const kgClaimedReceipts = anchored.filter((r) => r.claimStatus === "CLAIMED");
  const kgClaimed = kgClaimedReceipts.reduce((s, r) => s + r.weightGrams, 0) / 1000;

  const data = {
    kgAnchored,
    receiptsRecorded: notSuperseded,
    receiptsAnchored: anchored.length,
    receiptsClaimed: claimed,
    kgClaimed,
    doubleClaims: 0,
    pickersPaidThisMonth: sinceMonth.pickerCount,
    kesPaidThisMonth: centsToKesNumber(sinceMonth.cents),
    centres,
    brands,
    updatedAt: new Date().toISOString(),
  };
  statsCache = { data, at: Date.now() };
  return data;
}

async function startOfNairobiMonthPayouts() {
  const since = startOfNairobiMonth();
  const paid = await prisma.payout.findMany({ where: { status: "PAID", paidAt: { gte: since } } });
  return { pickerCount: new Set(paid.map((p) => p.pickerId)).size, cents: paid.reduce((s, p) => s + p.amountCents, 0) };
}

export async function getMaterialsBreakdown() {
  const result = [];
  for (const material of MATERIALS) {
    const receipts = await prisma.receipt.findMany({ where: { material, status: "ANCHORED" } });
    const centres = new Set(receipts.map((r) => r.organizationId)).size;
    result.push({ material, label: material, kgAnchored: gramsToKgNumber(receipts.reduce((s, r) => s + r.weightGrams, 0)), centres, receipts: receipts.length });
  }
  return result;
}

export async function getPartners() {
  const orgs = await prisma.organization.findMany({ where: { status: "ACTIVE", type: "BRAND" } });
  return orgs.map((o) => ({ name: o.name, type: "BRAND" as const }));
}

export async function getPublicActivity() {
  const [anchored, claims] = await Promise.all([
    prisma.receipt.findMany({ where: { status: "ANCHORED" }, orderBy: { anchoredAt: "desc" }, take: 10, include: { organization: true } }),
    prisma.claim.findMany({ where: { status: "CONFIRMED" }, orderBy: { claimedAt: "desc" }, take: 10, include: { receipt: { include: { organization: true } }, brandOrg: true } }),
  ]);
  return {
    anchored: anchored.map((r) => ({
      receiptId: r.receiptId,
      material: r.material,
      weightKg: gramsToKgNumber(r.weightGrams),
      centre: r.organization.name,
      time: (r.anchoredAt ?? r.createdAt).toISOString(),
    })),
    claims: claims.map((c) => ({
      receiptId: c.receipt.receiptId,
      material: c.receipt.material,
      weightKg: gramsToKgNumber(c.receipt.weightGrams),
      centre: c.receipt.organization.name,
      time: c.claimedAt.toISOString(),
      brand: c.brandOrg.name,
    })),
  };
}

export async function getContractInfoPublic() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return {
    address: chainStatus.contractAddress ?? "",
    chainId: config.CHAIN_ID,
    network: config.CHAIN_ID === 31337 ? "Hardhat local" : "Sepolia",
    explorerUrl: "",
    adminAddress: admin?.walletAddress ?? "",
    deployedAt: "",
  };
}

export async function subscribeNewsletter(email: string): Promise<void> {
  await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: { unsubscribedAt: null } });
}

export interface ContactInput {
  name: string;
  email: string;
  organization?: string;
  topic: "GENERAL" | "REPORT_RECEIPT" | "JOIN_CENTRE" | "JOIN_BRAND";
  message: string;
  receiptId?: string;
  ip?: string;
}

export async function submitContact(input: ContactInput): Promise<void> {
  if (input.receiptId) {
    const receipt = await prisma.receipt.findUnique({ where: { receiptId: input.receiptId } });
    if (!receipt) throw new AppError("VALIDATION", "That receipt ID wasn't found.", { receiptId: "Not found" });
  }
  await prisma.contactMessage.create({ data: { name: input.name, email: input.email, organization: input.organization, topic: input.topic, message: input.message, receiptId: input.receiptId, ip: input.ip } });
}
