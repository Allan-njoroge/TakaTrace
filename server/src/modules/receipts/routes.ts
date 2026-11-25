import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  createDraftReceipt,
  discardDraftReceipt,
  getReceiptDetail,
  getReceiptTimeline,
  listReceipts,
  recordAnchorCancelled,
  reportAnchorTx,
  reportDisputeFlagTx,
} from "./service.js";

export const receiptsRouter = Router();

receiptsRouter.post(
  "/",
  requireRole("CENTRE_OPERATOR"),
  validate({
    body: z.object({
      pickerId: z.string().min(1),
      material: z.string().min(1),
      weightKg: z.coerce.string().min(1),
      weighedOn: z.string().min(1),
      photoId: z.string().optional(),
      note: z.string().max(2000).optional(),
      operatorConfirmed: z.boolean(),
    }),
  }),
  async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) throw new AppError("VALIDATION", "Idempotency-Key header is required.");
    const result = await createDraftReceipt(req.user!, idempotencyKey, req.body);
    res.status(201).json(result);
  }
);

receiptsRouter.get(
  "/",
  requireRole("CENTRE_OPERATOR", "ADMIN"),
  validate({ query: z.object({ status: z.string().optional(), displayStatus: z.string().optional(), material: z.string().optional(), pickerId: z.string().optional(), from: z.string().optional(), to: z.string().optional(), q: z.string().optional() }) }),
  async (req, res) => {
    res.json({ items: await listReceipts(req.user!, req.query as object), nextCursor: null });
  }
);

receiptsRouter.get("/export.csv", requireRole("CENTRE_OPERATOR", "ADMIN"), async (req, res) => {
  const items = await listReceipts(req.user!, req.query as object);
  const header = "receipt_id,picker_code,material,weight_kg,weighed_on,status,display_status,payout_kes\n";
  const rows = items.map((r) => [r.receiptId, r.pickerCode, r.material, r.weightKg.toFixed(2), r.weighedOn, r.status, r.displayStatus, r.payoutKes.toFixed(2)].join(","));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=receipts.csv");
  res.send(header + rows.join("\n"));
});

receiptsRouter.get("/:receiptId", requireRole("CENTRE_OPERATOR", "ADMIN"), async (req, res) => {
  res.json(await getReceiptDetail(req.user!, (req.params.receiptId as string)));
});

receiptsRouter.get("/:receiptId/timeline", requireRole("CENTRE_OPERATOR", "ADMIN"), async (req, res) => {
  res.json(await getReceiptTimeline(req.user!, (req.params.receiptId as string)));
});

receiptsRouter.post("/:receiptId/anchor", requireRole("CENTRE_OPERATOR"), validate({ body: z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }) }), async (req, res) => {
  const result = await reportAnchorTx(req.user!, (req.params.receiptId as string), (req.body as { txHash: string }).txHash);
  res.status(202).json(result);
});

receiptsRouter.post(
  "/:receiptId/anchor-cancelled",
  requireRole("CENTRE_OPERATOR"),
  validate({ body: z.object({ reason: z.enum(["USER_REJECTED", "WRONG_NETWORK", "OTHER"]) }) }),
  async (req, res) => {
    await recordAnchorCancelled(req.user!, (req.params.receiptId as string), (req.body as { reason: string }).reason);
    res.status(204).end();
  }
);

receiptsRouter.delete("/:receiptId", requireRole("CENTRE_OPERATOR"), async (req, res) => {
  await discardDraftReceipt(req.user!, (req.params.receiptId as string));
  res.status(204).end();
});

receiptsRouter.post(
  "/:receiptId/dispute-flag",
  requireRole("CENTRE_OPERATOR", "ADMIN"),
  validate({ body: z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), disputed: z.boolean() }) }),
  async (req, res) => {
    const { txHash, disputed } = req.body as { txHash: string; disputed: boolean };
    await reportDisputeFlagTx(req.user!, (req.params.receiptId as string), txHash, disputed);
    res.status(204).end();
  }
);
