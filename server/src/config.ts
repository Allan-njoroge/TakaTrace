import "dotenv/config";
import { z } from "zod";

function withDefault<T extends z.ZodTypeAny>(schema: T, fallback: string) {
  return z.preprocess((v) => (v === undefined || v === "" ? fallback : v), schema);
}

function intString(fallback?: number) {
  const schema = z.string().transform((v) => Number.parseInt(v, 10)).pipe(z.number().int());
  return fallback === undefined ? schema : withDefault(schema, String(fallback));
}

function boolString(fallback?: boolean) {
  const schema = z.string().transform((v) => v === "true").pipe(z.boolean());
  return fallback === undefined ? schema : withDefault(schema, String(fallback));
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: intString(3001),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.url(),
  PUBLIC_BASE_URL: z.url(),
  SHORT_LINK_BASE: z.string().min(1),
  TZ_DISPLAY: z.string().default("Africa/Nairobi"),
  DEMO_MODE: boolString(false),

  SESSION_TTL_HOURS: intString(8),
  COOKIE_SECURE: boolString(false),
  WEBHOOK_TOKEN: z.string().min(16, "WEBHOOK_TOKEN must be a long random string"),
  ID_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((v) => Buffer.from(v, "base64").length === 32, "ID_ENCRYPTION_KEY must decode to 32 bytes (base64)"),

  RPC_URL: z.url(),
  CHAIN_ID: intString(),
  CONTRACT_INFO_PATH: z.string().min(1),
  INDEXER_POLL_MS: intString(2000),
  INDEXER_BLOCK_BATCH: intString(500),
  CONFIRMATIONS: intString(1),
  TX_WAIT_TIMEOUT_MS: intString(60000),
  DEMO_SIGNER_KEYS: z.string().default(""),

  REQUIRE_SCALE_PHOTO: boolString(true),
  MAX_WEIGHT_KG: intString(2000),
  MAX_BACKDATE_DAYS: intString(7),
  DISPUTE_WINDOW_HOURS: intString(72),
  CLAIM_HOLD_HOURS: intString(0),
  SMS_ON_DRAFT: boolString(false),

  SMS_PROVIDER: z.enum(["mock", "africastalking"]).default("mock"),
  USSD_PROVIDER: z.enum(["mock", "africastalking"]).default("mock"),
  USSD_CODE: z.string().default("*384*123#"),
  AT_USERNAME: z.string().default("sandbox"),
  AT_API_KEY: z.string().default(""),
  AT_SENDER_ID: z.string().default(""),
  AT_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  PAYOUT_PROVIDER: z.enum(["mock", "daraja"]).default("mock"),
  MOCK_PAYOUT_DELAY_MS: intString(2000),
  MOCK_PAYOUT_FAIL_PHONES: z.string().default(""),
  MPESA_ENV: z.string().default("sandbox"),
  MPESA_BASE_URL: z.string().default("https://sandbox.safaricom.co.ke"),
  MPESA_CONSUMER_KEY: z.string().default(""),
  MPESA_CONSUMER_SECRET: z.string().default(""),
  MPESA_SHORTCODE: z.string().default(""),
  MPESA_INITIATOR_NAME: z.string().default(""),
  MPESA_INITIATOR_PASSWORD: z.string().default(""),
  MPESA_CERT_PATH: z.string().default("certs/sandbox.cer"),
  MPESA_SECURITY_CREDENTIAL: z.string().default(""),
  MPESA_COMMAND_ID: z.string().default("BusinessPayment"),
  MPESA_SANDBOX_FORCE_MSISDN: z.string().default("254708374149"),

  STORAGE_PROVIDER: z.enum(["ipfs-local", "pinata", "none"]).default("ipfs-local"),
  IPFS_API_URL: z.string().default("http://127.0.0.1:5001/api/v0"),
  IPFS_GATEWAY_URL: z.string().default("http://127.0.0.1:8080/ipfs"),
  PINATA_JWT: z.string().default(""),
  PHOTO_MAX_BYTES: intString(8388608),
  PHOTO_MAX_DIMENSION: intString(1600),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid configuration. Fix server/.env and restart:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.DEMO_MODE) {
    console.error("Refusing to start: DEMO_MODE=true is not allowed when NODE_ENV=production.");
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();
export type Config = typeof config;
