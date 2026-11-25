import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { loadSession } from "./middleware/session.js";

import { adminRouter } from "./modules/admin/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { brandRouter, claimsRouter, creditsRouter, reportsRouter } from "./modules/brand/routes.js";
import { centreRouter } from "./modules/centre/routes.js";
import { demoRouter } from "./modules/demo/routes.js";
import { disputesRouter } from "./modules/disputes/routes.js";
import { eventsRouter, publicEventsRouter } from "./modules/events/routes.js";
import { healthRouter } from "./modules/health/routes.js";
import { payoutsRouter } from "./modules/payouts/routes.js";
import { pickersRouter } from "./modules/pickers/routes.js";
import { pricesRouter } from "./modules/prices/routes.js";
import { publicRouter } from "./modules/public/routes.js";
import { receiptsRouter } from "./modules/receipts/routes.js";
import { photosRouter, uploadsRouter } from "./modules/uploads/routes.js";
import { verifyRouter } from "./modules/verify/routes.js";
import { webhooksRouter } from "./modules/webhooks/routes.js";

export function buildApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestId);
  app.use(pinoHttp({ logger, customLogLevel: (_req, res) => (res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info") }));
  app.use(helmet());
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(cookieParser());

  // Webhooks need the raw form/JSON body but not our session; mounted before the JSON body
  // limit so large AT/Daraja payloads are still bounded by their own parsers below.
  app.use("/webhooks", express.urlencoded({ extended: false, limit: "64kb" }), express.json({ limit: "64kb" }), webhooksRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(loadSession);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/verify", verifyRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/public/events", publicEventsRouter);

  app.use("/api/pickers", pickersRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/receipts", receiptsRouter);
  app.use("/api/prices", pricesRouter);
  app.use("/api/centre", centreRouter);

  app.use("/api/payouts", payoutsRouter);
  app.use("/api/disputes", disputesRouter);

  app.use("/api/brand", brandRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/claims", claimsRouter);
  app.use("/api/reports", reportsRouter);

  app.use("/api/admin", adminRouter);
  app.use("/api/demo", demoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
