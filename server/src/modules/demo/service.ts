import { demoContractAs, demoSigningAvailable, getDemoSigners } from "../../chain/demoSigner.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { buildRecordText, hashRecordText, kgStringToGrams, MATERIALS } from "../../lib/record.js";
import { randomSalt } from "../../lib/crypto.js";
import { nextReceiptId } from "../../lib/ids.js";
import { payoutCentsFor } from "../../lib/money.js";
import type { SessionUser } from "../../middleware/session.js";

const TAMPERABLE_FIELDS = ["weightKg", "material", "pickerCode", "weighedOn"] as const;
type TamperField = (typeof TAMPERABLE_FIELDS)[number];

export async function tamperReceipt(user: SessionUser, receiptId: string, field: TamperField, value: string): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const data: Record<string, unknown> = {};

  if (field === "weightKg") {
    before.weightGrams = receipt.weightGrams;
    data.weightGrams = kgStringToGrams(value);
    after.weightGrams = data.weightGrams;
  } else if (field === "material") {
    if (!(MATERIALS as readonly string[]).includes(value)) throw new AppError("VALIDATION", "Choose a valid material.");
    before.material = receipt.material;
    data.material = value;
    after.material = value;
  } else if (field === "pickerCode") {
    before.pickerCode = receipt.pickerCode;
    data.pickerCode = value;
    after.pickerCode = value;
  } else {
    before.weighedOn = receipt.weighedOn;
    data.weighedOn = value;
    after.weighedOn = value;
  }

  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({ where: { id: receipt.id }, data });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "DEMO_TAMPER", entityType: "Receipt", entityId: receipt.id, summary: `Tampered ${field} on ${receiptId}.`, before, after });
  });
}

export async function restoreReceipt(user: SessionUser, receiptId: string): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) throw new AppError("NOT_FOUND", "Receipt not found.");
  const lastTamper = await prisma.auditLog.findFirst({ where: { entityType: "Receipt", entityId: receipt.id, action: "DEMO_TAMPER" }, orderBy: { at: "desc" } });
  if (!lastTamper || !lastTamper.before) throw new AppError("CONFLICT", "No tamper to restore.");

  const before = JSON.parse(lastTamper.before) as Record<string, unknown>;
  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({ where: { id: receipt.id }, data: before });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "DEMO_RESTORE", entityType: "Receipt", entityId: receipt.id, summary: `Restored ${receiptId} from tamper.` });
  });
}

export async function resetDemoData(user: SessionUser): Promise<void> {
  await prisma.$transaction([
    prisma.smsMessage.deleteMany(),
    prisma.ussdSession.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.anchor.deleteMany(),
    prisma.receipt.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.organization.updateMany({ data: { receiptSeq: 0 } }),
  ]);
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "DEMO_RESET", entityType: "System", entityId: "demo", summary: "Demo data reset." });
}

/** Creates ~30 weigh-ins over the last 7 days and anchors them with the Hardhat practice keys. */
export async function seedWeek(): Promise<{ created: number }> {
  if (!demoSigningAvailable()) throw new AppError("CONFLICT", "Demo signing isn't available (local Hardhat chain only).");
  const centreOrg = await prisma.organization.findFirst({ where: { type: "CENTRE", users: { some: {} } } });
  const centreUser = centreOrg ? await prisma.user.findFirst({ where: { organizationId: centreOrg.id, role: "CENTRE_OPERATOR" } }) : null;
  const pickers = centreOrg ? await prisma.picker.findMany({ where: { registeredByOrgId: centreOrg.id, status: "ACTIVE" }, take: 5 }) : [];
  if (!centreOrg || !centreUser || pickers.length === 0) throw new AppError("CONFLICT", "Seed data (centre + pickers) isn't present yet. Run db:seed first.");

  // Hardhat automines instantly, but ethers' automatic "pending" nonce lookup can still
  // race when a wallet sends many transactions back to back; track the nonce ourselves
  // instead of trusting a fresh getNonce("pending") call before every send.
  let nonce = await getDemoSigners().centre.getNonce("pending");

  let created = 0;
  for (let day = 0; day < 7; day++) {
    for (let i = 0; i < 4; i++) {
      const picker = pickers[(day * 4 + i) % pickers.length];
      const material = MATERIALS[(day + i) % MATERIALS.length];
      const weighedOn = new Date(Date.now() - day * 86_400_000).toISOString().slice(0, 10);
      try {
        const sent = await createAndAnchorOne(centreOrg.id, centreOrg.code, centreUser.id, picker, material, weighedOn, nonce);
        if (sent) {
          nonce++;
          created++;
        }
      } catch (err) {
        // A revert during gas estimation (e.g. a stale receipt ID) happens before the
        // transaction is broadcast, so the nonce was never consumed — don't advance it.
        logger.warn({ err, day, i }, "seed-week: skipped one weigh-in");
      }
    }
  }
  return { created };
}

async function createAndAnchorOne(organizationId: string, centreCode: string, createdByUserId: string, picker: { id: string; code: string }, material: string, weighedOn: string, nonce: number): Promise<boolean> {
  const price = await prisma.price.findFirst({ where: { organizationId, material, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: "desc" } });
  if (!price) return false;
  const weightGrams = 5_000 + Math.floor(Math.random() * 45_000);
  const payoutCents = payoutCentsFor(weightGrams, price.pricePerKgCents);

  const receipt = await prisma.$transaction(async (tx) => {
    const receiptId = await nextReceiptId(tx, organizationId, centreCode);
    const salt = randomSalt();
    const recordText = buildRecordText({ receiptId, pickerCode: picker.code, material, weightGrams, weighedOn, photoCid: null, salt });
    const dataHash = hashRecordText(recordText);
    return tx.receipt.create({
      data: { receiptId, organizationId, pickerId: picker.id, pickerCode: picker.code, material, weightGrams, weighedOn, salt, dataHash, pricePerKgCents: price.pricePerKgCents, payoutCents, status: "DRAFT", createdByUserId },
    });
  });

  const centreContract = demoContractAs("centre");
  const tx = await centreContract.recordReceipt(receipt.receiptId, receipt.dataHash, { nonce });
  await tx.wait();
  // Don't also create the Anchor row / call applyAnchorConfirmed here: the background
  // indexer (BACKEND_SPEC.md section 13.4) independently picks up this same
  // ReceiptRecorded event within one poll interval and confirms it exactly as it would
  // for a browser-reported transaction. Doing both races the same DB rows from two
  // places at once; letting the indexer be the single confirmer avoids that.
  return true;
}

export async function reanchorAll(): Promise<{ reapproved: number; reanchored: number }> {
  if (!demoSigningAvailable()) throw new AppError("CONFLICT", "Demo signing isn't available (local Hardhat chain only).");
  const signers = getDemoSigners();
  const adminContract = demoContractAs("admin");

  let adminNonce = await signers.admin.getNonce("pending");
  let reapproved = 0;
  for (const [role, wallet] of [["centre", signers.centre] as const, ["brandA", signers.brandA] as const, ["brandB", signers.brandB] as const]) {
    const fn = role === "centre" ? adminContract.addBuyingCentre : adminContract.addBrand;
    const tx = await fn(wallet.address, { nonce: adminNonce });
    await tx.wait();
    adminNonce++;
    reapproved++;
  }
  await prisma.user.updateMany({ data: { onChainApproved: false } });
  await prisma.user.updateMany({ where: { walletAddress: { in: [signers.centre.address.toLowerCase(), signers.brandA.address.toLowerCase(), signers.brandB.address.toLowerCase()] } }, data: { onChainApproved: true, onChainCheckedAt: new Date() } });
  await prisma.user.updateMany({ where: { walletAddress: signers.admin.address.toLowerCase() }, data: { onChainApproved: true, onChainCheckedAt: new Date() } });

  const pending = await prisma.receipt.findMany({ where: { status: "NEEDS_REANCHOR" } });
  const centreContract = demoContractAs("centre");
  let centreNonce = await signers.centre.getNonce("pending");
  let reanchored = 0;
  for (const receipt of pending) {
    try {
      const tx = await centreContract.recordReceipt(receipt.receiptId, receipt.dataHash, { nonce: centreNonce });
      await tx.wait();
      // As in createAndAnchorOne above: let the indexer confirm it, rather than also
      // writing the Anchor row and calling applyAnchorConfirmed from here too.
      centreNonce++;
      reanchored++;
    } catch {
      // leave as NEEDS_REANCHOR; visible in admin for manual retry
    }
  }
  return { reapproved, reanchored };
}

export { listAllActivePickersWithPhone as listDemoPickers } from "../pickers/service.js";
