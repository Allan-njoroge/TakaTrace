import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** 32 lowercase hex characters (16 random bytes) — the per-receipt record salt. */
export function randomSalt(): string {
  return randomBytes(16).toString("hex");
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Constant-time string comparison, for webhook tokens and similar secrets. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const ID_ENCRYPTION_KEY = Buffer.from(config.ID_ENCRYPTION_KEY, "base64");

/** Encrypts a picker's ID number for storage. Returns "iv.ciphertext.tag", all base64. */
export function encryptIdNumber(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ID_ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(".");
}

export function decryptIdNumber(stored: string): string {
  const [ivB64, ciphertextB64, tagB64] = stored.split(".");
  if (!ivB64 || !ciphertextB64 || !tagB64) throw new Error("Malformed encrypted ID number");
  const decipher = createDecipheriv("aes-256-gcm", ID_ENCRYPTION_KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
