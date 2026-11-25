import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { sha256Hex } from "../lib/crypto.js";
import { AppError } from "../lib/errors.js";
import { getOnChainRole } from "../chain/roles.js";

export interface SessionUser {
  id: string;
  walletAddress: string;
  displayName: string;
  role: "ADMIN" | "CENTRE_OPERATOR" | "BRAND_OFFICER";
  organizationId: string | null;
  onChainApproved: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const COOKIE_NAME = "tt_session";
const RECHECK_INTERVAL_MS = 10 * 60 * 1000;

/** Loads the session user (if any) onto req.user. Never rejects — routes decide what auth they need. */
export async function loadSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) return next();

    const tokenHash = sha256Hex(token);
    const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: { include: { organization: true } } } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return next();

    const user = session.user;
    if (user.status !== "ACTIVE") return next();
    if (user.organization && user.organization.status !== "ACTIVE") return next();

    const lastChecked = user.onChainCheckedAt?.getTime() ?? 0;
    let onChainApproved = user.onChainApproved;
    if (Date.now() - lastChecked > RECHECK_INTERVAL_MS) {
      const role = await getOnChainRole(user.walletAddress);
      onChainApproved = user.role === "ADMIN" ? role.isAdmin : user.role === "CENTRE_OPERATOR" ? role.isBuyingCentre : role.isBrand;
      await prisma.user.update({ where: { id: user.id }, data: { onChainApproved, onChainCheckedAt: new Date() } });
    }

    req.user = {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      role: user.role as SessionUser["role"],
      organizationId: user.organizationId,
      onChainApproved,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export { COOKIE_NAME };

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AppError("UNAUTHENTICATED", "Sign in to continue."));
  next();
}
