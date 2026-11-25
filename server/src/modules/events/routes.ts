import { Router } from "express";
import { subscribeSse } from "../../lib/events.js";
import { requireAuth } from "../../middleware/session.js";

export const eventsRouter = Router();

eventsRouter.get("/", requireAuth, (req, res) => {
  const unsubscribe = subscribeSse(res, { organizationId: req.user?.organizationId ?? undefined, role: req.user?.role });
  req.on("close", unsubscribe);
});

export const publicEventsRouter = Router();

publicEventsRouter.get("/", (req, res) => {
  const unsubscribe = subscribeSse(res, { isPublic: true });
  req.on("close", unsubscribe);
});
