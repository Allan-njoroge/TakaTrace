import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  getPickerDetail,
  listPickers,
  lookupPicker,
  registerPicker,
  sendTestSms,
  setPickerStatus,
  updatePicker,
} from "./service.js";

export const pickersRouter = Router();

pickersRouter.use(requireRole("CENTRE_OPERATOR", "ADMIN"));

pickersRouter.get("/", validate({ query: z.object({ q: z.string().optional(), status: z.string().optional() }) }), async (req, res) => {
  res.json({ items: await listPickers(req.user!, req.query as { q?: string; status?: string }), nextCursor: null });
});

pickersRouter.get("/lookup", validate({ query: z.object({ q: z.string().min(1) }) }), async (req, res) => {
  res.json(await lookupPicker(req.user!, (req.query as { q: string }).q));
});

pickersRouter.post(
  "/",
  validate({
    body: z.object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      phone: z.string().min(1),
      language: z.enum(["en", "sw"]).optional(),
      idNumber: z.string().optional(),
      consentConfirmed: z.boolean(),
    }),
  }),
  async (req, res) => {
    res.status(201).json(await registerPicker(req.user!, req.body));
  }
);

pickersRouter.get("/:id", async (req, res) => res.json(await getPickerDetail(req.user!, (req.params.id as string))));

pickersRouter.patch(
  "/:id",
  validate({ body: z.object({ firstName: z.string().optional(), lastName: z.string().optional(), language: z.enum(["en", "sw"]).optional(), phone: z.string().optional(), consentConfirmed: z.boolean().optional() }) }),
  async (req, res) => res.json(await updatePicker(req.user!, (req.params.id as string), req.body))
);

pickersRouter.post("/:id/suspend", validate({ body: z.object({ reason: z.string().min(1) }) }), async (req, res) => {
  await setPickerStatus(req.user!, (req.params.id as string), "SUSPENDED", (req.body as { reason: string }).reason);
  res.status(204).end();
});

pickersRouter.post("/:id/reactivate", async (req, res) => {
  await setPickerStatus(req.user!, (req.params.id as string), "ACTIVE");
  res.status(204).end();
});

pickersRouter.post("/:id/test-sms", async (req, res) => {
  await sendTestSms(req.user!, (req.params.id as string));
  res.status(204).end();
});
