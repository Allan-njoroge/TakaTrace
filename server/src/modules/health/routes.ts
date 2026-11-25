import { Router } from "express";
import { chainStatus, provider } from "../../chain/provider.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";

export const healthRouter = Router();

function providerMode(value: string): "mock" | "sandbox" {
  return value === "mock" ? "mock" : "sandbox";
}

function storageMode(value: string): "local" | "pinata" | "down" {
  if (value === "ipfs-local") return "local";
  if (value === "pinata") return "pinata";
  return "down";
}

healthRouter.get("/", async (_req, res) => {
  let latestBlock: number | null = null;
  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  try {
    latestBlock = await provider.getBlockNumber();
  } catch {
    latestBlock = null;
  }
  const indexerLagBlocks = latestBlock !== null && state ? Math.max(0, latestBlock - state.lastProcessedBlock) : null;

  res.json({
    status: chainStatus.contractDeployed ? "ok" : "degraded",
    version: "1.0.0",
    time: new Date().toISOString(),
    db: "ok",
    chain: {
      chainId: config.CHAIN_ID,
      latestBlock,
      contractAddress: chainStatus.contractAddress,
      contractDeployed: chainStatus.contractDeployed,
      epoch: String(state?.epoch ?? 1),
      chainReset: Boolean(state?.resetDetectedAt),
      indexerLagBlocks,
    },
    providers: {
      sms: providerMode(config.SMS_PROVIDER),
      ussd: providerMode(config.USSD_PROVIDER),
      payout: providerMode(config.PAYOUT_PROVIDER),
      storage: storageMode(config.STORAGE_PROVIDER),
    },
  });
});
