import { prisma } from "../../db.js";
import { centsToKesNumber, gramsToKgNumber } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { nairobiDateString } from "../../lib/time.js";
import type { SessionUser } from "../../middleware/session.js";

export async function getCentreSummary(user: SessionUser, date: string) {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a buying centre.");
  const organizationId = user.organizationId;

  const todayReceipts = await prisma.receipt.findMany({ where: { organizationId, weighedOn: date, status: { not: "SUPERSEDED" } } });
  const kgToday = gramsToKgNumber(todayReceipts.reduce((s, r) => s + r.weightGrams, 0));
  const kesPaidToday = (
    await prisma.payout.aggregate({
      where: { receipt: { organizationId, weighedOn: date }, status: "PAID" },
      _sum: { amountCents: true },
    })
  )._sum.amountCents ?? 0;

  const openDisputes = await prisma.dispute.count({ where: { receipt: { organizationId }, status: { in: ["OPEN", "UNDER_REVIEW"] } } });

  const needsAttention: Array<{ kind: "DRAFT" | "ANCHOR_FAILED" | "PAYOUT_FAILED" | "DISPUTE_PENDING"; receiptId?: string; disputeId?: string; label: string }> = [];

  const staleCutoff = new Date(Date.now() - 2 * 3_600_000);
  const [staleDrafts, anchorFailed, failedPayouts, openDisputeRows] = await Promise.all([
    prisma.receipt.findMany({ where: { organizationId, status: "DRAFT", createdAt: { lte: staleCutoff } }, take: 10 }),
    prisma.receipt.findMany({ where: { organizationId, status: { in: ["ANCHOR_FAILED", "NEEDS_REANCHOR"] } }, take: 10 }),
    prisma.payout.findMany({ where: { receipt: { organizationId }, status: "FAILED" }, include: { receipt: true }, take: 10 }),
    prisma.dispute.findMany({ where: { receipt: { organizationId }, status: { in: ["OPEN", "UNDER_REVIEW"] } }, take: 10 }),
  ]);
  for (const r of staleDrafts) needsAttention.push({ kind: "DRAFT", receiptId: r.receiptId, label: `Draft not yet anchored: ${r.receiptId}` });
  for (const r of anchorFailed) needsAttention.push({ kind: "ANCHOR_FAILED", receiptId: r.receiptId, label: `Anchoring failed: ${r.receiptId}` });
  for (const p of failedPayouts) needsAttention.push({ kind: "PAYOUT_FAILED", receiptId: p.receipt.receiptId, label: `Payout failed: ${p.receipt.receiptId}` });
  for (const d of openDisputeRows) needsAttention.push({ kind: "DISPUTE_PENDING", disputeId: d.id, label: `Dispute ${d.reference} needs review` });

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const recent = await prisma.receipt.findMany({ where: { organizationId, createdAt: { gte: fourteenDaysAgo }, status: { not: "SUPERSEDED" } } });
  const byDay = new Map<string, Record<string, number>>();
  for (const r of recent) {
    const day = nairobiDateString(r.createdAt);
    if (!byDay.has(day)) byDay.set(day, {});
    const dayMap = byDay.get(day) as Record<string, number>;
    dayMap[r.material] = (dayMap[r.material] ?? 0) + gramsToKgNumber(r.weightGrams);
  }
  const kgByMaterialLast14Days = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, byMaterial]) => ({ date: day, ...byMaterial }));

  return {
    kgToday,
    weighInsToday: todayReceipts.length,
    kesPaidToday: centsToKesNumber(kesPaidToday),
    openDisputes,
    needsAttention,
    kgByMaterialLast14Days,
  };
}
