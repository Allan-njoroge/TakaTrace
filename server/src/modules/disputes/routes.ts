import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { getDisputeDetail, listDisputes, openDispute, resolveDispute, reviewDispute } from "./service.js";

export const disputesRouter = Router();
disputesRouter.use(requireRole("CENTRE_OPERATOR", "ADMIN"));

disputesRouter.get("/", validate({ query: z.object({ status: z.string().optional() }) }), async (req, res) => {
  res.json({ items: await listDisputes(req.user!, (req.query as { status?: string }).status), nextCursor: null });
});

disputesRouter.get("/:id", async (req, res) => res.json(await getDisputeDetail(req.user!, (req.params.id as string))));

disputesRouter.post(
  "/",
  validate({ body: z.object({ receiptId: z.string().min(1), reason: z.enum(["WRONG_WEIGHT", "WRONG_MATERIAL", "NOT_PAID", "OTHER"]), message: z.string().optional() }) }),
  async (req, res) => {
    const { receiptId, reason, message } = req.body as { receiptId: string; reason: "WRONG_WEIGHT" | "WRONG_MATERIAL" | "NOT_PAID" | "OTHER"; message?: string };
    const opened = await openDispute({ receiptId, reason, message, openedBy: req.user!.role === "ADMIN" ? "ADMIN" : "CENTRE" });
    res.status(201).json(await getDisputeDetail(req.user!, opened.reference));
  }
);

disputesRouter.post("/:id/review", async (req, res) => {
  await reviewDispute(req.user!, (req.params.id as string));
  res.status(204).end();
});

disputesRouter.post(
  "/:id/resolve",
  validate({
    body: z.object({
      outcome: z.enum(["REJECTED", "UPHELD"]),
      note: z.string().min(1),
      correctedMaterial: z.string().optional(),
      correctedWeightKg: z.coerce.number().optional(),
      idempotencyKey: z.string().optional(),
    }),
  }),
  async (req, res) => {
    res.json(await resolveDispute(req.user!, (req.params.id as string), req.body));
  }
);
