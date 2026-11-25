import { EventEmitter } from "node:events";
import type { Response } from "express";

export type EventName =
  | "receipt.created"
  | "receipt.anchor_failed"
  | "receipt.anchored"
  | "receipt.claimed"
  | "payout.updated"
  | "sms.sent"
  | "sms.status"
  | "dispute.opened"
  | "dispute.updated"
  | "chain.reset"
  | "integrity.mismatch"
  | "indexer.error";

export type Audience =
  | { kind: "organization"; organizationId: string }
  | { kind: "role"; role: "ADMIN" | "BRAND_OFFICER" }
  | { kind: "public" }
  | { kind: "phone"; phone: string };

export interface AppEvent {
  name: EventName;
  data: Record<string, unknown>;
  audiences: Audience[];
}

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function emitEvent(event: AppEvent): void {
  bus.emit("event", event);
}

export interface SseClient {
  organizationId?: string;
  role?: "ADMIN" | "CENTRE_OPERATOR" | "BRAND_OFFICER";
  isPublic?: boolean;
  phone?: string;
}

function matches(audiences: Audience[], client: SseClient): boolean {
  return audiences.some((a) => {
    if (a.kind === "public") return true;
    if (a.kind === "organization") return a.organizationId === client.organizationId;
    if (a.kind === "role") return a.role === client.role;
    if (a.kind === "phone") return a.phone === client.phone;
    return false;
  });
}

let nextId = 1;

/** Wires an Express response as a Server-Sent Events stream filtered to this client's audience. */
export function subscribeSse(res: Response, client: SseClient): () => void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 3000\n\n");

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);

  const listener = (event: AppEvent) => {
    if (!matches(event.audiences, client)) return;
    // No `event:` field: the frontend's EventSource listens only on the default
    // "message" event (`source.onmessage`) and reads a `type` field from the parsed
    // JSON body instead of using SSE's named-event mechanism. A named event here
    // would never reach the browser's onmessage handler at all.
    res.write(`id: ${String(nextId++)}\n`);
    res.write(`data: ${JSON.stringify({ type: event.name, ...event.data })}\n\n`);
  };
  bus.on("event", listener);

  return () => {
    clearInterval(heartbeat);
    bus.off("event", listener);
  };
}

export function closeAllSseClients(): void {
  bus.removeAllListeners("event");
}
