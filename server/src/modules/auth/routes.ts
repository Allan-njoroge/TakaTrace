import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sha256Hex } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { authRateLimit } from "../../middleware/rateLimits.js";
import { COOKIE_NAME, requireAuth } from "../../middleware/session.js";
import { config } from "../../config.js";
import { validate } from "../../middleware/validate.js";
import { toOrganizationDto, toUserDto } from "../../lib/dto.js";
import { createNonce, signOut, verifySignIn } from "./service.js";

export const authRouter = Router();

authRouter.get("/nonce", authRateLimit, validate({ query: z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }) }), async (req, res) => {
  const { address } = req.query as unknown as { address: string };
  res.json(await createNonce(address));
});

authRouter.post(
  "/verify",
  authRateLimit,
  validate({ body: z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), signature: z.string().min(1) }) }),
  async (req, res) => {
    const { address, signature } = req.body as { address: string; signature: string };
    const result = await verifySignIn(address, signature, req.ip, req.headers["user-agent"]);
    res.cookie(COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.COOKIE_SECURE,
      expires: result.expiresAt,
    });
    const organization = result.user.organizationId
      ? await prisma.organization.findUnique({ where: { id: result.user.organizationId } })
      : null;
    res.json({ user: toUserDto(result.user), organization: toOrganizationDto(organization) });
  }
);

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) await signOut(sha256Hex(token));
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  if (!req.user) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  const organization = req.user.organizationId ? await prisma.organization.findUnique({ where: { id: req.user.organizationId } }) : null;
  res.json({ user: toUserDto(req.user), organization: toOrganizationDto(organization) });
});
