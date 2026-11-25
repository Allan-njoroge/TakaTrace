import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { emitEvent } from "../../lib/events.js";
import { logger } from "../../lib/logger.js";
import { atSms } from "./africastalking.js";
import { mockSms } from "./mock.js";
import { renderSms, type SmsTemplateName } from "./templates.js";

const provider = config.SMS_PROVIDER === "africastalking" ? atSms : mockSms;

export interface SendSmsInput {
  phone: string;
  template: SmsTemplateName;
  vars: Record<string, string | number>;
  pickerId?: string;
  receiptRef?: string;
  lang?: "en" | "sw";
  /** Replies to inbound commands bypass the opt-out check. */
  bypassOptOut?: boolean;
}

export async function sendSms(input: SendSmsInput): Promise<void> {
  if (!input.bypassOptOut && input.pickerId) {
    const picker = await prisma.picker.findUnique({ where: { id: input.pickerId } });
    if (picker?.smsOptOut) return;
  }

  const lang = input.lang ?? "en";
  const body = renderSms(input.template, lang, { ussd: config.USSD_CODE, ...input.vars });

  const message = await prisma.smsMessage.create({
    data: {
      direction: "OUTBOUND",
      phone: input.phone,
      pickerId: input.pickerId,
      receiptRef: input.receiptRef,
      template: input.template,
      body,
      provider: provider.name,
      status: "QUEUED",
      attempts: 1,
    },
  });

  await dispatch(message.id, input.phone, body);
}

async function dispatch(messageId: string, phone: string, body: string): Promise<void> {
  try {
    const result = await provider.send(phone, body);
    await prisma.smsMessage.update({
      where: { id: messageId },
      data: {
        status: result.status,
        providerMessageId: result.providerMessageId,
        cost: result.cost,
        failureReason: result.failureReason,
        nextAttemptAt: result.status === "FAILED" ? new Date(Date.now() + 60_000) : null,
      },
    });
    emitEvent({ name: "sms.sent", data: { messageId, phone, status: result.status }, audiences: [{ kind: "role", role: "ADMIN" }, { kind: "phone", phone }] });

    if (result.status === "SENT" && provider.name === "MOCK") {
      setTimeout(() => {
        prisma.smsMessage
          .update({ where: { id: messageId }, data: { status: "DELIVERED" } })
          .then(() => emitEvent({ name: "sms.status", data: { messageId, status: "DELIVERED" }, audiences: [{ kind: "role", role: "ADMIN" }, { kind: "phone", phone }] }))
          .catch((err) => logger.error({ err }, "failed to mark mock SMS delivered"));
      }, 1000);
    }
  } catch (err) {
    logger.error({ err, messageId }, "SMS provider send failed");
    await prisma.smsMessage.update({
      where: { id: messageId },
      data: { status: "FAILED", failureReason: "Provider error", nextAttemptAt: new Date(Date.now() + 60_000) },
    });
  }
}

/** Retries QUEUED/FAILED messages whose backoff has elapsed. Called by the SMS retry job. */
export async function retryDueSms(): Promise<number> {
  const due = await prisma.smsMessage.findMany({
    where: { direction: "OUTBOUND", status: "FAILED", attempts: { lt: 3 }, nextAttemptAt: { lte: new Date() } },
    take: 20,
  });
  for (const m of due) {
    await prisma.smsMessage.update({ where: { id: m.id }, data: { attempts: { increment: 1 } } });
    await dispatch(m.id, m.phone, m.body);
  }
  return due.length;
}
