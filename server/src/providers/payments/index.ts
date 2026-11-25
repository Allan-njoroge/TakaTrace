import { config } from "../../config.js";
import { darajaPayout } from "./daraja.js";
import { mockPayout } from "./mock.js";
import type { PayoutProvider } from "./PayoutProvider.js";

export const payoutProvider: PayoutProvider = config.PAYOUT_PROVIDER === "daraja" ? darajaPayout : mockPayout;
export type { PayoutProvider, PayoutSendInput, PayoutSendResult } from "./PayoutProvider.js";
