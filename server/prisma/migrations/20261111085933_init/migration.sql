-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "county" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "receiptSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onChainApproved" BOOLEAN NOT NULL DEFAULT false,
    "onChainCheckedAt" DATETIME,
    "lastSignInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Picker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "idNumberEnc" TEXT,
    "idNumberLast4" TEXT,
    "consentAt" DATETIME NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentByUserId" TEXT NOT NULL,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "registeredByOrgId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Picker_consentByUserId_fkey" FOREIGN KEY ("consentByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Picker_registeredByOrgId_fkey" FOREIGN KEY ("registeredByOrgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "pricePerKgCents" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Price_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Price_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EprTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandOrgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "targetGrams" INTEGER NOT NULL,
    CONSTRAINT "EprTarget_brandOrgId_fkey" FOREIGN KEY ("brandOrgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cid" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "storage" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pickerId" TEXT NOT NULL,
    "pickerCode" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "weighedOn" TEXT NOT NULL,
    "photoId" TEXT,
    "photoCid" TEXT,
    "salt" TEXT NOT NULL,
    "recordVersion" TEXT NOT NULL DEFAULT 'v1',
    "dataHash" TEXT NOT NULL,
    "pricePerKgCents" INTEGER NOT NULL,
    "payoutCents" INTEGER NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "claimStatus" TEXT NOT NULL DEFAULT 'UNCLAIMED',
    "disputeFlagOnChain" BOOLEAN NOT NULL DEFAULT false,
    "integrity" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "integrityCheckedAt" DATETIME,
    "anchoredAt" DATETIME,
    "correctsId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Receipt_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Picker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Receipt_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "Receipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptRef" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "chainEpoch" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "Anchor_receiptRef_fkey" FOREIGN KEY ("receiptRef") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptRef" TEXT NOT NULL,
    "brandOrgId" TEXT NOT NULL,
    "claimedByAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "chainEpoch" INTEGER NOT NULL,
    "complianceYear" INTEGER NOT NULL,
    "productLine" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "claimedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Claim_receiptRef_fkey" FOREIGN KEY ("receiptRef") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Claim_brandOrgId_fkey" FOREIGN KEY ("brandOrgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptRef" TEXT NOT NULL,
    "pickerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pickerId" TEXT,
    "receiptRef" TEXT,
    "template" TEXT,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "cost" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsMessage_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Picker" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SmsMessage_receiptRef_fkey" FOREIGN KEY ("receiptRef") REFERENCES "Receipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UssdSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "lastText" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "ChainState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "chainId" INTEGER NOT NULL,
    "genesisHash" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "epoch" INTEGER NOT NULL DEFAULT 1,
    "lastProcessedBlock" INTEGER NOT NULL DEFAULT -1,
    "lastError" TEXT,
    "resetDetectedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" INTEGER NOT NULL,
    "epoch" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "requestId" TEXT
);

-- CreateTable
CREATE TABLE "WebhookCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "httpStatus" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "unsubscribedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "receiptId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_nonce_key" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_address_idx" ON "AuthNonce"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Picker_code_key" ON "Picker"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Picker_phone_key" ON "Picker"("phone");

-- CreateIndex
CREATE INDEX "Price_organizationId_material_effectiveFrom_idx" ON "Price"("organizationId", "material", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "EprTarget_brandOrgId_year_material_key" ON "EprTarget"("brandOrgId", "year", "material");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_cid_key" ON "Photo"("cid");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptId_key" ON "Receipt"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_idempotencyKey_key" ON "Receipt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Receipt_organizationId_createdAt_idx" ON "Receipt"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Receipt_status_idx" ON "Receipt"("status");

-- CreateIndex
CREATE INDEX "Receipt_claimStatus_idx" ON "Receipt"("claimStatus");

-- CreateIndex
CREATE INDEX "Receipt_pickerId_idx" ON "Receipt"("pickerId");

-- CreateIndex
CREATE INDEX "Anchor_receiptRef_idx" ON "Anchor"("receiptRef");

-- CreateIndex
CREATE UNIQUE INDEX "Anchor_chainId_chainEpoch_txHash_key" ON "Anchor"("chainId", "chainEpoch", "txHash");

-- CreateIndex
CREATE INDEX "Claim_brandOrgId_complianceYear_idx" ON "Claim"("brandOrgId", "complianceYear");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_receiptRef_chainEpoch_key" ON "Claim"("receiptRef", "chainEpoch");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_originatorConversationId_key" ON "Payout"("originatorConversationId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_receiptRef_idx" ON "Payout"("receiptRef");

-- CreateIndex
CREATE INDEX "SmsMessage_phone_createdAt_idx" ON "SmsMessage"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_status_nextAttemptAt_idx" ON "SmsMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "UssdSession_sessionId_key" ON "UssdSession"("sessionId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_receiptRef_idx" ON "Dispute"("receiptRef");

-- CreateIndex
CREATE INDEX "ChainEvent_name_idx" ON "ChainEvent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChainEvent_chainId_epoch_txHash_logIndex_key" ON "ChainEvent"("chainId", "epoch", "txHash", "logIndex");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
