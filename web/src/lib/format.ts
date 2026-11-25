import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Africa/Nairobi";

const kgFormatter = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kesFormatter = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKg(value: number): string {
  return `${kgFormatter.format(value)} kg`;
}

export function formatKes(value: number): string {
  return `KES ${kesFormatter.format(value)}`;
}

export function formatDate(iso: string): string {
  return formatInTimeZone(new Date(iso), TIMEZONE, "d MMM yyyy");
}

export function formatDateTime(iso: string): string {
  return `${formatInTimeZone(new Date(iso), TIMEZONE, "d MMM yyyy, HH:mm")} EAT`;
}

/** +254712345678 -> +254 7•• ••• 678 (mask all but the network prefix digit and last 3 digits) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  const match = digits.match(/^(\+254\d)\d{5}(\d{3})$/);
  if (!match) return phone;
  const [, prefix, last3] = match;
  return `${prefix.slice(0, 4)} ${prefix.slice(4)}•• ••• ${last3}`;
}

/** 0x9f2c41ab...e81d03 */
export function shortHash(value: string, lead = 10, trail = 6): string {
  if (value.length <= lead + trail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-trail)}`;
}

export function shortAddress(value: string): string {
  return shortHash(value, 6, 4);
}
