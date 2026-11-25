import type { NextFunction, Request, Response } from "express";
import { randomToken } from "../lib/crypto.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.requestId = `req_${randomToken(8)}`;
  res.setHeader("x-request-id", req.requestId);
  next();
}
