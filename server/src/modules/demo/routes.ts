import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { demoOnly } from "../../middleware/demoOnly.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { handleInboundSms } from "../../providers/sms/commands.js";
import { handleUssdRequest } from "../../providers/ussd/menu.js";
import { listDemoPickers, reanchorAll, resetDemoData, restoreReceipt, seedWeek, tamperReceipt } from "./service.js";

export const demoRouter = Router();
demoRouter.use(demoOnly);

demoRouter.post(
  "/tamper",
  requireRole("ADMIN"),
  validate({ body: z.object({ receiptId: z.string().min(1), field: z.enum(["weightKg", "material", "pickerCode", "weighedOn"]), value: z.string().min(1) }) }),
  async (req, res) => {
    const { receiptId, field, value } = req.body as { receiptId: string; field: "weightKg" | "material" | "pickerCode" | "weighedOn"; value: string };
    await tamperReceipt(req.user!, receiptId, field, value);
    res.status(204).end();
  }
);

demoRouter.post("/restore", requireRole("ADMIN"), validate({ body: z.object({ receiptId: z.string().min(1) }) }), async (req, res) => {
  await restoreReceipt(req.user!, (req.body as { receiptId: string }).receiptId);
  res.status(204).end();
});

demoRouter.post("/reset", requireRole("ADMIN"), validate({ body: z.object({ confirm: z.literal("RESET") }) }), async (req, res) => {
  await resetDemoData(req.user!);
  res.status(204).end();
});

demoRouter.post("/seed-week", requireRole("ADMIN"), async (_req, res) => res.json(await seedWeek()));
demoRouter.post("/reanchor-all", requireRole("ADMIN"), async (_req, res) => res.json(await reanchorAll()));

demoRouter.get("/phone/:phone/sms", async (req, res) => {
  const phone = decodeURIComponent((req.params.phone as string));
  const messages = await prisma.smsMessage.findMany({ where: { phone }, orderBy: { createdAt: "asc" } });
  res.json(
    messages.map((m) => ({
      id: m.id,
      direction: m.direction as "OUTBOUND" | "INBOUND",
      text: m.body,
      status: m.status as "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED",
      at: m.createdAt.toISOString(),
    }))
  );
});

demoRouter.post("/phone/:phone/sms", validate({ body: z.object({ text: z.string().min(1) }) }), async (req, res) => {
  const phone = decodeURIComponent((req.params.phone as string));
  await handleInboundSms({ from: phone, text: (req.body as { text: string }).text });
  res.status(204).end();
});

demoRouter.post(
  "/ussd",
  validate({ body: z.object({ sessionId: z.string().min(1), phoneNumber: z.string().min(1), serviceCode: z.string().min(1), text: z.string().default("") }) }),
  async (req, res) => {
    const reply = await handleUssdRequest(req.body as { sessionId: string; phoneNumber: string; serviceCode: string; text: string });
    res.type("text/plain").send(reply);
  }
);

demoRouter.get("/pickers", async (_req, res) => res.json(await listDemoPickers()));
