export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ROLE_NOT_ON_CHAIN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TX_MISMATCH"
  | "INTEGRITY_MISMATCH"
  | "UNDER_DISPUTE"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "CHAIN_UNAVAILABLE"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ROLE_NOT_ON_CHAIN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TX_MISMATCH: 409,
  INTEGRITY_MISMATCH: 422,
  UNDER_DISPUTE: 423,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  CHAIN_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** The one error type every module raises for expected, user-facing failures. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = fields;
  }
}
