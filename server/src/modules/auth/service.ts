import { verifyMessage } from "ethers";
import { chainStatus } from "../../chain/provider.js";
import { getOnChainRole } from "../../chain/roles.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { randomToken, sha256Hex } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";

const NONCE_TTL_MS = 5 * 60 * 1000;
const DOMAIN = new URL(config.WEB_ORIGIN).host;

export async function createNonce(address: string): Promise<{ message: string; nonce: string; expiresAt: string }> {
  const nonce = randomToken(16);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
  const message = [
    `${DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to TakaTrace. This does not send a transaction or cost anything.",
    "",
    `URI: ${config.WEB_ORIGIN}`,
    "Version: 1",
    `Chain ID: ${config.CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join("\n");

  await prisma.authNonce.create({ data: { address: address.toLowerCase(), nonce, message, expiresAt } });
  return { message, nonce, expiresAt: expiresAt.toISOString() };
}

export interface VerifySignInResult {
  user: { id: string; walletAddress: string; displayName: string; role: string; onChainApproved: boolean; organizationId: string | null };
  sessionToken: string;
  expiresAt: Date;
}

export async function verifySignIn(address: string, signature: string, ip: string | undefined, userAgent: string | undefined): Promise<VerifySignInResult> {
  const lower = address.toLowerCase();
  const nonceRow = await prisma.authNonce.findFirst({
    where: { address: lower, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!nonceRow) throw new AppError("UNAUTHENTICATED", "Your sign-in request expired. Try again.");

  let recovered: string;
  try {
    recovered = verifyMessage(nonceRow.message, signature);
  } catch {
    throw new AppError("UNAUTHENTICATED", "Invalid signature.");
  }
  if (recovered.toLowerCase() !== lower) throw new AppError("UNAUTHENTICATED", "Invalid signature.");

  await prisma.authNonce.update({ where: { id: nonceRow.id }, data: { usedAt: new Date() } });

  const user = await prisma.user.findUnique({ where: { walletAddress: lower }, include: { organization: true } });
  if (!user) throw new AppError("UNAUTHENTICATED", "This wallet isn't registered. Ask an admin to add you.");
  if (user.status !== "ACTIVE") throw new AppError("UNAUTHENTICATED", "This account is suspended.");
  if (user.organization && user.organization.status !== "ACTIVE") throw new AppError("UNAUTHENTICATED", "This organisation is suspended.");

  let onChainApproved = false;
  if (user.role === "ADMIN" && !chainStatus.contractDeployed) {
    onChainApproved = true; // let an admin sign in to deploy/fix the contract
  } else {
    const role = await getOnChainRole(lower);
    onChainApproved = user.role === "ADMIN" ? role.isAdmin : user.role === "CENTRE_OPERATOR" ? role.isBuyingCentre : role.isBrand;
    if (!onChainApproved) throw new AppError("ROLE_NOT_ON_CHAIN", "Your wallet isn't approved on the smart contract yet.");
  }

  const sessionToken = randomToken(32);
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3_600_000);
  await prisma.$transaction(async (tx) => {
    await tx.session.create({ data: { tokenHash: sha256Hex(sessionToken), userId: user.id, expiresAt, ip, userAgent } });
    await tx.user.update({ where: { id: user.id }, data: { lastSignInAt: new Date(), onChainApproved, onChainCheckedAt: new Date() } });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "AUTH_SIGNED_IN", entityType: "User", entityId: user.id, summary: "Signed in.", ip });
  });

  return {
    user: { id: user.id, walletAddress: user.walletAddress, displayName: user.displayName, role: user.role, onChainApproved, organizationId: user.organizationId },
    sessionToken,
    expiresAt,
  };
}

export async function signOut(tokenHash: string): Promise<void> {
  await prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
}
