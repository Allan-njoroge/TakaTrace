import { constants, publicEncrypt } from "node:crypto";
import { readFileSync } from "node:fs";

/** Encrypts the initiator password with Safaricom's public certificate for B2C requests. */
export function buildSecurityCredential(certPath: string, initiatorPassword: string): string {
  const cert = readFileSync(certPath); // PEM X.509 certificate
  return publicEncrypt({ key: cert, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(initiatorPassword)).toString("base64");
}
