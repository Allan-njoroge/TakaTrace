export interface PayoutSendInput {
  payoutId: string;
  originatorConversationId: string;
  phone: string;
  amountKes: number;
  remarks: string;
}

export interface PayoutSendResult {
  accepted: boolean;
  conversationId?: string;
  error?: string;
}

export interface PayoutProvider {
  name: "MOCK" | "MPESA_DARAJA";
  send(p: PayoutSendInput): Promise<PayoutSendResult>;
}
