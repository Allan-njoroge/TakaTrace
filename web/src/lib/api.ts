import { config } from "../config";
import type { ApiErrorBody } from "../types/api";

export class ApiError extends Error {
  status: number;
  code: ApiErrorBody["error"]["code"];
  fields?: Record<string, string>;
  requestId: string;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.requestId = body.requestId;
  }
}

/** Fired on any 401 so the app can redirect to /sign-in. Listened to in main.tsx. */
export const UNAUTHENTICATED_EVENT = "takatrace:unauthenticated";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, idempotencyKey, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT));
    }
    if (isJson && payload && typeof payload === "object" && "error" in payload) {
      throw new ApiError(response.status, (payload as ApiErrorBody).error);
    }
    throw new ApiError(response.status, {
      code: "INTERNAL",
      message: typeof payload === "string" && payload ? payload : "Something went wrong.",
      requestId: response.headers.get("x-request-id") ?? "",
    });
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
