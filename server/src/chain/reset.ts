import { config } from "../config.js";
import { prisma } from "../db.js";
import { writeAudit } from "../lib/audit.js";
import { emitEvent } from "../lib/events.js";
import { logger } from "../lib/logger.js";
import { chainStatus, provider } from "./provider.js";
import { clearAllRoleCache } from "./roles.js";

/**
 * Detects a local Hardhat node restart (which wipes all history) or a contract
 * redeploy (new address), and brings the database back in line with the chain
 * (BACKEND_SPEC.md section 13.5). Safe to call repeatedly; only acts on a change.
 */
export async function checkChainReset(): Promise<void> {
  if (!chainStatus.contractDeployed || !chainStatus.contractAddress) return;

  let genesisHash: string;
  let latestBlock: number;
  try {
    const genesis = await provider.getBlock(0);
    if (!genesis) return;
    genesisHash = genesis.hash ?? "";
    latestBlock = await provider.getBlockNumber();
  } catch (err) {
    logger.warn({ err }, "could not read chain state for reset check");
    return;
  }

  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  if (!state) {
    await prisma.chainState.create({
      data: {
        id: 1,
        chainId: config.CHAIN_ID,
        genesisHash,
        contractAddress: chainStatus.contractAddress,
        epoch: 1,
        lastProcessedBlock: -1,
      },
    });
    return;
  }

  const isReset =
    state.genesisHash !== genesisHash ||
    latestBlock < state.lastProcessedBlock ||
    state.contractAddress.toLowerCase() !== chainStatus.contractAddress.toLowerCase();
  if (!isReset) return;

  logger.warn("Chain reset or contract redeploy detected; marking affected rows for re-anchoring.");

  await prisma.$transaction(async (tx) => {
    const newEpoch = state.epoch + 1;
    await tx.chainState.update({
      where: { id: 1 },
      data: {
        epoch: newEpoch,
        lastProcessedBlock: -1,
        genesisHash,
        contractAddress: chainStatus.contractAddress as string,
        resetDetectedAt: new Date(),
      },
    });

    await tx.anchor.updateMany({
      where: { chainEpoch: { lt: newEpoch }, status: { in: ["SUBMITTED", "CONFIRMED"] } },
      data: { status: "STALE" },
    });
    await tx.receipt.updateMany({
      where: { status: { in: ["ANCHORED", "ANCHORING"] } },
      data: { status: "NEEDS_REANCHOR" },
    });
    await tx.claim.updateMany({ where: { chainEpoch: { lt: newEpoch } }, data: { status: "STALE" } });
    await tx.receipt.updateMany({ where: { claimStatus: "CLAIMED" }, data: { claimStatus: "UNCLAIMED" } });
    await tx.receipt.updateMany({ where: { disputeFlagOnChain: true }, data: { disputeFlagOnChain: false } });
    await tx.user.updateMany({ data: { onChainApproved: false } });

    await writeAudit(tx, {
      actorType: "CHAIN",
      action: "CHAIN_RESET_DETECTED",
      entityType: "ChainState",
      entityId: "1",
      summary: `Chain reset detected; epoch advanced to ${newEpoch}.`,
    });
  });

  clearAllRoleCache();
  emitEvent({ name: "chain.reset", data: { epoch: state.epoch + 1 }, audiences: [{ kind: "public" }] });
}
