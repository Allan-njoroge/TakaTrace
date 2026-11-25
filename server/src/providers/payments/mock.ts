import type { PayoutProvider } from "./PayoutProvider.js";

/**
 * Accepts every request immediately. The actual success/failure simulation (delay,
 * MOCK_PAYOUT_FAIL_PHONES) is driven by the payouts service, which treats MOCK the
 * same way it treats a real provider's asynchronous result callback.
 */
export const mockPayout: PayoutProvider = {
  name: "MOCK",
  async send(p) {
    return { accepted: true, conversationId: `MOCKCONV${p.payoutId.slice(-6)}` };
  },
};
