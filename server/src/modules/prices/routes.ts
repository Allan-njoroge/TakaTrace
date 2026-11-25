import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { getCurrentPrices, setPrices } from "./service.js";

export const pricesRouter = Router();
pricesRouter.use(requireRole("CENTRE_OPERATOR", "ADMIN"));

pricesRouter.get("/", validate({ query: z.object({ history: z.coerce.boolean().optional(), organizationId: z.string().optional() }) }), async (req, res) => {
  const { history, organizationId } = req.query as { history?: boolean; organizationId?: string };
  res.json(await getCurrentPrices(req.user!, organizationId, Boolean(history)));
});

pricesRouter.put(
  "/",
  validate({
    body: z.object({
      organizationId: z.string().optional(),
      prices: z.array(z.object({ material: z.string(), pricePerKgKes: z.coerce.string(), effectiveFrom: z.string().optional() })),
    }),
  }),
  async (req, res) => {
    const { organizationId, prices } = req.body as { organizationId?: string; prices: Parameters<typeof setPrices>[2] };
    await setPrices(req.user!, organizationId, prices);
    res.status(204).end();
  }
);
