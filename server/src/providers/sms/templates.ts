export type SmsTemplateName =
  | "WELCOME"
  | "RECEIPT_ANCHORED"
  | "PAYOUT_PAID"
  | "DISPUTE_RECEIVED"
  | "DISPUTE_REJECTED"
  | "DISPUTE_UPHELD"
  | "HELP"
  | "BALANCE"
  | "UNKNOWN_COMMAND"
  | "NOT_REGISTERED"
  | "STOP_CONFIRMED";

type Lang = "en" | "sw";

const TEMPLATES: Record<SmsTemplateName, Record<Lang, string>> = {
  WELCOME: {
    en: "Welcome to TakaTrace. Your picker code is {code}. Dial {ussd} to check receipts and payments. Reply HELP for help.",
    sw: "Karibu TakaTrace. Nambari yako ni {code}. Piga {ussd} kuangalia risiti na malipo. Jibu MSAADA kwa usaidizi.",
  },
  RECEIPT_ANCHORED: {
    en: "TakaTrace {receiptId}: {kg}kg {material} at {centre} on {date}. KES {amount} to M-Pesa. Check: {link}",
    sw: "TakaTrace {receiptId}: kg {kg} {material} kwa {centre} {date}. KES {amount} kwa M-Pesa. Hakiki: {link}",
  },
  PAYOUT_PAID: {
    en: "TakaTrace: KES {amount} for {receiptId} sent to your M-Pesa. Ref {mpesaRef}.",
    sw: "TakaTrace: KES {amount} za {receiptId} zimetumwa M-Pesa. Kumb. {mpesaRef}.",
  },
  DISPUTE_RECEIVED: {
    en: "TakaTrace: we got your report on {receiptId} (ref {disputeRef}). The centre will reply within 48 hours.",
    sw: "TakaTrace: tumepokea malalamiko yako kuhusu {receiptId} (kumb. {disputeRef}). Jibu ndani ya saa 48.",
  },
  DISPUTE_REJECTED: {
    en: "TakaTrace: report {disputeRef} on {receiptId} was reviewed. The record stands: {reason}.",
    sw: "TakaTrace: malalamiko {disputeRef} kuhusu {receiptId} yamekaguliwa. Rekodi inabaki: {reason}.",
  },
  DISPUTE_UPHELD: {
    en: "TakaTrace: report {disputeRef} upheld. New receipt {newReceiptId}: {kg}kg {material}. Extra KES {topUp} to M-Pesa.",
    sw: "TakaTrace: malalamiko {disputeRef} yamekubaliwa. Risiti mpya {newReceiptId}: kg {kg} {material}. KES {topUp} zaidi kwa M-Pesa.",
  },
  HELP: {
    en: "TakaTrace: BAL = earnings this month. DISPUTE <receipt> <reason> = report a problem. STOP = no more SMS. Or dial {ussd}.",
    sw: "TakaTrace: SALIO = mapato mwezi huu. MALALAMIKO <risiti> <sababu> = ripoti tatizo. ACHA = acha SMS. Au piga {ussd}.",
  },
  BALANCE: {
    en: "TakaTrace {code}: {month} - {count} weigh-ins, {kg}kg, KES {paid} paid, KES {pending} pending.",
    sw: "TakaTrace {code}: {month} - mauzo {count}, kg {kg}, KES {paid} zimelipwa, KES {pending} zinasubiri.",
  },
  UNKNOWN_COMMAND: {
    en: "TakaTrace: we didn't understand. Reply HELP for options.",
    sw: "TakaTrace: hatukuelewa. Jibu MSAADA kwa maelezo.",
  },
  NOT_REGISTERED: {
    en: "TakaTrace: this number is not registered. Ask your buying centre to register you.",
    sw: "TakaTrace: nambari hii haijasajiliwa. Omba kituo chako kikusajili.",
  },
  // Not in BACKEND_SPEC.md's template table (14.2); added for the one confirmation SMS
  // the spec requires when STOP is received (14.3: "reply confirmation (one final SMS)").
  STOP_CONFIRMED: {
    en: "TakaTrace: you will no longer receive SMS. Reply START to turn them back on.",
    sw: "TakaTrace: hutapokea tena SMS. Jibu ANZA kuwasha tena.",
  },
};

export function renderSms(template: SmsTemplateName, lang: Lang, vars: Record<string, string | number>): string {
  let text = TEMPLATES[template][lang];
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}
