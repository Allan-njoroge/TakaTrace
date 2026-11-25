/** cents -> "1250.00" style KES string. */
export function centsToKes(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const hundredths = abs % 100;
  return `${negative ? "-" : ""}${whole}.${String(hundredths).padStart(2, "0")}`;
}

/** "25.00" style KES string -> integer cents. Accepts up to 2 decimals, 0.01-1000.00. */
export function kesStringToCents(input: string): number {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(input)) {
    throw new Error("Price must be a KES amount like 25 or 25.50");
  }
  const [whole, frac = ""] = input.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** grams at a given KES-per-kg price (in cents) -> payout in cents, rounded to the nearest cent. */
export function payoutCentsFor(weightGrams: number, pricePerKgCents: number): number {
  return Math.round((weightGrams * pricePerKgCents) / 1000);
}

/** M-Pesa B2C pays whole shillings; returns the rounded amount and the leftover (can be negative). */
export function roundToWholeShillings(amountCents: number): { amountKes: number; roundingDiffCents: number } {
  const amountKes = Math.round(amountCents / 100);
  return { amountKes, roundingDiffCents: amountCents - amountKes * 100 };
}
