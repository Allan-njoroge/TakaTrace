export interface SmsSendResult {
  providerMessageId?: string;
  status: "SENT" | "FAILED";
  cost?: string;
  failureReason?: string;
}

export interface SmsProvider {
  name: "MOCK" | "AFRICASTALKING";
  send(to: string, message: string): Promise<SmsSendResult>;
}
