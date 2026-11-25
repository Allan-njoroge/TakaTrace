import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface ContractInfo {
  address: string;
  chainId: number;
  abi: unknown[];
  deployedAt: string;
}

const path = resolve(config.CONTRACT_INFO_PATH);

export async function loadContractInfo(): Promise<ContractInfo | null> {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text) as ContractInfo;
  } catch {
    return null;
  }
}

/** Watches contract.json (debounced) and calls onChange whenever it is rewritten by the deploy script. */
export function watchContractInfo(onChange: (info: ContractInfo | null) => void): () => void {
  let timer: NodeJS.Timeout | undefined;
  let watcher: ReturnType<typeof watch> | undefined;
  try {
    watcher = watch(path, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadContractInfo()
          .then(onChange)
          .catch((err) => logger.error({ err }, "failed to reload contract.json"));
      }, 500);
    });
  } catch (err) {
    logger.warn({ err, path }, "contract.json not found yet; will not auto-reload until it exists");
  }
  return () => {
    clearTimeout(timer);
    watcher?.close();
  };
}
