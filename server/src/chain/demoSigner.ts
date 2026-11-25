import { Wallet, type Contract } from "ethers";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getContract, provider } from "./provider.js";

export interface DemoSigners {
  admin: Wallet;
  centre: Wallet;
  brandA: Wallet;
  brandB: Wallet;
}

let signers: DemoSigners | null = null;

/**
 * Only available when DEMO_MODE=true, CHAIN_ID=31337, and DEMO_SIGNER_KEYS is set.
 * These are Hardhat's published practice keys; demo signing is refused on any other
 * chain so a misconfigured deployment can never sign with them for real.
 */
export function initDemoSigner(): void {
  if (!config.DEMO_MODE) return;
  if (config.CHAIN_ID !== 31337) {
    if (config.DEMO_SIGNER_KEYS) {
      logger.error("DEMO_SIGNER_KEYS is set but CHAIN_ID is not 31337 (local Hardhat). Demo signing disabled.");
    }
    return;
  }
  const keys = config.DEMO_SIGNER_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length < 4) return;

  const [adminKey, centreKey, brandAKey, brandBKey] = keys;
  signers = {
    admin: new Wallet(adminKey, provider),
    centre: new Wallet(centreKey, provider),
    brandA: new Wallet(brandAKey, provider),
    brandB: new Wallet(brandBKey, provider),
  };
  logger.info("Demo signer enabled (local Hardhat chain only).");
}

export function getDemoSigners(): DemoSigners {
  if (!signers) throw new Error("Demo signing is not enabled (needs DEMO_MODE=true, CHAIN_ID=31337, DEMO_SIGNER_KEYS).");
  return signers;
}

export function demoSigningAvailable(): boolean {
  return signers !== null;
}

export function demoContractAs(role: keyof DemoSigners): Contract {
  return getContract().connect(getDemoSigners()[role]) as Contract;
}
