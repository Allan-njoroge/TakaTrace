import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import type { StorageProvider } from "./StorageProvider.js";

const PINATA_API = "https://uploads.pinata.cloud/v3/files";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export const pinataStorage: StorageProvider = {
  name: "PINATA",
  async put(bytes) {
    const form = new FormData();
    form.append("file", new Blob([bytes as BlobPart]), "photo.jpg");
    form.append("network", "public");

    const res = await fetch(PINATA_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.PINATA_JWT}` },
      body: form,
    });
    if (!res.ok) throw new AppError("PROVIDER_ERROR", "Pinata upload failed. Check PINATA_JWT and try again.");
    const body = (await res.json()) as { data: { cid: string } };
    return body.data.cid;
  },
  async *get(cid) {
    const res = await fetch(`${PINATA_GATEWAY}/${cid}`);
    if (!res.ok || !res.body) throw new AppError("PROVIDER_ERROR", "Could not fetch the photo from Pinata.");
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) yield chunk;
  },
};
