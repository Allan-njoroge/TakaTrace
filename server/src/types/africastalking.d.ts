declare module "africastalking" {
  interface SmsRecipient {
    statusCode: number;
    number: string;
    status: string;
    cost?: string;
    messageId?: string;
  }
  interface SmsSendResponse {
    SMSMessageData?: { Message?: string; Recipients?: SmsRecipient[] };
  }
  interface AfricasTalkingClient {
    SMS: { send(options: { to: string[]; message: string; from?: string }): Promise<SmsSendResponse> };
  }
  function AfricasTalking(options: { apiKey: string; username: string }): AfricasTalkingClient;
  export default AfricasTalking;
}
