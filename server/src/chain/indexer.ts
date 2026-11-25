import type { Log, LogDescription } from "ethers";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { writeAudit } from "../lib/audit.js";
import { emitEvent } from "../lib/events.js";
import { logger } from "../lib/logger.js";
import { applyAnchorConfirmed } from "../modules/receipts/service.js";
import { chainStatus, getContract, provider } from "./provider.js";
import { checkChainReset } from "./reset.js";
import { clearRoleCache } from "./roles.js";
import { config } from "../config.js";

let backoffMs = 0;
const blockTimestampCache = new Map<number, number>();

async function blockTimestamp(blockNumber: number): Promise<number> {
  const cached = blockTimestampCache.get(blockNumber);
  if (cached) return cached;
  const block = await provider.getBlock(blockNumber);
  const ts = block?.timestamp ?? Math.floor(Date.now() / 1000);
  blockTimestampCache.set(blockNumber, ts);
  return ts;
}

export async function runIndexerTick(): Promise<void> {
  try {
    await checkChainReset();
    if (!chainStatus.contractDeployed || !chainStatus.contractAddress) return;

    const state = await prisma.chainState.findUnique({ where: { id: 1 } });
    if (!state) return; // created by checkChainReset() on first run

    const latest = await provider.getBlockNumber();
    const from = state.lastProcessedBlock + 1;
    const to = Math.min(latest, from + config.INDEXER_BLOCK_BATCH - 1);
    if (from > latest) {
      if (state.lastError) await prisma.chainState.update({ where: { id: 1 }, data: { lastError: null } });
      backoffMs = 0;
      return;
    }

    const logs = await provider.getLogs({ address: chainStatus.contractAddress, fromBlock: from, toBlock: to });
    logs.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.index - b.index));

    const contract = getContract();
    for (const log of logs) {
      let parsed: LogDescription | null;
      try {
        parsed = contract.interface.parseLog(log);
      } catch {
        continue;
      }
      if (!parsed) continue;
      await applyEvent(log, parsed, state.epoch);
    }

    await prisma.chainState.update({ where: { id: 1 }, data: { lastProcessedBlock: to, lastError: null } });
    backoffMs = 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "indexer tick failed");
    await prisma.chainState.update({ where: { id: 1 }, data: { lastError: message } }).catch(() => undefined);
    emitEvent({ name: "indexer.error", data: { message }, audiences: [{ kind: "role", role: "ADMIN" }] });
    backoffMs = backoffMs === 0 ? 2000 : Math.min(backoffMs * 2, 30_000);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}

async function applyEvent(log: Log, parsed: LogDescription, epoch: number): Promise<void> {
  const chainEventKey = { chainId: config.CHAIN_ID, epoch, txHash: log.transactionHash, logIndex: log.index };
  const already = await prisma.chainEvent.findUnique({ where: { chainId_epoch_txHash_logIndex: chainEventKey } });
  if (already) return; // already processed; reprocessing is harmless but skip the work

  // Run the effect FIRST and record the ChainEvent marker only once it succeeds. If the
  // marker were written up front and the effect then failed partway (a transaction
  // timeout under load, say), the next tick's dedup check above would see the marker
  // and skip retrying the one thing that never actually happened.
  switch (parsed.name) {
    case "ReceiptRecorded":
      await onReceiptRecorded(parsed.args.receiptId, parsed.args.dataHash, parsed.args.centre, log);
      break;
    case "CreditClaimed":
      await onCreditClaimed(parsed.args.receiptId, parsed.args.brand, log, epoch);
      break;
    case "DisputeFlagChanged":
      await onDisputeFlagChanged(parsed.args.receiptId, parsed.args.disputed, log);
      break;
    case "BuyingCentreAdded":
    case "BrandAdded":
      await onRoleAdded(parsed.args.centre ?? parsed.args.brand);
      break;
    case "BuyingCentreRemoved":
    case "BrandRemoved":
      await onRoleRemoved(parsed.args.centre ?? parsed.args.brand);
      break;
    default:
      break;
  }

  try {
    await prisma.chainEvent.create({
      data: { ...chainEventKey, blockNumber: log.blockNumber, name: parsed.name, args: JSON.stringify(parsed.args.toObject?.() ?? {}) },
    });
  } catch (err) {
    // Another concurrent run (e.g. two server instances briefly overlapping during a
    // restart) processed this exact event and wrote the marker first — the effect
    // above is itself idempotent (status-guarded), so this is harmless either way.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}

async function onReceiptRecorded(receiptId: string, dataHash: string, centre: string, log: Log): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) {
    await writeAudit(prisma, { actorType: "CHAIN", action: "ORPHAN_RECEIPT_EVENT", entityType: "Receipt", entityId: receiptId, summary: `ReceiptRecorded for an unknown receipt ID (tx ${log.transactionHash}).` });
    return;
  }
  if (dataHash.toLowerCase() !== receipt.dataHash.toLowerCase()) {
    await prisma.receipt.update({ where: { id: receipt.id }, data: { integrity: "MISMATCH", integrityCheckedAt: new Date() } });
    await writeAudit(prisma, { actorType: "CHAIN", action: "ANCHOR_HASH_MISMATCH", entityType: "Receipt", entityId: receipt.id, summary: `On-chain hash does not match the stored record for ${receiptId}.` });
    emitEvent({ name: "integrity.mismatch", data: { receiptId }, audiences: [{ kind: "role", role: "ADMIN" }] });
    return;
  }

  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  const epoch = state?.epoch ?? 1;
  const existingAnchor = await prisma.anchor.findFirst({ where: { receiptRef: receipt.id, txHash: log.transactionHash } });
  if (existingAnchor) {
    await prisma.anchor.update({ where: { id: existingAnchor.id }, data: { status: "CONFIRMED", blockNumber: log.blockNumber, confirmedAt: new Date() } });
  } else {
    await prisma.anchor.create({
      data: { receiptRef: receipt.id, chainId: config.CHAIN_ID, chainEpoch: epoch, txHash: log.transactionHash, fromAddress: centre, status: "CONFIRMED", blockNumber: log.blockNumber, confirmedAt: new Date() },
    });
  }
  await applyAnchorConfirmed(receipt.id, log.blockNumber);
}

async function onCreditClaimed(receiptId: string, brand: string, log: Log, epoch: number): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) return;

  const brandUser = await prisma.user.findUnique({ where: { walletAddress: brand.toLowerCase() } });
  const brandOrgId = brandUser?.organizationId;
  if (!brandOrgId) {
    logger.warn({ receiptId, brand }, "CreditClaimed from a wallet with no known brand organisation");
    return;
  }

  const wasAvailable = receipt.status === "ANCHORED" && receipt.claimStatus === "UNCLAIMED" && !receipt.disputeFlagOnChain;
  const existing = await prisma.claim.findFirst({ where: { receiptRef: receipt.id, chainEpoch: epoch } });
  if (!existing) {
    const ts = await blockTimestamp(log.blockNumber);
    await prisma.claim.create({
      data: {
        receiptRef: receipt.id,
        brandOrgId,
        claimedByAddress: brand,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        chainEpoch: epoch,
        complianceYear: new Date(ts * 1000).getUTCFullYear(),
        claimedAt: new Date(ts * 1000),
      },
    });
  }
  await prisma.receipt.update({ where: { id: receipt.id }, data: { claimStatus: "CLAIMED" } });

  if (!wasAvailable) {
    await writeAudit(prisma, { actorType: "CHAIN", action: "CLAIM_OUTSIDE_POLICY", entityType: "Receipt", entityId: receipt.id, summary: `Claimed on-chain while outside the available-credits policy (status=${receipt.status}, disputed=${receipt.disputeFlagOnChain}).` });
  }
  emitEvent({ name: "receipt.claimed", data: { receiptId: receipt.receiptId, organizationId: receipt.organizationId }, audiences: [{ kind: "organization", organizationId: receipt.organizationId }, { kind: "role", role: "ADMIN" }, { kind: "role", role: "BRAND_OFFICER" }, { kind: "public" }] });
}

async function onDisputeFlagChanged(receiptId: string, disputed: boolean, log: Log): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { receiptId } });
  if (!receipt) return;
  await prisma.receipt.update({ where: { id: receipt.id }, data: { disputeFlagOnChain: disputed } });
  const dispute = await prisma.dispute.findFirst({ where: { receiptRef: receipt.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  if (dispute) {
    await prisma.dispute.update({ where: { id: dispute.id }, data: disputed ? { flagTxHash: log.transactionHash } : { unflagTxHash: log.transactionHash } });
  }
}

async function onRoleAdded(address: string): Promise<void> {
  clearRoleCache(address);
  await prisma.user.updateMany({ where: { walletAddress: address.toLowerCase() }, data: { onChainApproved: true, onChainCheckedAt: new Date() } });
}

async function onRoleRemoved(address: string): Promise<void> {
  clearRoleCache(address);
  const user = await prisma.user.findUnique({ where: { walletAddress: address.toLowerCase() } });
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { onChainApproved: false, onChainCheckedAt: new Date() } });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
}
