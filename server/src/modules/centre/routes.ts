import { Router } from "express";
import { z } from "zod";
import { nairobiToday } from "../../lib/time.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { getCentreSummary } from "./service.js";

export const centreRouter = Router();

centreRouter.get("/summary", requireRole("CENTRE_OPERATOR"), validate({ query: z.object({ date: z.string().optional() }) }), async (req, res) => {
  const date = (req.query as { date?: string }).date ?? nairobiToday();
  res.json(await getCentreSummary(req.user!, date));
});
