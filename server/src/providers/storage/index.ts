import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { ipfsLocalStorage } from "./ipfsLocal.js";
import { pinataStorage } from "./pinata.js";
import type { StorageProvider } from "./StorageProvider.js";

const noneStorage: StorageProvider = {
  name: "NONE",
  async put() {
    throw new AppError("PROVIDER_ERROR", "Photo storage is disabled (STORAGE_PROVIDER=none).");
  },
  async *get() {
    throw new AppError("NOT_FOUND", "Photo storage is disabled.");
  },
};

export const storage: StorageProvider =
  config.STORAGE_PROVIDER === "ipfs-local" ? ipfsLocalStorage : config.STORAGE_PROVIDER === "pinata" ? pinataStorage : noneStorage;

export type { StorageProvider } from "./StorageProvider.js";
