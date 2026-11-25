import { chainStatus } from "../../chain/provider.js";
import { verifyTx } from "../../chain/txVerifier.js";
import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { writeAudit } from "../../lib/audit.js";
import { emitEvent } from "../../lib/events.js";
import { AppError } from "../../lib/errors.js";
import { nextReceiptId } from "../../lib/ids.js";
import { logger } from "../../lib/logger.js";
import { payoutCentsFor } from "../../lib/money.js";
import { buildRecordText, gramsToKgString, hashRecordText, kgStringToGrams, MATERIALS } from "../../lib/record.js";
import { centsToKesNumber, gramsToKgNumber } from "../../lib/dto.js";
import { randomSalt } from "../../lib/crypto.js";
import { daysBeforeToday, nairobiToday } from "../../lib/time.js";
import { createPayout } from "../payouts/service.js";
import { sendSms } from "../../providers/sms/service.js";
import { config } from "../../config.js";
import type { SessionUser } from "../../middleware/session.js";

const OPEN_STATUSES = ["DRAFT", "ANCHORING", "ANCHOR_FAILED", "NEEDS_REANCHOR"] as const;

export interface CreateReceiptInput {
  pickerId: string;
  material: string;
  weightKg: string;
  weighedOn: string;
  photoId?: string;
  note?: string;
  operatorConfirmed: boolean;
}

export interface CreateReceiptResult {
  receiptId: string;
  recordText: string;
  dataHash: string;
  payoutKes: number;
  status: string;
  contract: { address: string | null; chainId: number };
}

export async function createDraftReceipt(user: SessionUser, idempotencyKey: string, input: CreateReceiptInput): Promise<CreateReceiptResult> {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a buying centre.");
  if (!input.operatorConfirmed) throw new AppError("VALIDATION", "Confirm the weigh-in before saving.", { operatorConfirmed: "Required" });
  if (!(MATERIALS as readonly string[]).includes(input.material)) {
    throw new AppError("VALIDATION", "Choose a valid material.", { material: "Choose a valid material" });
  }

  const existing = await prisma.receipt.findUnique({ where: { idempotencyKey } });
  if (existing) {
    const weightGrams = kgStringToGrams(input.weightKg);
    const sameBody =
      existing.pickerId === input.pickerId &&
      existing.material === input.material &&
      existing.weightGrams === weightGrams &&
      existing.weighedOn === input.weighedOn &&
      (existing.photoId ?? null) === (input.photoId ?? null);
    if (!sameBody) throw new AppError("CONFLICT", "This idempotency key was already used with a different request.");
    return toResult(existing);
  }

  const weightGrams = kgStringToGrams(input.weightKg);
  if (weightGrams < 100 || weightGrams > config.MAX_WEIGHT_KG * 1000) {
    throw new AppError("VALIDATION", `Weight must be between 0.10 and ${config.MAX_WEIGHT_KG} kg.`, { weightKg: "Out of range" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weighedOn)) {
    throw new AppError("VALIDATION", "Enter a valid date.", { weighedOn: "Invalid date" });
  }
  const daysAgo = daysBeforeToday(input.weighedOn);
  if (daysAgo < 0) throw new AppError("VALIDATION", "The weigh-in date can't be in the future.", { weighedOn: "In the future" });
  if (daysAgo > config.MAX_BACKDATE_DAYS) {
    throw new AppError("VALIDATION", `The weigh-in date can't be more than ${config.MAX_BACKDATE_DAYS} days ago.`, { weighedOn: "Too far in the past" });
  }

  const picker = await prisma.picker.findUnique({ where: { id: input.pickerId } });
  if (!picker || picker.registeredByOrgId !== user.organizationId) throw new AppError("NOT_FOUND", "Picker not found.");
  if (picker.status !== "ACTIVE") throw new AppError("CONFLICT", "This picker is not active.");

  let photoCid: string | null = null;
  if (config.REQUIRE_SCALE_PHOTO || input.photoId) {
    if (!input.photoId) throw new AppError("VALIDATION", "A scale photo is required.", { photoId: "Required" });
    const photo = await prisma.photo.findUnique({ where: { id: input.photoId } });
    if (!photo || photo.uploadedByUserId !== user.id) throw new AppError("NOT_FOUND", "Photo not found.");
    const used = await prisma.receipt.findFirst({ where: { photoId: photo.id } });
    if (used) throw new AppError("CONFLICT", "This photo was already used on another receipt.");
    photoCid = photo.cid;
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  const price = await prisma.price.findFirst({
    where: { organizationId: org.id, material: input.material, effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!price) throw new AppError("CONFLICT", `Set a price for ${input.material} before recording weigh-ins.`);

  const payoutCents = payoutCentsFor(weightGrams, price.pricePerKgCents);

  const receipt = await prisma.$transaction(async (tx) => {
    const receiptId = await nextReceiptId(tx, org.id, org.code);
    const salt = randomSalt();
    const recordText = buildRecordText({
      receiptId,
      pickerCode: picker.code,
      material: input.material,
      weightGrams,
      weighedOn: input.weighedOn,
      photoCid,
      salt,
    });
    const dataHash = hashRecordText(recordText);

    const created = await tx.receipt.create({
      data: {
        receiptId,
        organizationId: org.id,
        pickerId: picker.id,
        pickerCode: picker.code,
        material: input.material,
        weightGrams,
        weighedOn: input.weighedOn,
        photoId: input.photoId,
        photoCid,
        salt,
        dataHash,
        pricePerKgCents: price.pricePerKgCents,
        payoutCents,
        note: input.note,
        status: "DRAFT",
        createdByUserId: user.id,
        idempotencyKey,
      },
    });
    await writeAudit(tx, {
      actorType: "USER",
      actorId: user.id,
      action: "RECEIPT_CREATED",
      entityType: "Receipt",
      entityId: created.id,
      summary: `Draft receipt ${receiptId} created (${gramsToKgString(weightGrams)}kg ${input.material}).`,
    });
    return created;
  });

  emitEvent({
    name: "receipt.created",
    data: { receiptId: receipt.receiptId, organizationId: org.id, material: input.material },
    audiences: [{ kind: "organization", organizationId: org.id }, { kind: "role", role: "ADMIN" }],
  });

  return toResult(receipt);
}

function toResult(receipt: { receiptId: string; pickerCode: string; material: string; weightGrams: number; weighedOn: string; photoCid: string | null; salt: string; dataHash: string; payoutCents: number; status: string }): CreateReceiptResult {
  const recordText = buildRecordText({
    receiptId: receipt.receiptId,
    pickerCode: receipt.pickerCode,
    material: receipt.material,
    weightGrams: receipt.weightGrams,
    weighedOn: receipt.weighedOn,
    photoCid: receipt.photoCid,
    salt: receipt.salt,
  });
  return {
    receiptId: receipt.receiptId,
    recordText,
    dataHash: receipt.dataHash,
    payoutKes: centsToKesNumber(receipt.payoutCents),
    status: receipt.status,
    contract: { address: chainStatus.contractAddress, chainId: config.CHAIN_ID },
  };
}

/** Centre reports a transaction hash after signing recordReceipt() in the browser. */
export async function reportAnchorTx(user: SessionUser, receiptId: string, txHash: string): Promise<{ status: string }> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt || receipt.organizationId !== user.organizationId) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (!(OPEN_STATUSES as readonly string[]).includes(receipt.status)) {
    // Idempotent re-report of the same tx on an already-anchoring receipt.
    const already = await prisma.anchor.findFirst({ where: { receiptRef: receipt.id, txHash } });
    if (already) return { status: receipt.status };
    throw new AppError("CONFLICT", `Receipt is ${receipt.status.toLowerCase()} and can't be anchored again.`);
  }
  if (!chainStatus.contractDeployed) throw new AppError("CHAIN_UNAVAILABLE", "The smart contract isn't deployed. Run the deploy script.");

  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  const chainEpoch = state?.epoch ?? 1;

  const existingAnchor = await prisma.anchor.findFirst({ where: { receiptRef: receipt.id, txHash } });
  if (!existingAnchor) {
    await prisma.$transaction(async (tx) => {
      await tx.anchor.create({
        data: { receiptRef: receipt.id, chainId: config.CHAIN_ID, chainEpoch, txHash, fromAddress: user.walletAddress, status: "SUBMITTED" },
      });
      await tx.receipt.update({ where: { id: receipt.id }, data: { status: "ANCHORING" } });
      await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "ANCHOR_SUBMITTED", entityType: "Receipt", entityId: receipt.id, summary: `Transaction ${txHash} reported.` });
    });
  }

  void verifyAndApplyAnchor(receipt.id, txHash, user.walletAddress).catch((err) => logger.error({ err, receiptId }, "anchor verification crashed"));

  return { status: "ANCHORING" };
}

async function verifyAndApplyAnchor(receiptRowId: string, txHash: string, fromAddress: string): Promise<void> {
  const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: receiptRowId } });
  const result = await verifyTx(txHash, fromAddress, { name: "ReceiptRecorded", args: { receiptId: receipt.receiptId, dataHash: receipt.dataHash, centre: fromAddress } });

  if (result.status === "TIMEOUT") return; // the anchor watcher job will retry

  if (result.status === "CONFIRMED") {
    await prisma.anchor.updateMany({ where: { receiptRef: receiptRowId, txHash }, data: { status: "CONFIRMED", blockNumber: result.blockNumber, confirmedAt: new Date() } });
    await applyAnchorConfirmed(receiptRowId, result.blockNumber);
    return;
  }

  const reason = result.status === "FAILED" ? result.reason : result.reason;
  await prisma.$transaction(async (tx) => {
    await tx.anchor.updateMany({ where: { receiptRef: receiptRowId, txHash }, data: { status: "FAILED", error: reason } });
    await tx.receipt.update({ where: { id: receiptRowId }, data: { status: "ANCHOR_FAILED" } });
    await writeAudit(tx, {
      actorType: "SYSTEM",
      action: result.status === "MISMATCH" ? "TX_MISMATCH" : "ANCHOR_FAILED",
      entityType: "Receipt",
      entityId: receiptRowId,
      summary: reason ?? "Anchor failed.",
    });
  });
  emitEvent({ name: "receipt.anchor_failed", data: { receiptId: receipt.receiptId, reason }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });
}

/**
 * Shared "entering ANCHORED" transition (BACKEND_SPEC.md section 9.1). Called both by
 * the browser-reported-transaction path above and directly by the indexer when it sees
 * a ReceiptRecorded event the browser never reported. Guarded so it only runs once per
 * anchor event; the PURCHASE payout only fires the very first time a receipt is anchored.
 */
export async function applyAnchorConfirmed(receiptRowId: string, blockNumber: number): Promise<void> {
  const outcome = await prisma.$transaction(async (tx) => {
    const before = await tx.receipt.findUnique({ where: { id: receiptRowId } });
    if (!before || !(OPEN_STATUSES as readonly string[]).includes(before.status)) return null;

    const updated = await tx.receipt.updateMany({
      where: { id: receiptRowId, status: before.status },
      data: { status: "ANCHORED", anchoredAt: before.anchoredAt ?? new Date() },
    });
    if (updated.count !== 1) return null;

    await writeAudit(tx, { actorType: "SYSTEM", action: "RECEIPT_ANCHORED", entityType: "Receipt", entityId: receiptRowId, summary: `Anchored at block ${blockNumber}.` });
    return { receipt: before, isFirstAnchor: before.anchoredAt === null };
  });
  if (!outcome) return;

  const { receipt, isFirstAnchor } = outcome;
  const [org, picker] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: receipt.organizationId } }),
    prisma.picker.findUniqueOrThrow({ where: { id: receipt.pickerId } }),
  ]);

  if (isFirstAnchor && receipt.correctsId) {
    // A dispute correction: top up the difference only, never a second full purchase payout.
    const original = await prisma.receipt.findUnique({ where: { id: receipt.correctsId } });
    const topUp = Math.max(0, receipt.payoutCents - (original?.payoutCents ?? 0));
    await createPayout({ receiptRef: receipt.id, pickerId: picker.id, phone: picker.phone, amountCents: topUp, kind: "TOP_UP" });
    const dispute = await prisma.dispute.findFirst({ where: { correctionRef: receipt.id } });
    await sendSms({
      phone: picker.phone,
      pickerId: picker.id,
      receiptRef: receipt.id,
      template: "DISPUTE_UPHELD",
      lang: picker.language as "en" | "sw",
      vars: {
        disputeRef: dispute?.reference ?? "-",
        newReceiptId: receipt.receiptId,
        kg: gramsToKgString(receipt.weightGrams),
        material: receipt.material,
        topUp: (topUp / 100).toFixed(0),
      },
    });
  } else {
    if (isFirstAnchor) {
      await createPayout({ receiptRef: receipt.id, pickerId: picker.id, phone: picker.phone, amountCents: receipt.payoutCents, kind: "PURCHASE" });
    }
    await sendSms({
      phone: picker.phone,
      pickerId: picker.id,
      receiptRef: receipt.id,
      template: "RECEIPT_ANCHORED",
      lang: picker.language as "en" | "sw",
      vars: {
        receiptId: receipt.receiptId,
        kg: gramsToKgString(receipt.weightGrams),
        material: receipt.material,
        centre: org.name,
        date: receipt.weighedOn.split("-").reverse().slice(0, 2).join("/"),
        amount: (receipt.payoutCents / 100).toFixed(0),
        link: `${config.SHORT_LINK_BASE}/${receipt.receiptId}`,
      },
    });
  }

  emitEvent({
    name: "receipt.anchored",
    data: { receiptId: receipt.receiptId, organizationId: org.id, material: receipt.material, weightKg: gramsToKgNumber(receipt.weightGrams) },
    audiences: [{ kind: "organization", organizationId: org.id }, { kind: "role", role: "ADMIN" }, { kind: "role", role: "BRAND_OFFICER" }, { kind: "public" }],
  });
}

export interface CorrectionInput {
  material: string;
  weightKg: string;
  photoId?: string;
}

/**
 * Creates the replacement receipt for an upheld dispute (BACKEND_SPEC.md section 18.3):
 * same picker and weigh-in date as the original, same price, a fresh salt/hash, and
 * `correctsId` pointing back at the superseded receipt.
 */
export async function createCorrectionReceipt(user: SessionUser, originalReceiptId: string, idempotencyKey: string, correction: CorrectionInput): Promise<CreateReceiptResult & { payoutCents: number }> {
  const original = await prisma.receipt.findUnique({ where: { receiptId: originalReceiptId } });
  if (!original) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (user.role !== "ADMIN" && original.organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");
  if (!(MATERIALS as readonly string[]).includes(correction.material)) {
    throw new AppError("VALIDATION", "Choose a valid material.", { material: "Choose a valid material" });
  }
  const weightGrams = kgStringToGrams(correction.weightKg);
  if (weightGrams < 100 || weightGrams > config.MAX_WEIGHT_KG * 1000) {
    throw new AppError("VALIDATION", `Weight must be between 0.10 and ${config.MAX_WEIGHT_KG} kg.`, { weightKg: "Out of range" });
  }

  let photoCid: string | null = null;
  if (correction.photoId) {
    const photo = await prisma.photo.findUnique({ where: { id: correction.photoId } });
    if (!photo || photo.uploadedByUserId !== user.id) throw new AppError("NOT_FOUND", "Photo not found.");
    photoCid = photo.cid;
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: original.organizationId } });
  const payoutCents = payoutCentsFor(weightGrams, original.pricePerKgCents);

  const created = await prisma.$transaction(async (tx) => {
    const receiptId = await nextReceiptId(tx, org.id, org.code);
    const salt = randomSalt();
    const recordText = buildRecordText({ receiptId, pickerCode: original.pickerCode, material: correction.material, weightGrams, weighedOn: original.weighedOn, photoCid, salt });
    const dataHash = hashRecordText(recordText);
    const row = await tx.receipt.create({
      data: {
        receiptId,
        organizationId: org.id,
        pickerId: original.pickerId,
        pickerCode: original.pickerCode,
        material: correction.material,
        weightGrams,
        weighedOn: original.weighedOn,
        photoId: correction.photoId,
        photoCid,
        salt,
        dataHash,
        pricePerKgCents: original.pricePerKgCents,
        payoutCents,
        status: "DRAFT",
        correctsId: original.id,
        createdByUserId: user.id,
        idempotencyKey,
      },
    });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "RECEIPT_CREATED", entityType: "Receipt", entityId: row.id, summary: `Correction receipt ${receiptId} created for ${originalReceiptId}.` });
    return row;
  });

  return { ...toResult(created), payoutCents };
}

export async function recordAnchorCancelled(user: SessionUser, receiptId: string, reason: string): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt || receipt.organizationId !== user.organizationId) throw new AppError("NOT_FOUND", "Receipt not found.");
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ANCHOR_CANCELLED", entityType: "Receipt", entityId: receipt.id, summary: `Anchor cancelled: ${reason}.` });
}

export async function discardDraftReceipt(user: SessionUser, receiptId: string): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt || receipt.organizationId !== user.organizationId) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (receipt.status !== "DRAFT") throw new AppError("CONFLICT", "Only a draft receipt can be discarded.");
  await prisma.$transaction(async (tx) => {
    await tx.receipt.delete({ where: { id: receipt.id } });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "RECEIPT_DISCARDED", entityType: "Receipt", entityId: receipt.id, summary: `Draft ${receiptId} discarded.` });
  });
}

export async function reportDisputeFlagTx(user: SessionUser, receiptId: string, txHash: string, disputed: boolean): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (user.role !== "ADMIN" && receipt.organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");

  const result = await verifyTx(txHash, user.walletAddress, { name: "DisputeFlagChanged", args: { receiptId: receipt.receiptId, disputed } });
  if (result.status !== "CONFIRMED") {
    throw new AppError(result.status === "TIMEOUT" ? "CHAIN_UNAVAILABLE" : "TX_MISMATCH", result.status === "FAILED" || result.status === "MISMATCH" ? result.reason : "The transaction hasn't confirmed yet.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({ where: { id: receipt.id }, data: { disputeFlagOnChain: disputed } });
    const dispute = await tx.dispute.findFirst({ where: { receiptRef: receipt.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
    if (dispute) {
      await tx.dispute.update({ where: { id: dispute.id }, data: disputed ? { flagTxHash: txHash } : { unflagTxHash: txHash } });
    }
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "DISPUTE_FLAGGED_ON_CHAIN", entityType: "Receipt", entityId: receipt.id, summary: `On-chain dispute flag set to ${disputed}.` });
  });
  emitEvent({ name: "dispute.updated", data: { receiptId: receipt.receiptId, disputed }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }] });
}

export interface ListReceiptsFilters {
  status?: string;
  displayStatus?: string;
  material?: string;
  pickerId?: string;
  from?: string;
  to?: string;
  q?: string;
}

function receiptDisplayStatus(r: { status: string; claimStatus: string; disputeFlagOnChain: boolean }): string {
  if (r.status === "SUPERSEDED") return "SUPERSEDED";
  if (r.disputeFlagOnChain) return "DISPUTED";
  if (r.claimStatus === "CLAIMED") return "CLAIMED";
  return r.status;
}

type ReceiptRowForDto = Awaited<ReturnType<typeof fetchReceiptRowsForDto>>[number];

async function fetchReceiptRowsForDto(where: Prisma.ReceiptWhereInput) {
  return prisma.receipt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      organization: true,
      anchors: { where: { status: "CONFIRMED" }, take: 1 },
      claims: { where: { status: "CONFIRMED" }, include: { brandOrg: true }, take: 1 },
    },
  });
}

/** Flattens a receipt row (+ the relations fetchReceiptRowsForDto includes) into the
 * frontend's Receipt shape — numbers instead of formatted strings, public receiptId
 * strings instead of internal cuids for corrects/supersededBy. */
function toReceiptDto(r: ReceiptRowForDto, correctsReceiptId: string | null, supersededByReceiptId: string | null) {
  return {
    receiptId: r.receiptId,
    pickerCode: r.pickerCode,
    centre: { name: r.organization.name, code: r.organization.code },
    material: r.material,
    weightKg: gramsToKgNumber(r.weightGrams),
    weighedOn: r.weighedOn,
    payoutKes: centsToKesNumber(r.payoutCents),
    photo: r.photoCid ? { cid: r.photoCid, url: `${config.PUBLIC_BASE_URL}/api/photos/${r.photoCid}` } : null,
    note: r.note,
    status: r.status,
    displayStatus: receiptDisplayStatus(r),
    recordText: buildRecordText({ receiptId: r.receiptId, pickerCode: r.pickerCode, material: r.material, weightGrams: r.weightGrams, weighedOn: r.weighedOn, photoCid: r.photoCid, salt: r.salt }),
    dataHash: r.dataHash,
    anchorTx: r.anchors[0]?.txHash ?? null,
    claimedBy: r.claims[0]?.brandOrg.name ?? null,
    disputed: r.disputeFlagOnChain,
    supersededBy: supersededByReceiptId,
    corrects: correctsReceiptId,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Resolves correctsId (internal id) -> receiptId and the reverse (who supersedes this
 * row) for a batch of rows in two queries instead of one per row. */
async function resolveCorrectionLinks(rows: { id: string; correctsId: string | null }[]) {
  const correctsIds = rows.map((r) => r.correctsId).filter((id): id is string => id !== null);
  const [originals, successors] = await Promise.all([
    correctsIds.length ? prisma.receipt.findMany({ where: { id: { in: correctsIds } }, select: { id: true, receiptId: true } }) : Promise.resolve([]),
    prisma.receipt.findMany({ where: { correctsId: { in: rows.map((r) => r.id) } }, select: { correctsId: true, receiptId: true } }),
  ]);
  const correctsMap = new Map(originals.map((o) => [o.id, o.receiptId]));
  const supersededByMap = new Map(successors.filter((s) => s.correctsId).map((s) => [s.correctsId as string, s.receiptId]));
  return { correctsMap, supersededByMap };
}

export async function listReceipts(user: SessionUser, filters: ListReceiptsFilters) {
  const rows = await fetchReceiptRowsForDto({
    organizationId: user.role === "ADMIN" ? undefined : (user.organizationId as string),
    status: filters.status,
    material: filters.material,
    pickerId: filters.pickerId,
    weighedOn: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    OR: filters.q ? [{ receiptId: { contains: filters.q } }, { pickerCode: { contains: filters.q } }] : undefined,
  });
  const { correctsMap, supersededByMap } = await resolveCorrectionLinks(rows);
  const dtos = rows.map((r) => toReceiptDto(r, r.correctsId ? (correctsMap.get(r.correctsId) ?? null) : null, supersededByMap.get(r.id) ?? null));
  return filters.displayStatus ? dtos.filter((r) => r.displayStatus === filters.displayStatus) : dtos;
}

export async function getReceiptDetail(user: SessionUser, receiptId: string) {
  const rows = await fetchReceiptRowsForDto({ receiptId });
  const receipt = rows[0];
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (user.role !== "ADMIN" && receipt.organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");
  const { correctsMap, supersededByMap } = await resolveCorrectionLinks([receipt]);
  return toReceiptDto(receipt, receipt.correctsId ? (correctsMap.get(receipt.correctsId) ?? null) : null, supersededByMap.get(receipt.id) ?? null);
}

export async function getReceiptTimeline(user: SessionUser, receiptId: string) {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");
  if (user.role !== "ADMIN" && receipt.organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");

  const [anchors, sms, payouts, disputes, claims] = await Promise.all([
    prisma.anchor.findMany({ where: { receiptRef: receipt.id }, orderBy: { submittedAt: "asc" } }),
    prisma.smsMessage.findMany({ where: { receiptRef: receipt.id }, orderBy: { createdAt: "asc" } }),
    prisma.payout.findMany({ where: { receiptRef: receipt.id }, orderBy: { createdAt: "asc" } }),
    prisma.dispute.findMany({ where: { receiptRef: receipt.id }, orderBy: { createdAt: "asc" } }),
    prisma.claim.findMany({ where: { receiptRef: receipt.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const events: { type: string; at: string; detail: string; txHash?: string }[] = [
    { type: "CREATED", at: receipt.createdAt.toISOString(), detail: `Draft created (${gramsToKgString(receipt.weightGrams)}kg ${receipt.material})` },
  ];
  for (const a of anchors) {
    events.push({ type: "ANCHOR_SENT", at: a.submittedAt.toISOString(), detail: "Anchor transaction submitted", txHash: a.txHash });
    if (a.status === "CONFIRMED" && a.confirmedAt) events.push({ type: "ANCHORED", at: a.confirmedAt.toISOString(), detail: "Confirmed on the blockchain", txHash: a.txHash });
    if (a.status === "FAILED") events.push({ type: "ANCHOR_FAILED", at: a.submittedAt.toISOString(), detail: a.error ?? "Anchoring failed", txHash: a.txHash });
  }
  for (const s of sms) {
    if (s.direction !== "OUTBOUND") continue;
    if (s.status === "SENT" || s.status === "DELIVERED") events.push({ type: "SMS_SENT", at: s.createdAt.toISOString(), detail: `SMS sent: ${s.template ?? ""}` });
    if (s.status === "DELIVERED") events.push({ type: "SMS_DELIVERED", at: s.updatedAt.toISOString(), detail: "SMS delivered" });
    if (s.status === "FAILED") events.push({ type: "SMS_FAILED", at: s.updatedAt.toISOString(), detail: s.failureReason ?? "SMS failed" });
  }
  for (const p of payouts) {
    if (p.sentAt) events.push({ type: "PAYOUT_SENT", at: p.sentAt.toISOString(), detail: `Payout of KES ${centsToKesNumber(p.amountCents)} sent` });
    if (p.status === "PAID" && p.paidAt) events.push({ type: "PAYOUT_PAID", at: p.paidAt.toISOString(), detail: `Payout of KES ${centsToKesNumber(p.amountCents)} paid` });
    if (p.status === "FAILED") events.push({ type: "PAYOUT_FAILED", at: p.updatedAt.toISOString(), detail: p.resultDesc ?? "Payout failed" });
  }
  for (const d of disputes) {
    events.push({ type: "DISPUTE_OPENED", at: d.createdAt.toISOString(), detail: `Dispute ${d.reference} opened (${d.reason})` });
    if (d.decidedAt) events.push({ type: "DISPUTE_RESOLVED", at: d.decidedAt.toISOString(), detail: `Dispute ${d.reference} ${d.status.toLowerCase()}` });
  }
  for (const c of claims) {
    events.push({ type: "CLAIMED", at: c.claimedAt.toISOString(), detail: "Credit claimed", txHash: c.txHash });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}
