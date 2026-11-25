import { config } from "../../config.js";
import { logger } from "../../lib/logger.js";
import type { PayoutProvider } from "./PayoutProvider.js";
import { buildSecurityCredential } from "./securityCredential.js";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const basic = Buffer.from(`${config.MPESA_CONSUMER_KEY}:${config.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${config.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`Daraja token request failed: ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = { token: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) - 60) * 1000 };
  return cachedToken.token;
}

function getSecurityCredential(): string {
  if (config.MPESA_SECURITY_CREDENTIAL) return config.MPESA_SECURITY_CREDENTIAL;
  return buildSecurityCredential(config.MPESA_CERT_PATH, config.MPESA_INITIATOR_PASSWORD);
}

export const darajaPayout: PayoutProvider = {
  name: "MPESA_DARAJA",
  async send(p) {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${config.MPESA_BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          OriginatorConversationID: p.originatorConversationId,
          InitiatorName: config.MPESA_INITIATOR_NAME,
          SecurityCredential: getSecurityCredential(),
          CommandID: config.MPESA_COMMAND_ID,
          Amount: p.amountKes,
          PartyA: config.MPESA_SHORTCODE,
          PartyB: config.MPESA_SANDBOX_FORCE_MSISDN, // sandbox can only pay its test number
          Remarks: p.remarks,
          QueueTimeOutURL: `${config.PUBLIC_BASE_URL}/webhooks/mpesa/b2c/timeout/${config.WEBHOOK_TOKEN}`,
          ResultURL: `${config.PUBLIC_BASE_URL}/webhooks/mpesa/b2c/result/${config.WEBHOOK_TOKEN}`,
          Occasion: "Plastic purchase",
        }),
      });
      const body = (await res.json()) as { ResponseCode?: string; ConversationID?: string; ResponseDescription?: string; errorMessage?: string };
      if (body.ResponseCode === "0") {
        return { accepted: true, conversationId: body.ConversationID };
      }
      return { accepted: false, error: body.ResponseDescription ?? body.errorMessage ?? "Daraja rejected the payment request." };
    } catch (err) {
      logger.error({ err }, "Daraja B2C request failed");
      return { accepted: false, error: "Could not reach M-Pesa. Try again shortly." };
    }
  },
};
