import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { verifyRateLimit } from "../../middleware/rateLimits.js";
import { validate } from "../../middleware/validate.js";
import { verifyReceipt, verifyRecordText } from "./service.js";

export const verifyRouter = Router();

verifyRouter.get("/:receiptId", verifyRateLimit, async (req, res) => {
  const result = await verifyReceipt((req.params.receiptId as string));
  if (!result) throw new AppError("NOT_FOUND", "Receipt not found.");
  res.json(result);
});

verifyRouter.post("/text", verifyRateLimit, validate({ body: z.object({ recordText: z.string().min(1) }) }), async (req, res) => {
  const { recordText } = req.body as { recordText: string };
  const result = await verifyRecordText(recordText);
  if (result.verdict === "NOT_FOUND") throw new AppError("NOT_FOUND", "That record text doesn't match any receipt.");
  res.json(result);
});
