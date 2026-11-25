import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  addOrgUser,
  createOrganization,
  getAdminOverview,
  getChainAdminInfo,
  getIntegrations,
  getOrganization,
  listAudit,
  listOrganizations,
  listUsers,
  resyncChain,
  roleCheck,
  roleSyncFromTx,
  runIntegrityScan,
  setEprTargets,
  testPayoutIntegration,
  testSmsIntegration,
  testStorageIntegration,
  updateOrganization,
  updateUser,
} from "./service.js";

export const adminRouter = Router();
adminRouter.use(requireRole("ADMIN"));

adminRouter.get("/overview", async (_req, res) => res.json(await getAdminOverview()));

adminRouter.get("/organizations", validate({ query: z.object({ type: z.string().optional() }) }), async (req, res) => {
  res.json({ items: await listOrganizations(req.query as { type?: string }), nextCursor: null });
});
adminRouter.post(
  "/organizations",
  validate({ body: z.object({ type: z.enum(["BUYING_CENTRE", "BRAND"]), name: z.string().min(1), code: z.string().min(3).max(8), county: z.string().optional(), contactName: z.string().optional(), email: z.email().optional(), phone: z.string().optional() }) }),
  async (req, res) => res.status(201).json(await createOrganization(req.user!, req.body))
);
adminRouter.get("/organizations/:id", async (req, res) => res.json(await getOrganization((req.params.id as string))));
adminRouter.patch("/organizations/:id", async (req, res) => res.json(await updateOrganization(req.user!, (req.params.id as string), req.body)));
adminRouter.put(
  "/organizations/:id/targets",
  validate({ body: z.array(z.object({ year: z.number().int(), material: z.string(), targetKg: z.number() })) }),
  async (req, res) => {
    await setEprTargets(req.user!, (req.params.id as string), req.body);
    res.status(204).end();
  }
);
adminRouter.post(
  "/organizations/:id/users",
  validate({ body: z.object({ walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), displayName: z.string().min(1), role: z.enum(["CENTRE_OPERATOR", "BRAND_OFFICER"]) }) }),
  async (req, res) => res.status(201).json(await addOrgUser(req.user!, (req.params.id as string), req.body))
);

adminRouter.get("/users", async (_req, res) => res.json(await listUsers()));
adminRouter.patch("/users/:id", validate({ body: z.object({ displayName: z.string().optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }) }), async (req, res) => res.json(await updateUser(req.user!, (req.params.id as string), req.body)));

adminRouter.post("/role-sync", validate({ body: z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }) }), async (req, res) => res.json(await roleSyncFromTx(req.user!, (req.body as { txHash: string }).txHash)));
adminRouter.post("/role-check", async (_req, res) => res.json(await roleCheck()));

adminRouter.get("/chain", async (_req, res) => res.json(await getChainAdminInfo()));
adminRouter.post("/chain/resync", async (req, res) => {
  await resyncChain(req.user!);
  res.status(204).end();
});

adminRouter.post("/integrity-scan", async (_req, res) => res.json(await runIntegrityScan()));

adminRouter.get(
  "/audit",
  validate({ query: z.object({ action: z.string().optional(), entityId: z.string().optional(), format: z.enum(["csv"]).optional() }) }),
  async (req, res) => {
    const { format, ...filters } = req.query as unknown as { format?: "csv" } & Parameters<typeof listAudit>[0];
    const items = await listAudit(filters);
    if (format === "csv") {
      const header = "at,actorType,actor,action,entityType,entityId,summary\n";
      const rows = items.map((a) => [a.at, a.actorType, a.actor, a.action, a.entityType, a.entityId, a.summary.replaceAll(",", ";")].join(","));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit.csv");
      res.send(header + rows.join("\n"));
      return;
    }
    res.json({ items, nextCursor: null });
  }
);

adminRouter.get("/integrations", async (_req, res) => res.json(await getIntegrations()));
adminRouter.post("/integrations/test-sms", validate({ body: z.object({ phone: z.string().min(1) }) }), async (req, res) => {
  await testSmsIntegration((req.body as { phone: string }).phone);
  res.status(204).end();
});
adminRouter.post("/integrations/test-payout", async (_req, res) => {
  await testPayoutIntegration();
  res.status(204).end();
});
adminRouter.post("/integrations/test-storage", async (_req, res) => res.json(await testStorageIntegration()));
