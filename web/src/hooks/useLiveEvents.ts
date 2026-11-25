import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { config } from "../config";
import { toast } from "../lib/toast";

export interface LiveEventPayload {
  type: string;
  receiptId?: string;
  disputeId?: string;
  [key: string]: unknown;
}

type LiveStatus = "connecting" | "live" | "polling";
type Scope = "app" | "public";

const POLL_FALLBACK_KEYS: string[][] = [
  ["receipts"],
  ["receipt"],
  ["credits"],
  ["claims"],
  ["payouts"],
  ["disputes"],
  ["public-stats"],
  ["public-activity"],
];

interface Connection {
  status: LiveStatus;
  statusListeners: Set<() => void>;
  eventListeners: Set<(event: LiveEventPayload) => void>;
  source: EventSource | null;
  pollInterval: ReturnType<typeof setInterval> | null;
  failureCount: number;
  refCount: number;
}

const connections = new Map<Scope, Connection>();

function getConnection(scope: Scope): Connection {
  let connection = connections.get(scope);
  if (!connection) {
    connection = {
      status: "connecting",
      statusListeners: new Set(),
      eventListeners: new Set(),
      source: null,
      pollInterval: null,
      failureCount: 0,
      refCount: 0,
    };
    connections.set(scope, connection);
  }
  return connection;
}

function setStatus(connection: Connection, status: LiveStatus) {
  connection.status = status;
  connection.statusListeners.forEach((listener) => listener());
}

function dispatchEvent(connection: Connection, queryClient: QueryClient, scope: Scope, event: LiveEventPayload) {
  switch (event.type) {
    case "receipt.anchored":
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      if (event.receiptId) queryClient.invalidateQueries({ queryKey: ["receipt", event.receiptId] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["public-activity"] });
      break;
    case "receipt.claimed":
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["public-activity"] });
      break;
    case "receipt.anchor_failed":
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      if (scope === "app") toast.error(`Anchoring failed for ${event.receiptId ?? "a receipt"}.`);
      break;
    case "payout.updated":
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      if (event.receiptId) queryClient.invalidateQueries({ queryKey: ["receipt", event.receiptId] });
      break;
    case "sms.sent":
    case "sms.status":
      if (event.receiptId) queryClient.invalidateQueries({ queryKey: ["receipt-timeline", event.receiptId] });
      queryClient.invalidateQueries({ queryKey: ["demo"] });
      break;
    case "dispute.opened":
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      if (scope === "app") toast.info(`New dispute on ${event.receiptId ?? "a receipt"}.`);
      break;
    case "dispute.updated":
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      if (event.disputeId) queryClient.invalidateQueries({ queryKey: ["dispute", event.disputeId] });
      break;
    case "chain.reset":
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "chain"] });
      break;
    case "integrity.mismatch":
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      if (scope === "app") toast.error(`Integrity mismatch found on ${event.receiptId ?? "a receipt"}.`);
      break;
    default:
      break;
  }

  connection.eventListeners.forEach((listener) => listener(event));
}

function startPolling(connection: Connection, queryClient: QueryClient) {
  if (connection.pollInterval) return;
  setStatus(connection, "polling");
  const invalidateAll = () => {
    for (const key of POLL_FALLBACK_KEYS) queryClient.invalidateQueries({ queryKey: key });
  };
  invalidateAll();
  connection.pollInterval = setInterval(invalidateAll, 10_000);
}

function connect(connection: Connection, scope: Scope, queryClient: QueryClient) {
  const url = scope === "app" ? `${config.apiUrl}/api/events` : `${config.apiUrl}/api/public/events`;
  const source = new EventSource(url, { withCredentials: scope === "app" });
  connection.source = source;

  source.onopen = () => {
    connection.failureCount = 0;
    if (connection.pollInterval) {
      clearInterval(connection.pollInterval);
      connection.pollInterval = null;
    }
    setStatus(connection, "live");
  };

  source.onmessage = (raw: MessageEvent) => {
    let event: LiveEventPayload;
    try {
      event = JSON.parse(raw.data);
    } catch {
      return;
    }
    dispatchEvent(connection, queryClient, scope, event);
  };

  source.onerror = () => {
    source.close();
    connection.failureCount += 1;
    if (connection.failureCount >= 3) {
      startPolling(connection, queryClient);
    } else if (connection.refCount > 0) {
      setTimeout(() => {
        if (connection.refCount > 0) connect(connection, scope, queryClient);
      }, 1000 * connection.failureCount);
    }
  };
}

function acquire(scope: Scope, queryClient: QueryClient): Connection {
  const connection = getConnection(scope);
  connection.refCount += 1;
  if (connection.refCount === 1) {
    connect(connection, scope, queryClient);
  }
  return connection;
}

function release(scope: Scope) {
  const connection = connections.get(scope);
  if (!connection) return;
  connection.refCount -= 1;
  if (connection.refCount <= 0) {
    connection.source?.close();
    connection.source = null;
    if (connection.pollInterval) clearInterval(connection.pollInterval);
    connection.pollInterval = null;
    connections.delete(scope);
  }
}

/**
 * Subscribes to the shared SSE connection for this scope (spec 14.4) — the actual `EventSource`
 * is opened once per scope no matter how many components call this hook. After 3 consecutive
 * connection failures, falls back to polling the same query keys every 10s.
 */
export function useLiveEvents(scope: Scope, enabled = true, onEvent?: (event: LiveEventPayload) => void) {
  const queryClient = useQueryClient();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !onEvent) return;
    const connection = getConnection(scope);
    const listener = (event: LiveEventPayload) => onEventRef.current?.(event);
    connection.eventListeners.add(listener);
    return () => {
      connection.eventListeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, enabled]);

  useEffect(() => {
    if (!enabled) return;
    acquire(scope, queryClient);
    return () => {
      release(scope);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, enabled]);

  const status = useSyncExternalStore(
    (listener) => {
      const connection = getConnection(scope);
      connection.statusListeners.add(listener);
      return () => connection.statusListeners.delete(listener);
    },
    () => getConnection(scope).status,
  );

  return status;
}
