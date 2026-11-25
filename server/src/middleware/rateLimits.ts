import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

function jsonLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
  });
}

export const authRateLimit = jsonLimiter(10 * 60 * 1000, 20, "Too many sign-in attempts. Try again in a few minutes.");

export const verifyRateLimit = jsonLimiter(60 * 1000, 60, "Too many verification requests. Try again shortly.");

export const contactRateLimit = jsonLimiter(10 * 60 * 1000, 5, "Too many submissions. Try again later.");

export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "anonymous"),
  message: { error: { code: "RATE_LIMITED", message: "Too many uploads. Try again shortly." } },
});

export const webhookRateLimit = jsonLimiter(60 * 1000, 300, "Too many requests.");
