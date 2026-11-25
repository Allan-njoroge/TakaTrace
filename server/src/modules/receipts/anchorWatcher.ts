import { verifyTx } from "../../chain/txVerifier.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";
import { applyAnchorConfirmed } from "./service.js";

const RECHECK_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 10 * 60_000;

/** Re-checks Anchor rows still SUBMITTED after the browser's report (BACKEND_SPEC.md section 21). */
export async function verifyAnchorWatcherCandidates(): Promise<void> {
  const candidates = await prisma.anchor.findMany({
    where: { status: "SUBMITTED", submittedAt: { lte: new Date(Date.now() - RECHECK_AFTER_MS) } },
    include: { receipt: true },
    take: 50,
  });

  for (const anchor of candidates) {
    try {
      const result = await verifyTx(anchor.txHash, anchor.fromAddress, { name: "ReceiptRecorded", args: { receiptId: anchor.receipt.receiptId, dataHash: anchor.receipt.dataHash, centre: anchor.fromAddress } });

      if (result.status === "CONFIRMED") {
        await prisma.anchor.update({ where: { id: anchor.id }, data: { status: "CONFIRMED", blockNumber: result.blockNumber, confirmedAt: new Date() } });
        await applyAnchorConfirmed(anchor.receiptRef, result.blockNumber);
        continue;
      }

      const age = Date.now() - anchor.submittedAt.getTime();
      if (result.status === "TIMEOUT" && age < GIVE_UP_AFTER_MS) continue; // keep waiting

      const error = result.status === "TIMEOUT" ? "Transaction not found; please anchor again" : result.reason;
      await prisma.$transaction(async (tx) => {
        await tx.anchor.update({ where: { id: anchor.id }, data: { status: "FAILED", error } });
        await tx.receipt.update({ where: { id: anchor.receiptRef }, data: { status: "ANCHOR_FAILED" } });
        await writeAudit(tx, { actorType: "SYSTEM", action: "ANCHOR_FAILED", entityType: "Receipt", entityId: anchor.receiptRef, summary: error ?? "Anchor watcher gave up." });
      });
    } catch (err) {
      logger.error({ err, anchorId: anchor.id }, "anchor watcher failed to re-check an anchor");
    }
  }
}
