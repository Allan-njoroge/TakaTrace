import { randomToken } from "../../lib/crypto.js";
import type { SmsProvider } from "./SmsProvider.js";

/** Works fully offline. The service layer marks the message DELIVERED ~1s after SENT. */
export const mockSms: SmsProvider = {
  name: "MOCK",
  async send(_to, _message) {
    return { status: "SENT", providerMessageId: `MOCKSMS${randomToken(4)}` };
  },
};
