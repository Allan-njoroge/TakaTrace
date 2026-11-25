export type Lang = "en" | "sw";

export const T = {
  mainMenu: (code: string, lang: Lang): string =>
    lang === "en"
      ? `CON TakaTrace ${code}\n1. My last 3 receipts\n2. My earnings this month\n3. Report a problem\n4. Lugha / Language`
      : `CON TakaTrace ${code}\n1. Risiti 3 za mwisho\n2. Mapato mwezi huu\n3. Ripoti tatizo\n4. Lugha / Language`,

  notRegistered: "END This number is not registered with TakaTrace. Ask your buying centre to register you.",

  invalidChoice: (ussdCode: string): string => `END Invalid choice. Please dial ${ussdCode} again.`,

  noReceipts: (lang: Lang): string => (lang === "en" ? "END No receipts yet." : "END Hakuna risiti bado."),

  chooseReceipt: (lang: Lang, lines: string[]): string => {
    const header = lang === "en" ? "CON Choose receipt:" : "CON Chagua risiti:";
    const enterMore = lang === "en" ? "Enter receipt number" : "Weka nambari ya risiti";
    return [header, ...lines, `${lines.length + 1}. ${enterMore}`].join("\n");
  },

  enterReceiptNumber: (lang: Lang): string => (lang === "en" ? "CON Enter receipt number (e.g. TT-NRB01-000042):" : "CON Weka nambari ya risiti (mf. TT-NRB01-000042):"),

  chooseReason: (lang: Lang): string =>
    lang === "en"
      ? "CON What is wrong?\n1. Wrong weight\n2. Wrong material\n3. Not paid\n4. Other"
      : "CON Kuna nini?\n1. Uzito si sahihi\n2. Aina si sahihi\n3. Sijalipwa\n4. Nyingine",

  disputeConfirmed: (lang: Lang, receiptId: string, ref: string): string =>
    lang === "en"
      ? `END Report received for ${receiptId} (ref ${ref}). We'll SMS you within 48 hours.`
      : `END Malalamiko yamepokelewa kwa ${receiptId} (kumb. ${ref}). Tutakutumia SMS ndani ya saa 48.`,

  languageMenu: "CON 1. English  2. Kiswahili",

  languageUpdated: "END Language updated.",

  notEligible: (lang: Lang): string =>
    lang === "en" ? "END This receipt can't be reported (not found, not yours, or outside the reporting window)." : "END Risiti hii haiwezi kuripotiwa (haipo, si yako, au muda umepita).",
} as const;

export const REASON_BY_CHOICE = ["WRONG_WEIGHT", "WRONG_MATERIAL", "NOT_PAID", "OTHER"] as const;
