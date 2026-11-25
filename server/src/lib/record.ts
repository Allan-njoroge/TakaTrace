import { id as keccakUtf8 } from "ethers";
import { AppError } from "./errors.js";

export const RECORD_VERSION = "v1";

export const MATERIALS = ["PET", "HDPE", "LDPE", "PP", "PS", "OTHER"] as const;
export type Material = (typeof MATERIALS)[number];

/**
 * Converts a weight like "50" or "50.25" (kg, up to 2 decimals) into whole grams,
 * using string arithmetic so there is never a floating-point rounding error.
 */
export function kgStringToGrams(input: string): number {
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(input)) {
    throw new AppError("VALIDATION", "Weight must be like 50 or 50.25", { weightKg: "Weight must be like 50 or 50.25" });
  }
  const [whole, frac = ""] = input.split(".");
  return Number(whole) * 1000 + Number(frac.padEnd(2, "0")) * 10; // 10 g resolution
}

/** Whole grams -> "50.00" style kg string. */
export function gramsToKgString(grams: number): string {
  const whole = Math.floor(grams / 1000);
  const hundredths = Math.floor((grams % 1000) / 10);
  return `${whole}.${String(hundredths).padStart(2, "0")}`;
}

export interface RecordFields {
  receiptId: string;
  pickerCode: string;
  material: string;
  weightGrams: number;
  weighedOn: string;
  photoCid: string | null;
  salt: string;
}

/**
 * Builds the exact text that gets hashed and anchored on-chain. This is the single
 * source of truth for the format (BACKEND_SPEC.md section 6) — never duplicate this
 * logic elsewhere; always call this function when creating, verifying, or scanning
 * a receipt's integrity.
 */
export function buildRecordText(r: RecordFields): string {
  const parts = [
    RECORD_VERSION,
    r.receiptId,
    r.pickerCode,
    r.material,
    gramsToKgString(r.weightGrams),
    r.weighedOn,
    r.photoCid ?? "-",
    r.salt,
  ];
  for (const p of parts) {
    if (p.includes("|")) {
      throw new AppError("VALIDATION", "A receipt field cannot contain the '|' character.");
    }
  }
  return parts.join("|");
}

/** keccak256(UTF-8 bytes) — identical to the contract's keccak256(bytes(text)). */
export const hashRecordText = (text: string): string => keccakUtf8(text);
