import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { centsToKesNumber } from "../../lib/dto.js";
import { emitEvent } from "../../lib/events.js";
import { logger } from "../../lib/logger.js";
import { nairobiToday } from "../../lib/time.js";
import { roundToWholeShillings } from "../../lib/money.js";
import { payoutProvider } from "../../providers/payments/index.js";
import { sendSms } from "../../providers/sms/service.js";

const MPESA_MIN_KES = 10; // Daraja sandbox's practical floor; below this we accumulate.

export interface CreatePayoutInput {
  receiptRef: string;
  pickerId: string;
  phone: string;
  amountCents: number;
  kind: "PURCHASE" | "TOP_UP";
}

/** Creates a payout row (PENDING). The dispatcher job sends it shortly after. */
export async function createPayout(input: CreatePayoutInput): Promise<void> {
  if (input.amountCents <= 0) return; // nothing to pay (e.g. a top-up for a smaller re-weigh)

  const { amountKes } = roundToWholeShillings(input.amountCents);
  if (amountKes < MPESA_MIN_KES) {
    await prisma.payout.create({
      data: {
        receiptRef: input.receiptRef,
        pickerId: input.pickerId,
        kind: input.kind,
        amountCents: input.amountCents,
        phone: input.phone,
        provider: payoutProvider.name,
        status: "PENDING",
        belowMinimum: true,
        originatorConversationId: `TT-pending-${input.receiptRef}-1`,
        resultDesc: "Below minimum; will be paid with the next weigh-in",
      },
    });
    return;
  }

  const payout = await prisma.payout.create({
    data: {
      receiptRef: input.receiptRef,
      pickerId: input.pickerId,
      kind: input.kind,
      amountCents: input.amountCents,
      phone: input.phone,
      provider: payoutProvider.name,
      status: "PENDING",
      originatorConversationId: `pending`,
    },
  });
  await prisma.payout.update({ where: { id: payout.id }, data: { originatorConversationId: `TT-${payout.id}-1` } });

  await writeAudit(prisma, {
    actorType: "SYSTEM",
    action: "PAYOUT_CREATED",
    entityType: "Payout",
    entityId: payout.id,
    summary: `${input.kind} payout of KES ${amountKes} created for receipt ${input.receiptRef}.`,
  });
}

/** Sends every PENDING payout that isn't below the provider minimum. Called by the dispatcher job. */
export async function dispatchPendingPayouts(): Promise<number> {
  const pending = await prisma.payout.findMany({
    where: { status: "PENDING", belowMinimum: false },
    take: 20,
  });

  for (const payout of pending) {
    const { amountKes } = roundToWholeShillings(payout.amountCents);
    const result = await payoutProvider.send({
      payoutId: payout.id,
      originatorConversationId: payout.originatorConversationId,
      phone: payout.phone,
      amountKes,
      remarks: `TakaTrace ${payout.receiptRef}`,
    });

    if (!result.accepted) {
      await prisma.payout.update({ where: { id: payout.id }, data: { status: "FAILED", resultDesc: result.error } });
      await writeAudit(prisma, {
        actorType: "SYSTEM",
        action: "PAYOUT_FAILED",
        entityType: "Payout",
        entityId: payout.id,
        summary: `Payout rejected: ${result.error ?? "unknown error"}`,
      });
      continue;
    }

    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "SENT", sentAt: new Date(), conversationId: result.conversationId },
    });
    await writeAudit(prisma, {
      actorType: "SYSTEM",
      action: "PAYOUT_SENT",
      entityType: "Payout",
      entityId: payout.id,
      summary: `Payout of KES ${amountKes} sent to M-Pesa.`,
    });

    if (payoutProvider.name === "MOCK") simulateMockResult(payout.id, payout.phone, amountKes);
  }
  return pending.length;
}

function simulateMockResult(payoutId: string, phone: string, amountKes: number): void {
  const failPhones = config.MOCK_PAYOUT_FAIL_PHONES.split(",").map((p) => p.trim()).filter(Boolean);
  setTimeout(() => {
    const shouldFail = failPhones.includes(phone);
    applyResult({
      originatorConversationId: undefined,
      payoutId,
      success: !shouldFail,
      transactionId: shouldFail ? undefined : `MOCK${Date.now().toString(36).toUpperCase()}`,
      resultCode: shouldFail ? "1" : "0",
      resultDesc: shouldFail ? "The initiator information is invalid" : "Success",
    }).catch((err) => logger.error({ err, payoutId }, "failed to apply mock payout result"));
  }, config.MOCK_PAYOUT_DELAY_MS);
  void amountKes;
}

export interface ApplyResultInput {
  /** Either identifier is accepted; webhooks supply originatorConversationId, mock supplies payoutId directly. */
  originatorConversationId?: string;
  payoutId?: string;
  success: boolean;
  transactionId?: string;
  resultCode?: string;
  resultDesc?: string;
}

/** Applies a provider result (real webhook or mock simulation) to the matching payout, exactly once. */
export async function applyResult(input: ApplyResultInput): Promise<void> {
  const payout = input.payoutId
    ? await prisma.payout.findUnique({ where: { id: input.payoutId } })
    : await prisma.payout.findUnique({ where: { originatorConversationId: input.originatorConversationId } });
  if (!payout || payout.status !== "SENT") return; // already resolved, or unknown id — logged by the caller

  if (input.success) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "PAID", paidAt: new Date(), mpesaTransactionId: input.transactionId, resultCode: input.resultCode, resultDesc: input.resultDesc },
    });
    const { amountKes } = roundToWholeShillings(payout.amountCents);
    const [picker, receipt] = await Promise.all([
      prisma.picker.findUnique({ where: { id: payout.pickerId } }),
      prisma.receipt.findUnique({ where: { id: payout.receiptRef } }),
    ]);
    await sendSms({
      phone: payout.phone,
      template: "PAYOUT_PAID",
      vars: { amount: amountKes, receiptId: receipt?.receiptId ?? payout.receiptRef, mpesaRef: input.transactionId ?? "-" },
      pickerId: payout.pickerId,
      receiptRef: payout.receiptRef,
      lang: (picker?.language as "en" | "sw") ?? "en",
    });
    await writeAudit(prisma, { actorType: "WEBHOOK", action: "PAYOUT_PAID", entityType: "Payout", entityId: payout.id, summary: `Paid KES ${amountKes}.` });
  } else {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "FAILED", resultCode: input.resultCode, resultDesc: input.resultDesc },
    });
    await writeAudit(prisma, {
      actorType: "WEBHOOK",
      action: "PAYOUT_FAILED",
      entityType: "Payout",
      entityId: payout.id,
      summary: `Payout failed: ${input.resultDesc ?? "unknown"}.`,
    });
  }
  emitEvent({ name: "payout.updated", data: { payoutId: payout.id, status: input.success ? "PAID" : "FAILED" }, audiences: [{ kind: "role", role: "ADMIN" }] });
}

/** A payout stuck SENT for 15+ minutes with no callback becomes UNKNOWN for manual resolution. */
export async function markStaleSentAsUnknown(): Promise<number> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const result = await prisma.payout.updateMany({ where: { status: "SENT", sentAt: { lte: cutoff } }, data: { status: "UNKNOWN" } });
  if (result.count > 0) {
    logger.warn({ count: result.count }, "payouts moved to UNKNOWN after 15 minutes with no result");
  }
  return result.count;
}

/** Retry a FAILED payout: new attempt number and a new idempotency id, never SENT/UNKNOWN. */
export async function retryPayout(payoutId: string): Promise<void> {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "FAILED") {
    throw new AppError("CONFLICT", "Only a FAILED payout can be retried.");
  }
  const attempt = payout.attempt + 1;
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "PENDING", attempt, originatorConversationId: `TT-${payoutId}-${attempt}`, resultCode: null, resultDesc: null },
  });
  await writeAudit(prisma, { actorType: "USER", action: "PAYOUT_RETRIED", entityType: "Payout", entityId: payoutId, summary: `Retry attempt ${attempt}.` });
}

export interface ListPayoutsFilters {
  status?: string;
  from?: string;
  to?: string;
  organizationId?: string;
}

export async function listPayouts(filters: ListPayoutsFilters) {
  const rows = await prisma.payout.findMany({
    where: {
      status: filters.status,
      createdAt: filters.from || filters.to ? { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined } : undefined,
      receipt: filters.organizationId ? { organizationId: filters.organizationId } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { picker: true, receipt: true },
  });

  const today = nairobiToday();
  const items = rows.map((p) => ({
    id: p.id,
    receiptId: p.receipt.receiptId,
    pickerCode: p.picker.code,
    amountKes: centsToKesNumber(p.amountCents),
    provider: (p.provider === "MOCK" ? "MOCK" : "MPESA_SANDBOX") as "MOCK" | "MPESA_SANDBOX",
    status: p.status as "PENDING" | "SENT" | "PAID" | "FAILED" | "UNKNOWN",
    mpesaTransactionId: p.mpesaTransactionId,
    failureReason: p.status === "FAILED" ? p.resultDesc : null,
    updatedAt: p.updatedAt.toISOString(),
  }));

  const paidTodayCents = rows.filter((p) => p.status === "PAID" && p.paidAt && nairobiToday(p.paidAt) === today).reduce((s, p) => s + p.amountCents, 0);
  const pending = rows.filter((p) => p.status === "PENDING" || p.status === "SENT" || p.status === "UNKNOWN").length;
  const failed = rows.filter((p) => p.status === "FAILED").length;

  return { items, totals: { paidToday: centsToKesNumber(paidTodayCents), pending, failed } };
}

/** Admin manually resolves a payout stuck UNKNOWN after checking the M-Pesa portal. */
export async function resolveUnknownPayout(payoutId: string, outcome: "PAID" | "FAILED", mpesaTransactionId: string | undefined, note: string): Promise<void> {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "UNKNOWN") {
    throw new AppError("CONFLICT", "Only an UNKNOWN payout can be resolved this way.");
  }
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: outcome, paidAt: outcome === "PAID" ? new Date() : null, mpesaTransactionId, resultDesc: note },
  });
  if (outcome === "PAID") {
    const { amountKes } = roundToWholeShillings(payout.amountCents);
    const [picker, receipt] = await Promise.all([
      prisma.picker.findUnique({ where: { id: payout.pickerId } }),
      prisma.receipt.findUnique({ where: { id: payout.receiptRef } }),
    ]);
    await sendSms({
      phone: payout.phone,
      template: "PAYOUT_PAID",
      vars: { amount: amountKes, receiptId: receipt?.receiptId ?? payout.receiptRef, mpesaRef: mpesaTransactionId ?? "-" },
      pickerId: payout.pickerId,
      receiptRef: payout.receiptRef,
      lang: (picker?.language as "en" | "sw") ?? "en",
    });
  }
  await writeAudit(prisma, { actorType: "USER", action: outcome === "PAID" ? "PAYOUT_PAID" : "PAYOUT_FAILED", entityType: "Payout", entityId: payoutId, summary: note });
}
