import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import { nextDisputeRef } from "../../lib/ids.js";
import { hoursSince } from "../../lib/time.js";
import { config } from "../../config.js";
import { createCorrectionReceipt, getReceiptDetail, type CreateReceiptResult } from "../receipts/service.js";
import { dispatchPendingPayouts, retryPayout } from "../payouts/service.js";
import { sendSms } from "../../providers/sms/service.js";
import type { SessionUser } from "../../middleware/session.js";

interface DisputeRow {
  id: string;
  reference: string;
  receiptRef: string;
  openedBy: string;
  reason: string;
  message: string | null;
  status: string;
  createdAt: Date;
}

function toDisputeDto(d: DisputeRow, receiptId: string) {
  return {
    // The frontend's Dispute type has no separate "reference" field — `id` doubles as
    // the route param and the human-readable label, so it's the reference (D-0007),
    // not the internal cuid. Routes below look disputes up by `reference` to match.
    id: d.reference,
    receiptId,
    openedBy: d.openedBy as "PICKER_USSD" | "PICKER_SMS" | "CENTRE" | "ADMIN",
    reason: d.reason,
    message: d.message ?? "",
    status: d.status as "OPEN" | "UNDER_REVIEW" | "UPHELD" | "REJECTED",
    openedAt: d.createdAt.toISOString(),
    ageHours: Math.round(hoursSince(d.createdAt) * 10) / 10,
  };
}

export type DisputeReason = "WRONG_WEIGHT" | "WRONG_MATERIAL" | "NOT_PAID" | "OTHER";
export type OpenedBy = "PICKER_USSD" | "PICKER_SMS" | "CENTRE" | "ADMIN";

export interface OpenDisputeInput {
  receiptId: string;
  openedBy: OpenedBy;
  reason: DisputeReason;
  message?: string;
  pickerId?: string;
}

/** Opens a dispute, or appends to the existing open one for the same receipt (section 18.1). */
export async function openDispute(input: OpenDisputeInput): Promise<{ reference: string }> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId: input.receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");

  const existing = await prisma.dispute.findFirst({ where: { receiptRef: receipt.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  if (existing) {
    await prisma.dispute.update({
      where: { id: existing.id },
      data: { message: input.message ? `${existing.message ?? ""}\n${input.message}`.trim() : existing.message },
    });
    return { reference: existing.reference };
  }

  if (input.openedBy.startsWith("PICKER")) {
    if (receipt.status !== "ANCHORED") throw new AppError("CONFLICT", "This receipt isn't anchored yet.");
    if (receipt.claimStatus === "CLAIMED") {
      // Still allowed per spec (claim stands, resolution notes it), so no throw here.
    }
    const anchoredAt = receipt.anchoredAt;
    if (!anchoredAt || hoursSince(anchoredAt) > config.DISPUTE_WINDOW_HOURS) {
      throw new AppError("CONFLICT", `This receipt is older than the ${config.DISPUTE_WINDOW_HOURS}-hour dispute window.`);
    }
    if (input.pickerId && receipt.pickerId !== input.pickerId) throw new AppError("FORBIDDEN", "This receipt doesn't belong to you.");
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const reference = await nextDisputeRef(tx);
    const row = await tx.dispute.create({
      data: {
        reference,
        receiptRef: receipt.id,
        pickerId: receipt.pickerId,
        openedBy: input.openedBy,
        reason: input.reason,
        message: input.message,
        status: "OPEN",
      },
    });
    await writeAudit(tx, {
      actorType: input.openedBy === "CENTRE" || input.openedBy === "ADMIN" ? "USER" : "PICKER",
      action: "DISPUTE_OPENED",
      entityType: "Dispute",
      entityId: row.id,
      summary: `Dispute ${reference} opened on ${receipt.receiptId} (${input.reason}).`,
    });
    return row;
  });

  const picker = await prisma.picker.findUnique({ where: { id: receipt.pickerId } });
  if (picker) {
    await sendSms({
      phone: picker.phone,
      pickerId: picker.id,
      receiptRef: receipt.id,
      template: "DISPUTE_RECEIVED",
      lang: picker.language as "en" | "sw",
      vars: { receiptId: receipt.receiptId, disputeRef: dispute.reference },
    });
  }
  emitEvent({ name: "dispute.opened", data: { receiptId: receipt.receiptId, reference: dispute.reference }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });

  return { reference: dispute.reference };
}

export async function reviewDispute(user: SessionUser, reference: string): Promise<void> {
  const dispute = await requireDisputeForUser(user, reference);
  if (dispute.status !== "OPEN") throw new AppError("CONFLICT", "Only an open dispute can move to review.");
  await prisma.dispute.update({ where: { id: dispute.id }, data: { status: "UNDER_REVIEW" } });
  emitEvent({ name: "dispute.updated", data: { disputeId: dispute.reference, status: "UNDER_REVIEW" }, audiences: [{ kind: "role", role: "ADMIN" }] });
}

export interface ResolveDisputeInput {
  outcome: "REJECTED" | "UPHELD";
  note: string;
  correctedMaterial?: string;
  correctedWeightKg?: number;
  idempotencyKey?: string;
}

export interface ResolveDisputeResult {
  status: string;
  correction?: CreateReceiptResult;
}

export async function resolveDispute(user: SessionUser, reference: string, input: ResolveDisputeInput): Promise<ResolveDisputeResult> {
  const dispute = await requireDisputeForUser(user, reference);
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new AppError("CONFLICT", "This dispute was already resolved.");
  }
  const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: dispute.receiptRef } });
  const picker = await prisma.picker.findUnique({ where: { id: dispute.pickerId ?? receipt.pickerId } });

  if (input.outcome === "REJECTED") {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: "REJECTED", decisionNote: input.note, decidedByUserId: user.id, decidedAt: new Date() },
    });
    await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "DISPUTE_RESOLVED", entityType: "Dispute", entityId: dispute.id, summary: `Rejected: ${input.note}` });
    if (picker) {
      await sendSms({
        phone: picker.phone,
        pickerId: picker.id,
        receiptRef: receipt.id,
        template: "DISPUTE_REJECTED",
        lang: picker.language as "en" | "sw",
        vars: { disputeRef: dispute.reference, receiptId: receipt.receiptId, reason: input.note },
      });
    }
    emitEvent({ name: "dispute.updated", data: { disputeId: dispute.reference, status: "REJECTED" }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });
    return { status: "REJECTED" };
  }

  // UPHELD
  if (input.correctedMaterial === undefined || input.correctedWeightKg === undefined) {
    // "Not paid" case: weight was right, payment is missing. Retry or create the payout.
    const failedPayout = await prisma.payout.findFirst({ where: { receiptRef: receipt.id, status: "FAILED" }, orderBy: { createdAt: "desc" } });
    if (failedPayout) await retryPayout(failedPayout.id);
    else await dispatchPendingPayouts();
    await prisma.dispute.update({ where: { id: dispute.id }, data: { status: "UPHELD", decisionNote: input.note, decidedByUserId: user.id, decidedAt: new Date() } });
    await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "DISPUTE_RESOLVED", entityType: "Dispute", entityId: dispute.id, summary: `Upheld (payment issue): ${input.note}` });
    emitEvent({ name: "dispute.updated", data: { disputeId: dispute.reference, status: "UPHELD" }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });
    return { status: "UPHELD" };
  }

  const idempotencyKey = input.idempotencyKey ?? `dispute-${dispute.id}`;
  const correctionResult = await createCorrectionReceipt(user, receipt.receiptId, idempotencyKey, {
    material: input.correctedMaterial,
    weightKg: String(input.correctedWeightKg),
  });
  const correctionRow = await prisma.receipt.findUniqueOrThrow({ where: { receiptId: correctionResult.receiptId } });

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: { status: "UPHELD", decisionNote: input.note, decidedByUserId: user.id, decidedAt: new Date(), correctionRef: correctionRow.id },
    });
    await tx.receipt.update({ where: { id: receipt.id }, data: { status: "SUPERSEDED" } });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "DISPUTE_RESOLVED", entityType: "Dispute", entityId: dispute.id, summary: `Upheld with correction ${correctionRow.receiptId}: ${input.note}` });
  });
  emitEvent({ name: "dispute.updated", data: { disputeId: dispute.reference, status: "UPHELD", correctionReceiptId: correctionRow.receiptId }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });

  return { status: "UPHELD", correction: correctionResult };
}

export async function listDisputes(user: SessionUser, status?: string) {
  const rows = await prisma.dispute.findMany({
    where: { status, receipt: user.role === "ADMIN" ? undefined : { organizationId: user.organizationId as string } },
    orderBy: { createdAt: "desc" },
    include: { receipt: true },
    take: 200,
  });
  return rows.map((d) => toDisputeDto(d, d.receipt.receiptId));
}

export async function getDisputeDetail(user: SessionUser, reference: string) {
  const dispute = await requireDisputeForUser(user, reference);
  const receipt = await getReceiptDetail(user, dispute.receipt.receiptId);
  return { ...toDisputeDto(dispute, dispute.receipt.receiptId), receipt };
}

async function requireDisputeForUser(user: SessionUser, reference: string) {
  const dispute = await prisma.dispute.findUnique({ where: { reference }, include: { receipt: true } });
  if (!dispute) throw new AppError("NOT_FOUND", "Dispute not found.");
  if (user.role !== "ADMIN" && dispute.receipt.organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");
  return dispute;
}
