import AfricasTalking from "africastalking";
import { config } from "../../config.js";
import type { SmsProvider } from "./SmsProvider.js";

// Constructed lazily: the SDK validates apiKey eagerly, which would crash startup
// in the default mock mode (where AT_API_KEY is normally empty) if built at import time.
let client: ReturnType<typeof AfricasTalking> | null = null;
function getClient() {
  if (!client) client = AfricasTalking({ apiKey: config.AT_API_KEY, username: config.AT_USERNAME });
  return client;
}

export const atSms: SmsProvider = {
  name: "AFRICASTALKING",
  async send(to, message) {
    const res = await getClient().SMS.send({
      to: [to],
      message,
      ...(config.AT_SENDER_ID ? { from: config.AT_SENDER_ID } : {}),
    });
    const r = res.SMSMessageData?.Recipients?.[0];
    if (!r) return { status: "FAILED", failureReason: res.SMSMessageData?.Message ?? "No recipient result" };
    const ok = r.statusCode === 100 || r.statusCode === 101 || r.statusCode === 102; // processed / sent / queued
    return { status: ok ? "SENT" : "FAILED", providerMessageId: r.messageId, cost: r.cost, failureReason: ok ? undefined : r.status };
  },
};
