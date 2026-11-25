import { AppError } from "./errors.js";

/**
 * Normalises a Kenyan mobile number to E.164 (+2547xxxxxxxx or +2541xxxxxxxx).
 * Accepts 07xx, 01xx, 2547xx, 2541xx, +2547xx, +2541xx. Rejects anything else
 * (landlines, foreign numbers, malformed input).
 */
export function normalizeKenyanPhone(input: string): string {
  const digits = input.trim().replace(/[\s-]/g, "");
  let national: string | null = null;

  if (/^0(7|1)\d{8}$/.test(digits)) {
    national = digits.slice(1);
  } else if (/^254(7|1)\d{8}$/.test(digits)) {
    national = digits.slice(3);
  } else if (/^\+254(7|1)\d{8}$/.test(digits)) {
    national = digits.slice(4);
  }

  if (!national) {
    throw new AppError("VALIDATION", "Enter a valid Kenyan mobile number, e.g. 0712345678.", {
      phone: "Enter a valid Kenyan mobile number, e.g. 0712345678.",
    });
  }
  return `+254${national}`;
}

/** "+254712345678" -> "+2547***345678" for logs, audit entries and display. */
export function maskPhone(e164: string): string {
  if (!/^\+254\d{9}$/.test(e164)) return "***";
  return `${e164.slice(0, 7)}***${e164.slice(10)}`;
}
