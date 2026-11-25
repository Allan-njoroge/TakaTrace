import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { listPayouts, resolveUnknownPayout, retryPayout } from "./service.js";

export const payoutsRouter = Router();
payoutsRouter.use(requireRole("CENTRE_OPERATOR", "ADMIN"));

payoutsRouter.get("/", validate({ query: z.object({ status: z.string().optional(), from: z.string().optional(), to: z.string().optional() }) }), async (req, res) => {
  const filters = req.query as { status?: string; from?: string; to?: string };
  res.json(await listPayouts({ ...filters, organizationId: req.user!.role === "ADMIN" ? undefined : (req.user!.organizationId ?? undefined) }));
});

payoutsRouter.post("/:id/retry", async (req, res) => {
  await retryPayout((req.params.id as string));
  res.status(204).end();
});

payoutsRouter.post(
  "/:id/resolve-unknown",
  requireRole("ADMIN"),
  validate({ body: z.object({ outcome: z.enum(["PAID", "FAILED"]), mpesaTransactionId: z.string().optional(), note: z.string().min(1) }) }),
  async (req, res) => {
    const { outcome, mpesaTransactionId, note } = req.body as { outcome: "PAID" | "FAILED"; mpesaTransactionId?: string; note: string };
    await resolveUnknownPayout((req.params.id as string), outcome, mpesaTransactionId, note);
    res.status(204).end();
  }
);
