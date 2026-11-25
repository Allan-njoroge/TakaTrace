import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { getBrandSummary, listAvailableCredits, listClaims, recordClaim } from "../claims/service.js";
import { eprReportToCsv, generateEprReport } from "../reports/service.js";

export const brandRouter = Router();

brandRouter.get("/summary", requireRole("BRAND_OFFICER"), validate({ query: z.object({ year: z.coerce.number().int() }) }), async (req, res) => {
  res.json(await getBrandSummary(req.user!, (req.query as unknown as { year: number }).year));
});

export const creditsRouter = Router();
creditsRouter.get(
  "/available",
  requireRole("BRAND_OFFICER", "ADMIN"),
  validate({ query: z.object({ material: z.string().optional(), county: z.string().optional(), centreCode: z.string().optional(), from: z.string().optional(), to: z.string().optional(), minKg: z.coerce.number().optional(), sort: z.enum(["oldest", "largest"]).optional() }) }),
  async (req, res) => {
    res.json(await listAvailableCredits(req.query as object));
  }
);

export const claimsRouter = Router();
claimsRouter.post(
  "/",
  requireRole("BRAND_OFFICER"),
  validate({ body: z.object({ receiptId: z.string().min(1), txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), complianceYear: z.number().int(), productLine: z.string().optional() }) }),
  async (req, res) => {
    res.status(201).json(await recordClaim(req.user!, req.body));
  }
);
claimsRouter.get("/", requireRole("BRAND_OFFICER", "ADMIN"), validate({ query: z.object({ year: z.coerce.number().int().optional(), material: z.string().optional() }) }), async (req, res) => {
  res.json({ items: await listClaims(req.user!, req.query as object), nextCursor: null });
});

export const reportsRouter = Router();
reportsRouter.get("/epr", requireRole("BRAND_OFFICER", "ADMIN"), validate({ query: z.object({ year: z.coerce.number().int(), format: z.enum(["csv", "json"]).optional() }) }), async (req, res) => {
  const { year, format } = req.query as unknown as { year: number; format?: "csv" | "json" };
  const report = await generateEprReport(req.user!, year);
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=epr-${year}.csv`);
    res.send(eprReportToCsv(report));
    return;
  }
  const { detailedRows: _detailedRows, detailedMismatches: _detailedMismatches, ...jsonReport } = report;
  res.json(jsonReport);
});
