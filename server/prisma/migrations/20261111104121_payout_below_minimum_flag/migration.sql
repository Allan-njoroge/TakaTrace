-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptRef" TEXT NOT NULL,
    "pickerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "belowMinimum" BOOLEAN NOT NULL DEFAULT false,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "originatorConversationId" TEXT NOT NULL,
    "conversationId" TEXT,
    "mpesaTransactionId" TEXT,
    "resultCode" TEXT,
    "resultDesc" TEXT,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payout_receiptRef_fkey" FOREIGN KEY ("receiptRef") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payout_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Picker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payout" ("amountCents", "attempt", "conversationId", "createdAt", "id", "kind", "mpesaTransactionId", "originatorConversationId", "paidAt", "phone", "pickerId", "provider", "receiptRef", "resultCode", "resultDesc", "sentAt", "status", "updatedAt") SELECT "amountCents", "attempt", "conversationId", "createdAt", "id", "kind", "mpesaTransactionId", "originatorConversationId", "paidAt", "phone", "pickerId", "provider", "receiptRef", "resultCode", "resultDesc", "sentAt", "status", "updatedAt" FROM "Payout";
DROP TABLE "Payout";
ALTER TABLE "new_Payout" RENAME TO "Payout";
CREATE UNIQUE INDEX "Payout_originatorConversationId_key" ON "Payout"("originatorConversationId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_receiptRef_idx" ON "Payout"("receiptRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
