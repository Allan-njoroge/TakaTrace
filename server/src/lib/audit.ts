import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient | PrismaClient;

export type ActorType = "USER" | "SYSTEM" | "PICKER" | "WEBHOOK" | "CHAIN";

export interface WriteAuditInput {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  requestId?: string | null;
}

/**
 * Appends one row to the audit log. The audit log is append-only: nothing else
 * in the codebase should update or delete an AuditLog row.
 */
export async function writeAudit(tx: Tx, input: WriteAuditInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      before: input.before !== undefined ? JSON.stringify(input.before) : null,
      after: input.after !== undefined ? JSON.stringify(input.after) : null,
      ip: input.ip ?? null,
      requestId: input.requestId ?? null,
    },
  });
}
