/*
  Warnings:

  - Added the required column `reference` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "receiptRef" TEXT NOT NULL,
    "pickerId" TEXT,
    "openedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "flagTxHash" TEXT,
    "unflagTxHash" TEXT,
    "decisionNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" DATETIME,
    "correctionRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispute_receiptRef_fkey" FOREIGN KEY ("receiptRef") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Dispute_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Picker" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispute_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispute_correctionRef_fkey" FOREIGN KEY ("correctionRef") REFERENCES "Receipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Dispute" ("correctionRef", "createdAt", "decidedAt", "decidedByUserId", "decisionNote", "flagTxHash", "id", "message", "openedBy", "pickerId", "reason", "receiptRef", "status", "unflagTxHash", "updatedAt") SELECT "correctionRef", "createdAt", "decidedAt", "decidedByUserId", "decisionNote", "flagTxHash", "id", "message", "openedBy", "pickerId", "reason", "receiptRef", "status", "unflagTxHash", "updatedAt" FROM "Dispute";
DROP TABLE "Dispute";
ALTER TABLE "new_Dispute" RENAME TO "Dispute";
CREATE UNIQUE INDEX "Dispute_reference_key" ON "Dispute"("reference");
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");
CREATE INDEX "Dispute_receiptRef_idx" ON "Dispute"("receiptRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
