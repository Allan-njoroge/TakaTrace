import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Next picker code, e.g. "P-0001", "P-9999", "P-10000". Uses the shared Counter table. */
export async function nextPickerCode(tx: Tx): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { name: "picker" },
    create: { name: "picker", value: 1 },
    update: { value: { increment: 1 } },
  });
  return `P-${String(counter.value).padStart(4, "0")}`;
}

/** Next receipt ID for a centre, e.g. "TT-NRB01-000042". Increments Organization.receiptSeq. */
export async function nextReceiptId(tx: Tx, organizationId: string, centreCode: string): Promise<string> {
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { receiptSeq: { increment: 1 } },
  });
  return `TT-${centreCode}-${String(org.receiptSeq).padStart(6, "0")}`;
}

/** Next dispute reference, e.g. "D-0007". */
export async function nextDisputeRef(tx: Tx): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { name: "dispute" },
    create: { name: "dispute", value: 1 },
    update: { value: { increment: 1 } },
  });
  return `D-${String(counter.value).padStart(4, "0")}`;
}
