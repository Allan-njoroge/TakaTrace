import { Contract, JsonRpcProvider, type InterfaceAbi } from "ethers";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { loadContractInfo, watchContractInfo, type ContractInfo } from "./contractInfo.js";

export const provider = new JsonRpcProvider(config.RPC_URL, config.CHAIN_ID, { staticNetwork: true });

export const chainStatus: { contractDeployed: boolean; contractAddress: string | null } = {
  contractDeployed: false,
  contractAddress: null,
};

let contractInfo: ContractInfo | null = null;
let contract: Contract | null = null;

export type ResetListener = () => void;
const resetListeners: ResetListener[] = [];

/** Called by reset.ts whenever contract.json changes, so the indexer re-checks for a reset. */
export function onContractInfoChanged(listener: ResetListener): void {
  resetListeners.push(listener);
}

async function applyContractInfo(info: ContractInfo | null): Promise<void> {
  contractInfo = info;
  if (!info) {
    contract = null;
    chainStatus.contractDeployed = false;
    chainStatus.contractAddress = null;
    return;
  }
  contract = new Contract(info.address, info.abi as InterfaceAbi, provider);
  chainStatus.contractAddress = info.address;
  try {
    const code = await provider.getCode(info.address);
    chainStatus.contractDeployed = code !== "0x";
  } catch (err) {
    logger.warn({ err }, "could not check contract code; assuming not deployed");
    chainStatus.contractDeployed = false;
  }
  for (const listener of resetListeners) listener();
}

export async function initChain(): Promise<void> {
  await applyContractInfo(await loadContractInfo());
  watchContractInfo((info) => {
    void applyContractInfo(info);
  });
}

export function getContract(): Contract {
  if (!contract) throw new Error("Contract not loaded yet");
  return contract;
}

export function getContractInfo(): ContractInfo | null {
  return contractInfo;
}

export function requireContractDeployed(): Contract {
  if (!contract || !chainStatus.contractDeployed) {
    throw new AppError("CHAIN_UNAVAILABLE", "The smart contract isn't deployed. Run the deploy script.");
  }
  return contract;
}
