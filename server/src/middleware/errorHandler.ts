import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "No such route.", requestId: req.requestId },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.code === "INTERNAL") {
      logger.error({ err, requestId: req.requestId }, "internal error");
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, fields: err.fields, requestId: req.requestId },
    });
    return;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".") || "_"] = issue.message;
    res.status(400).json({
      error: { code: "VALIDATION", message: "Request validation failed.", fields, requestId: req.requestId },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, "unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL", message: "Something went wrong. Please try again.", requestId: req.requestId },
  });
}
