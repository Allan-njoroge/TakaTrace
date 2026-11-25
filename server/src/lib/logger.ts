import { createRequire } from "node:module";
import pino from "pino";
import { config } from "../config.js";
import { maskPhone } from "./phone.js";

const require = createRequire(import.meta.url);

function hasPinoPretty(): boolean {
  try {
    require.resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
}

function maskPhonesDeep<T>(value: T): T {
  if (typeof value === "string") {
    return (/^\+254\d{9}$/.test(value) ? maskPhone(value) : value) as T;
  }
  if (Array.isArray(value)) return value.map(maskPhonesDeep) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "phone" || k === "idNumber" || k === "password" || k === "signature") {
        out[k] = "[redacted]";
      } else {
        out[k] = maskPhonesDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  transport:
    config.NODE_ENV !== "production" && hasPinoPretty()
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  serializers: {
    req: (req) => maskPhonesDeep({ method: req.method, url: req.url, id: req.id }),
    body: maskPhonesDeep,
  },
});
