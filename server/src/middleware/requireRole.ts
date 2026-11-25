import type { NextFunction, Request, Response } from "express";
import { chainStatus } from "../chain/provider.js";
import { AppError } from "../lib/errors.js";
import type { SessionUser } from "./session.js";

/**
 * Requires the signed-in user to have one of the given roles, and to be approved
 * on-chain. Exception: an admin may act even when the contract isn't deployed yet,
 * so they can deploy it / fix configuration (BACKEND_SPEC.md section 10.1).
 */
export function requireRole(...roles: SessionUser["role"][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError("UNAUTHENTICATED", "Sign in to continue."));
    if (!roles.includes(req.user.role)) return next(new AppError("FORBIDDEN", "You can't do this."));
    const adminWithoutContract = req.user.role === "ADMIN" && !chainStatus.contractDeployed;
    if (!req.user.onChainApproved && !adminWithoutContract) {
      return next(new AppError("ROLE_NOT_ON_CHAIN", "Your wallet isn't approved on the smart contract yet."));
    }
    next();
  };
}
