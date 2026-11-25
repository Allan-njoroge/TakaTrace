import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { gramsToKgString } from "../../lib/record.js";
import { hoursSince, nairobiMonthLabel, startOfNairobiMonth } from "../../lib/time.js";
import { openDispute } from "../../modules/disputes/service.js";
import { REASON_BY_CHOICE, T, type Lang } from "./texts.js";

export interface UssdInput {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  text: string;
}

/** Serves both the real Africa's Talking webhook and the demo phone simulator. */
export async function handleUssdRequest(input: UssdInput): Promise<string> {
  const phone = normalizePhone(input.phoneNumber);
  const picker = await prisma.picker.findUnique({ where: { phone } });

  await prisma.ussdSession.upsert({
    where: { sessionId: input.sessionId },
    create: { sessionId: input.sessionId, phone, serviceCode: input.serviceCode, lastText: input.text, language: (picker?.language as Lang) ?? "en" },
    update: { lastText: input.text },
  });

  if (!picker) return T.notRegistered;
  const lang = (picker.language as Lang) ?? "en";
  const parts = input.text.split("*").filter((p) => p.length > 0);

  if (parts.length === 0) return T.mainMenu(picker.code, lang);

  switch (parts[0]) {
    case "1":
      return renderLastReceipts(picker.id, lang);
    case "2":
      return renderBalance(picker.id, picker.code, lang);
    case "3":
      return handleDisputeFlow(picker.id, lang, parts.slice(1));
    case "4":
      return handleLanguageMenu(picker.id, parts.slice(1));
    default:
      return T.invalidChoice(config.USSD_CODE);
  }
}

function normalizePhone(raw: string): string {
  return raw.startsWith("+") ? raw : `+${raw}`;
}

async function renderLastReceipts(pickerId: string, lang: Lang): Promise<string> {
  const receipts = await prisma.receipt.findMany({ where: { pickerId, status: { not: "SUPERSEDED" } }, orderBy: { createdAt: "desc" }, take: 3 });
  if (receipts.length === 0) return T.noReceipts(lang);
  const lines = receipts.map((r) => {
    const paid = r.status === "ANCHORED" ? (lang === "en" ? "Paid" : "Imelipwa") : lang === "en" ? "Pending" : "Inasubiri";
    const [, m, d] = r.weighedOn.split("-");
    return `${r.receiptId} ${gramsToKgString(r.weightGrams)}kg ${r.material} ${d}/${m} ${paid}`;
  });
  return `END ${lines.join("\n")}`;
}

async function renderBalance(pickerId: string, code: string, lang: Lang): Promise<string> {
  const since = startOfNairobiMonth();
  const receipts = await prisma.receipt.findMany({ where: { pickerId, createdAt: { gte: since }, status: { not: "SUPERSEDED" } } });
  const kg = receipts.reduce((sum, r) => sum + r.weightGrams, 0) / 1000;
  const payouts = await prisma.payout.findMany({ where: { pickerId, createdAt: { gte: since } } });
  const paidCents = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountCents, 0);
  const pendingCents = payouts.filter((p) => p.status !== "PAID" && p.status !== "FAILED").reduce((sum, p) => sum + p.amountCents, 0);
  const month = nairobiMonthLabel();
  return `END TakaTrace ${code}: ${month} - ${receipts.length} ${lang === "en" ? "weigh-ins" : "mauzo"}, ${kg.toFixed(1)}kg, KES ${(paidCents / 100).toFixed(0)} ${lang === "en" ? "paid" : "zimelipwa"}, KES ${(pendingCents / 100).toFixed(0)} ${lang === "en" ? "pending" : "zinasubiri"}.`;
}

async function eligibleDisputeReceipts(pickerId: string) {
  const receipts = await prisma.receipt.findMany({ where: { pickerId, status: "ANCHORED" }, orderBy: { createdAt: "desc" }, take: 10 });
  return receipts.filter((r) => r.anchoredAt && hoursSince(r.anchoredAt) <= config.DISPUTE_WINDOW_HOURS).slice(0, 3);
}

async function handleDisputeFlow(pickerId: string, lang: Lang, rest: string[]): Promise<string> {
  const eligible = await eligibleDisputeReceipts(pickerId);

  if (rest.length === 0) {
    if (eligible.length === 0) return T.enterReceiptNumber(lang);
    const lines = eligible.map((r, i) => {
      const [, m, d] = r.weighedOn.split("-");
      return `${i + 1}. ${r.receiptId} (${d}/${m})`;
    });
    return T.chooseReceipt(lang, lines);
  }

  const choice = rest[0];
  let receiptId: string | undefined;
  let reasonIndex = 1;

  if (/^\d+$/.test(choice) && Number(choice) <= eligible.length && eligible.length > 0) {
    receiptId = eligible[Number(choice) - 1]?.receiptId;
  } else if (choice === String(eligible.length + 1) || eligible.length === 0) {
    if (rest.length < 2) return T.enterReceiptNumber(lang);
    receiptId = rest[1];
    reasonIndex = 2;
  } else {
    return T.invalidChoice(config.USSD_CODE);
  }

  if (!receiptId) return T.invalidChoice(config.USSD_CODE);

  if (rest.length <= reasonIndex) return T.chooseReason(lang);

  const reasonChoice = rest[reasonIndex];
  const reason = REASON_BY_CHOICE[Number(reasonChoice) - 1];
  if (!reason) return T.invalidChoice(config.USSD_CODE);

  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  const withinWindow = receipt?.status === "ANCHORED" && receipt.pickerId === pickerId && receipt.anchoredAt && hoursSince(receipt.anchoredAt) <= config.DISPUTE_WINDOW_HOURS;
  if (!receipt || !withinWindow) return T.notEligible(lang);

  const { reference } = await openDispute({ receiptId: receipt.receiptId, openedBy: "PICKER_USSD", reason, pickerId });
  return T.disputeConfirmed(lang, receipt.receiptId, reference);
}

async function handleLanguageMenu(pickerId: string, rest: string[]): Promise<string> {
  if (rest.length === 0) return T.languageMenu;
  const lang: Lang | undefined = rest[0] === "1" ? "en" : rest[0] === "2" ? "sw" : undefined;
  if (!lang) return T.invalidChoice(config.USSD_CODE);
  await prisma.picker.update({ where: { id: pickerId }, data: { language: lang } });
  return T.languageUpdated;
}
