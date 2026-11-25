import { prisma } from "../../db.js";
import { nairobiMonthLabel, startOfNairobiMonth } from "../../lib/time.js";
import { openDispute, type DisputeReason } from "../../modules/disputes/service.js";
import { sendSms } from "./service.js";

export interface InboundSmsInput {
  from: string;
  text: string;
  providerMessageId?: string;
}

/** Serves both the real Africa's Talking inbound webhook and the demo phone simulator. */
export async function handleInboundSms(input: InboundSmsInput): Promise<void> {
  const phone = input.from.startsWith("+") ? input.from : `+${input.from}`;
  const text = input.text.trim();

  const picker = await prisma.picker.findUnique({ where: { phone } });

  await prisma.smsMessage.create({
    data: { direction: "INBOUND", phone, pickerId: picker?.id, body: text, provider: "MOCK", status: "RECEIVED", providerMessageId: input.providerMessageId },
  });

  if (!picker) {
    await sendSms({ phone, template: "NOT_REGISTERED", vars: {}, bypassOptOut: true });
    return;
  }

  const lang = (picker.language as "en" | "sw") ?? "en";
  const upper = text.toUpperCase();
  const normalized = upper.replace(/\s+/g, " ");

  if (["HELP", "MSAADA"].includes(normalized)) {
    await sendSms({ phone, pickerId: picker.id, template: "HELP", lang, vars: {}, bypassOptOut: true });
    return;
  }

  if (["BAL", "SALIO", "BALANCE"].includes(normalized)) {
    await replyBalance(picker.id, picker.code, phone, lang);
    return;
  }

  if (["STOP", "ACHA"].includes(normalized)) {
    await prisma.picker.update({ where: { id: picker.id }, data: { smsOptOut: true } });
    await sendSms({ phone, pickerId: picker.id, template: "STOP_CONFIRMED", lang, vars: {}, bypassOptOut: true });
    return;
  }
  if (["START", "ANZA"].includes(normalized)) {
    await prisma.picker.update({ where: { id: picker.id }, data: { smsOptOut: false } });
    return;
  }

  if (normalized === "SW") {
    await prisma.picker.update({ where: { id: picker.id }, data: { language: "sw" } });
    return;
  }
  if (normalized === "EN") {
    await prisma.picker.update({ where: { id: picker.id }, data: { language: "en" } });
    return;
  }

  const disputeMatch = normalized.match(/^(DISPUTE|MALALAMIKO)\s+(\S+)\s*(.*)$/);
  if (disputeMatch) {
    const receiptId = disputeMatch[2];
    const message = disputeMatch[3] ?? "";
    const reason = classifyReason(message);
    const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
    if (!receipt || receipt.pickerId !== picker.id) {
      await sendSms({ phone, pickerId: picker.id, template: "UNKNOWN_COMMAND", lang, vars: {}, bypassOptOut: true });
      return;
    }
    try {
      await openDispute({ receiptId, openedBy: "PICKER_SMS", reason, message, pickerId: picker.id });
    } catch {
      await sendSms({ phone, pickerId: picker.id, template: "UNKNOWN_COMMAND", lang, vars: {}, bypassOptOut: true });
    }
    return;
  }

  await sendSms({ phone, pickerId: picker.id, template: "UNKNOWN_COMMAND", lang, vars: {}, bypassOptOut: true });
}

function classifyReason(message: string): DisputeReason {
  const m = message.toLowerCase();
  if (/(weight|uzito|kg)/.test(m)) return "WRONG_WEIGHT";
  if (/(material|aina)/.test(m)) return "WRONG_MATERIAL";
  if (/(paid|pay|malipo)/.test(m)) return "NOT_PAID";
  return "OTHER";
}

async function replyBalance(pickerId: string, code: string, phone: string, lang: "en" | "sw"): Promise<void> {
  const since = startOfNairobiMonth();
  const receipts = await prisma.receipt.findMany({ where: { pickerId, createdAt: { gte: since }, status: { not: "SUPERSEDED" } } });
  const kg = receipts.reduce((sum, r) => sum + r.weightGrams, 0) / 1000;
  const payouts = await prisma.payout.findMany({ where: { pickerId, createdAt: { gte: since } } });
  const paidCents = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountCents, 0);
  const pendingCents = payouts.filter((p) => p.status !== "PAID" && p.status !== "FAILED").reduce((sum, p) => sum + p.amountCents, 0);
  await sendSms({
    phone,
    pickerId,
    template: "BALANCE",
    lang,
    bypassOptOut: true,
    vars: { code, month: nairobiMonthLabel(), count: receipts.length, kg: kg.toFixed(1), paid: (paidCents / 100).toFixed(0), pending: (pendingCents / 100).toFixed(0) },
  });
}
