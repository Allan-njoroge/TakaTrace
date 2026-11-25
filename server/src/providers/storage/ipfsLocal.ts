import { create } from "kubo-rpc-client";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import type { StorageProvider } from "./StorageProvider.js";

const ipfs = create({ url: config.IPFS_API_URL });

export const ipfsLocalStorage: StorageProvider = {
  name: "IPFS_LOCAL",
  async put(bytes) {
    try {
      const { cid } = await ipfs.add(bytes, { cidVersion: 1, pin: true });
      return cid.toString();
    } catch {
      throw new AppError("PROVIDER_ERROR", "Photo storage isn't running. Start IPFS Desktop and try again.");
    }
  },
  async *get(cid) {
    try {
      yield* ipfs.cat(cid);
    } catch {
      throw new AppError("PROVIDER_ERROR", "Photo storage isn't running. Start IPFS Desktop and try again.");
    }
  },
};
