import { Router } from "express";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { safeEqual } from "../../lib/crypto.js";
import { maskPhone } from "../../lib/phone.js";
import { webhookRateLimit } from "../../middleware/rateLimits.js";
import { applyResult } from "../payouts/service.js";
import { handleInboundSms } from "../../providers/sms/commands.js";
import { handleUssdRequest } from "../../providers/ussd/menu.js";

export const webhooksRouter = Router();
webhooksRouter.use(webhookRateLimit);

function checkToken(token: string): boolean {
  return safeEqual(token, config.WEBHOOK_TOKEN);
}

async function logWebhook(source: string, httpStatus: number, payload: Record<string, unknown>, error?: string): Promise<void> {
  const masked = { ...payload };
  if (typeof masked.from === "string") masked.from = maskPhone(masked.from.startsWith("+") ? masked.from : `+${masked.from}`);
  if (typeof masked.phoneNumber === "string") masked.phoneNumber = maskPhone(masked.phoneNumber.startsWith("+") ? masked.phoneNumber : `+${masked.phoneNumber}`);
  await prisma.webhookCall.create({ data: { source, httpStatus, payload: JSON.stringify(masked), error } });
}

webhooksRouter.post("/sms/inbound/:token", async (req, res) => {
  if (!checkToken((req.params.token as string))) return res.status(404).end();
  res.status(200).end();
  const { from, text, id } = req.body as { from: string; text: string; id?: string };
  await logWebhook("AT_SMS_INBOUND", 200, req.body);
  await handleInboundSms({ from, text, providerMessageId: id }).catch((err) => logWebhook("AT_SMS_INBOUND", 500, req.body, String(err)));
});

webhooksRouter.post("/sms/delivery/:token", async (req, res) => {
  if (!checkToken((req.params.token as string))) return res.status(404).end();
  res.status(200).end();
  const { id, status, failureReason } = req.body as { id: string; status: string; failureReason?: string };
  await logWebhook("AT_SMS_DELIVERY", 200, req.body);
  const mapped = status === "Success" ? "DELIVERED" : status === "Failed" || status === "Rejected" ? "FAILED" : null;
  if (mapped) {
    await prisma.smsMessage.updateMany({ where: { providerMessageId: id }, data: { status: mapped, failureReason: mapped === "FAILED" ? failureReason : null } });
  }
});

webhooksRouter.post("/ussd/:token", async (req, res) => {
  if (!checkToken((req.params.token as string))) return res.status(404).end();
  const { sessionId, serviceCode, phoneNumber, text } = req.body as { sessionId: string; serviceCode: string; phoneNumber: string; text: string };
  await logWebhook("AT_USSD", 200, req.body);
  const reply = await handleUssdRequest({ sessionId, serviceCode, phoneNumber, text });
  res.type("text/plain").send(reply);
});

webhooksRouter.post("/mpesa/b2c/result/:token", async (req, res) => {
  if (!checkToken((req.params.token as string))) return res.status(404).end();
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  const body = req.body as { Result?: { ResultCode: number; ResultDesc: string; OriginatorConversationID: string; TransactionID?: string } };
  await logWebhook("MPESA_RESULT", 200, req.body);
  const result = body.Result;
  if (!result) return;
  await applyResult({
    originatorConversationId: result.OriginatorConversationID,
    success: result.ResultCode === 0,
    transactionId: result.TransactionID,
    resultCode: String(result.ResultCode),
    resultDesc: result.ResultDesc,
  }).catch((err) => logWebhook("MPESA_RESULT", 500, req.body, String(err)));
});

webhooksRouter.post("/mpesa/b2c/timeout/:token", async (req, res) => {
  if (!checkToken((req.params.token as string))) return res.status(404).end();
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  await logWebhook("MPESA_TIMEOUT", 200, req.body);
  const body = req.body as { Result?: { OriginatorConversationID: string } };
  if (body.Result?.OriginatorConversationID) {
    await prisma.payout.updateMany({ where: { originatorConversationId: body.Result.OriginatorConversationID, status: "SENT" }, data: { status: "UNKNOWN" } });
  }
});
