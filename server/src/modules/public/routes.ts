import { Router } from "express";
import { z } from "zod";
import { contactRateLimit } from "../../middleware/rateLimits.js";
import { validate } from "../../middleware/validate.js";
import { getContractInfoPublic, getMaterialsBreakdown, getPartners, getPublicActivity, getPublicStats, submitContact, subscribeNewsletter } from "./service.js";

export const publicRouter = Router();

publicRouter.get("/stats", async (_req, res) => res.json(await getPublicStats()));
publicRouter.get("/materials", async (_req, res) => res.json(await getMaterialsBreakdown()));
publicRouter.get("/partners", async (_req, res) => res.json(await getPartners()));
publicRouter.get("/activity", async (_req, res) => res.json(await getPublicActivity()));
publicRouter.get("/contract", async (_req, res) => res.json(await getContractInfoPublic()));

publicRouter.post("/newsletter", validate({ body: z.object({ email: z.email() }) }), async (req, res) => {
  await subscribeNewsletter((req.body as { email: string }).email);
  res.status(201).end();
});

publicRouter.post(
  "/contact",
  contactRateLimit,
  validate({
    body: z.object({
      name: z.string().min(1).max(200),
      email: z.email(),
      organization: z.string().max(200).optional(),
      topic: z.enum(["GENERAL", "REPORT_RECEIPT", "JOIN_CENTRE", "JOIN_BRAND"]),
      message: z.string().min(1).max(4000),
      receiptId: z.string().optional(),
    }),
  }),
  async (req, res) => {
    await submitContact({ ...(req.body as object as Parameters<typeof submitContact>[0]), ip: req.ip });
    res.status(201).end();
  }
);
