import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

/** 404s (not 403) so the existence of demo routes isn't revealed when DEMO_MODE is off. */
export function demoOnly(req: Request, res: Response, next: NextFunction): void {
  if (!config.DEMO_MODE) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No such route.", requestId: req.requestId } });
    return;
  }
  next();
}
