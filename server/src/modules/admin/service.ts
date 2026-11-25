import { chainStatus, getContract, provider } from "../../chain/provider.js";
import { getOnChainRole, clearRoleCache } from "../../chain/roles.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { gramsToKgNumber, toBackendOrgType, toFrontendOrgType, toOrganizationDto, toUserDto } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { buildRecordText, hashRecordText } from "../../lib/record.js";
import type { SessionUser } from "../../middleware/session.js";
import { payoutProvider } from "../../providers/payments/index.js";
import { sendSms } from "../../providers/sms/service.js";
import { storage } from "../../providers/storage/index.js";

function toAuditEntryDto(a: { id: string; at: Date; actorType: string; actorId: string | null; action: string; entityType: string; entityId: string; summary: string; ip: string | null; before: string | null; after: string | null }) {
  const actorType = a.actorType === "USER" ? "WALLET" : a.actorType === "CHAIN" ? "SYSTEM" : (a.actorType as "SYSTEM" | "PICKER" | "WEBHOOK");
  return {
    id: a.id,
    at: a.at.toISOString(),
    actor: a.actorId ?? "system",
    actorType: actorType as "WALLET" | "SYSTEM" | "PICKER" | "WEBHOOK",
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    summary: a.summary,
    ip: a.ip ?? "",
    before: a.before ? JSON.parse(a.before) : undefined,
    after: a.after ? JSON.parse(a.after) : undefined,
  };
}

const DISPLAY_STATUSES = ["DRAFT", "ANCHORING", "ANCHORED", "CLAIMED", "DISPUTED", "SUPERSEDED", "ANCHOR_FAILED", "NEEDS_REANCHOR"] as const;

export async function getAdminOverview() {
  const [centres, brands, activePickers, allReceipts, anchoredReceipts, paidPayouts, failedPayouts, allSms, recentAudit, state] = await Promise.all([
    prisma.organization.count({ where: { type: "CENTRE", status: "ACTIVE" } }),
    prisma.organization.count({ where: { type: "BRAND", status: "ACTIVE" } }),
    prisma.picker.count({ where: { status: "ACTIVE" } }),
    prisma.receipt.findMany({ select: { status: true, claimStatus: true, disputeFlagOnChain: true } }),
    prisma.receipt.findMany({ where: { status: "ANCHORED" }, select: { weightGrams: true } }),
    prisma.payout.count({ where: { status: "PAID" } }),
    prisma.payout.count({ where: { status: "FAILED" } }),
    prisma.smsMessage.findMany({ where: { direction: "OUTBOUND", createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } } }),
    prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 20 }),
    prisma.chainState.findUnique({ where: { id: 1 } }),
  ]);

  const receiptsByDisplayStatus: Record<string, number> = Object.fromEntries(DISPLAY_STATUSES.map((s) => [s, 0]));
  for (const r of allReceipts) {
    const displayStatus = r.status === "SUPERSEDED" ? "SUPERSEDED" : r.disputeFlagOnChain ? "DISPUTED" : r.claimStatus === "CLAIMED" ? "CLAIMED" : r.status;
    receiptsByDisplayStatus[displayStatus] = (receiptsByDisplayStatus[displayStatus] ?? 0) + 1;
  }

  const latestBlock = await provider.getBlockNumber().catch(() => null);
  const indexerLagBlocks = latestBlock !== null && state ? Math.max(0, latestBlock - state.lastProcessedBlock) : 0;

  return {
    organizations: { centres, brands },
    activePickers,
    receipts: receiptsByDisplayStatus,
    kgAnchored: gramsToKgNumber(anchoredReceipts.reduce((s, r) => s + r.weightGrams, 0)),
    payouts: { paid: paidPayouts, failed: failedPayouts },
    smsToday: { sent: allSms.filter((s) => s.status === "SENT" || s.status === "DELIVERED").length, failed: allSms.filter((s) => s.status === "FAILED").length },
    indexerLagBlocks,
    latestAuditEvents: recentAudit.map(toAuditEntryDto),
    integrationsHealth: {
      sms: "ok" as const,
      ussd: "ok" as const,
      mpesa: "ok" as const,
      ipfs: config.STORAGE_PROVIDER === "none" ? ("down" as const) : ("ok" as const),
      blockchain: chainStatus.contractDeployed ? ("ok" as const) : ("down" as const),
    },
  };
}

async function toOrgListDto(org: { id: string; type: string; name: string; code: string; county: string | null; status: string }) {
  const users = await prisma.user.findMany({ where: { organizationId: org.id } });
  return { ...toOrganizationDto(org), wallets: users.length, onChainApproved: users.some((u) => u.onChainApproved) };
}

export async function listOrganizations(filters: { type?: string }) {
  const rows = await prisma.organization.findMany({
    where: { type: filters.type ? toBackendOrgType(filters.type as "BUYING_CENTRE" | "BRAND") : { in: ["CENTRE", "BRAND"] } },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(rows.map(toOrgListDto));
}

export interface CreateOrgInput {
  type: "BUYING_CENTRE" | "BRAND";
  name: string;
  code: string;
  county?: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export async function createOrganization(user: SessionUser, input: CreateOrgInput) {
  const existing = await prisma.organization.findUnique({ where: { code: input.code.toUpperCase() } });
  if (existing) throw new AppError("CONFLICT", `Code ${input.code} is already used.`);
  const org = await prisma.organization.create({ data: { ...input, type: toBackendOrgType(input.type), code: input.code.toUpperCase() } });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ORG_CREATED", entityType: "Organization", entityId: org.id, summary: `Created ${org.type} ${org.name} (${org.code}).` });
  return toOrganizationDto(org);
}

export async function getOrganization(id: string) {
  const org = await prisma.organization.findUnique({ where: { id }, include: { users: true, eprTargets: true } });
  if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
  const dto = toOrganizationDto(org);
  if (!dto) throw new AppError("NOT_FOUND", "Organisation not found.");
  return {
    ...dto,
    wallets: org.users.map((u) => ({ address: u.walletAddress, name: u.displayName, role: u.role as "CENTRE_OPERATOR" | "BRAND_OFFICER", onChainApproved: u.onChainApproved, status: u.status as "ACTIVE" | "SUSPENDED" })),
    targets: org.eprTargets.map((t) => ({ year: t.year, material: t.material, targetKg: gramsToKgNumber(t.targetGrams) })),
  };
}

export async function updateOrganization(user: SessionUser, id: string, input: Partial<Omit<CreateOrgInput, "type">> & { status?: "ACTIVE" | "SUSPENDED" }) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
  const updated = await prisma.organization.update({ where: { id }, data: input });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ORG_UPDATED", entityType: "Organization", entityId: id, summary: `Updated ${org.name}.`, before: org, after: updated });
  return toOrganizationDto(updated);
}

export async function setEprTargets(user: SessionUser, orgId: string, targets: { year: number; material: string; targetKg: number }[]) {
  await prisma.$transaction(
    targets.map((t) =>
      prisma.eprTarget.upsert({
        where: { brandOrgId_year_material: { brandOrgId: orgId, year: t.year, material: t.material } },
        create: { brandOrgId: orgId, year: t.year, material: t.material, targetGrams: Math.round(t.targetKg * 1000) },
        update: { targetGrams: Math.round(t.targetKg * 1000) },
      })
    )
  );
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ORG_UPDATED", entityType: "Organization", entityId: orgId, summary: "EPR targets updated." });
}

export async function addOrgUser(user: SessionUser, orgId: string, input: { walletAddress: string; displayName: string; role: "CENTRE_OPERATOR" | "BRAND_OFFICER" }) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
  const expectedRole = org.type === "CENTRE" ? "CENTRE_OPERATOR" : org.type === "BRAND" ? "BRAND_OFFICER" : null;
  if (expectedRole && input.role !== expectedRole) throw new AppError("VALIDATION", `A ${org.type} organisation needs role ${expectedRole}.`, { role: "Wrong role for this organisation type" });

  const walletAddress = input.walletAddress.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { walletAddress } });
  if (existing) throw new AppError("CONFLICT", "This wallet is already registered.");

  const created = await prisma.user.create({ data: { walletAddress, displayName: input.displayName, role: input.role, organizationId: orgId } });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "USER_ADDED", entityType: "User", entityId: created.id, summary: `Added ${input.role} ${walletAddress} to ${org.name}.` });
  return toUserDto(created);
}

export async function listUsers() {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toUserDto);
}

export async function updateUser(actingUser: SessionUser, id: string, input: { displayName?: string; status?: "ACTIVE" | "SUSPENDED" }) {
  if (input.status === "SUSPENDED" && id === actingUser.id) throw new AppError("VALIDATION", "You can't suspend your own account.");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError("NOT_FOUND", "User not found.");
  const updated = await prisma.user.update({ where: { id }, data: input });
  if (input.status === "SUSPENDED") {
    await prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await writeAudit(prisma, { actorType: "USER", actorId: actingUser.id, action: "USER_SUSPENDED", entityType: "User", entityId: id, summary: `Suspended ${target.displayName}.` });
  }
  return toUserDto(updated);
}

/** After the admin signs addBuyingCentre/addBrand/removeBuyingCentre/removeBrand in the browser. */
export async function roleSyncFromTx(user: SessionUser, txHash: string): Promise<{ updated: number }> {
  if (!chainStatus.contractDeployed || !chainStatus.contractAddress) throw new AppError("CHAIN_UNAVAILABLE", "The smart contract isn't deployed.");
  const receipt = await provider.waitForTransaction(txHash, config.CONFIRMATIONS, config.TX_WAIT_TIMEOUT_MS);
  if (!receipt || receipt.status !== 1) throw new AppError("TX_MISMATCH", "Transaction reverted or did not confirm.");
  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== user.walletAddress.toLowerCase() || receipt.to?.toLowerCase() !== chainStatus.contractAddress.toLowerCase()) {
    throw new AppError("TX_MISMATCH", "This transaction wasn't sent to TakaTrace from your wallet.");
  }

  const contract = getContract();
  let updated = 0;
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }
    if (!parsed) continue;
    const address: string | undefined = parsed.args.centre ?? parsed.args.brand;
    if (!address) continue;
    const approved = parsed.name === "BuyingCentreAdded" || parsed.name === "BrandAdded";
    const removed = parsed.name === "BuyingCentreRemoved" || parsed.name === "BrandRemoved";
    if (!approved && !removed) continue;

    clearRoleCache(address);
    const result = await prisma.user.updateMany({ where: { walletAddress: address.toLowerCase() }, data: { onChainApproved: approved, onChainCheckedAt: new Date() } });
    if (removed) await prisma.session.updateMany({ where: { user: { walletAddress: address.toLowerCase() }, revokedAt: null }, data: { revokedAt: new Date() } });
    updated += result.count;
  }

  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ROLE_SYNCED", entityType: "User", entityId: user.id, summary: `Role sync from ${txHash} updated ${updated} user(s).` });
  return { updated };
}

export async function roleCheck() {
  const users = await prisma.user.findMany();
  const mismatches = [];
  for (const u of users) {
    const role = await getOnChainRole(u.walletAddress);
    const expected = u.role === "ADMIN" ? role.isAdmin : u.role === "CENTRE_OPERATOR" ? role.isBuyingCentre : role.isBrand;
    if (expected !== u.onChainApproved) {
      await prisma.user.update({ where: { id: u.id }, data: { onChainApproved: expected, onChainCheckedAt: new Date() } });
      mismatches.push({ userId: u.id, walletAddress: u.walletAddress, was: u.onChainApproved, now: expected });
    }
  }
  return { checked: users.length, mismatches };
}

export async function getChainAdminInfo() {
  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  const latestBlock = await provider.getBlockNumber().catch(() => null);
  const needsReanchor = await prisma.receipt.count({ where: { status: "NEEDS_REANCHOR" } });
  const lagBlocks = latestBlock !== null && state ? Math.max(0, latestBlock - state.lastProcessedBlock) : 0;
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const eventsProcessed = await prisma.chainEvent.count();

  return {
    chainId: config.CHAIN_ID,
    rpcUrl: config.RPC_URL,
    latestBlock: latestBlock ?? 0,
    contractAddress: chainStatus.contractAddress ?? "",
    adminAddress: admin?.walletAddress ?? "",
    indexer: {
      lastProcessedBlock: state?.lastProcessedBlock ?? -1,
      lagBlocks,
      eventsProcessed,
      lastError: state?.lastError ?? null,
      status: state?.lastError ? ("STOPPED" as const) : lagBlocks > 0 ? ("CATCHING_UP" as const) : ("RUNNING" as const),
    },
    genesisHash: state?.genesisHash ?? "",
    epoch: state?.epoch ?? 1,
    chainReset: Boolean(state?.resetDetectedAt),
    receiptsNeedingReanchor: needsReanchor,
  };
}

export async function resyncChain(user: SessionUser): Promise<void> {
  const state = await prisma.chainState.findUnique({ where: { id: 1 } });
  if (!state) throw new AppError("CHAIN_UNAVAILABLE", "No chain state yet.");
  await prisma.$transaction([
    prisma.chainEvent.deleteMany({ where: { epoch: state.epoch } }),
    prisma.chainState.update({ where: { id: 1 }, data: { lastProcessedBlock: -1 } }),
  ]);
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "ROLE_SYNCED", entityType: "ChainState", entityId: "1", summary: "Chain resync requested; indexer will replay all events." });
}

export async function runIntegrityScan() {
  const receipts = await prisma.receipt.findMany({ where: { status: "ANCHORED" } });
  let match = 0;
  let mismatch = 0;
  const mismatches: { receiptId: string; reason: string }[] = [];
  for (const r of receipts) {
    const recordText = buildRecordText({ receiptId: r.receiptId, pickerCode: r.pickerCode, material: r.material, weightGrams: r.weightGrams, weighedOn: r.weighedOn, photoCid: r.photoCid, salt: r.salt });
    const currentHash = hashRecordText(recordText);
    const ok = currentHash.toLowerCase() === r.dataHash.toLowerCase();
    if (ok) match++;
    else {
      mismatch++;
      mismatches.push({ receiptId: r.receiptId, reason: "Stored fields no longer hash to the on-chain value." });
    }
    const integrity = ok ? "MATCH" : "MISMATCH";
    if (integrity !== r.integrity) {
      await prisma.receipt.update({ where: { id: r.id }, data: { integrity, integrityCheckedAt: new Date() } });
    }
  }
  return { checked: receipts.length, match, mismatch, notOnChain: 0, mismatches };
}

export async function listAudit(filters: { action?: string; entityId?: string }) {
  const rows = await prisma.auditLog.findMany({
    where: { action: filters.action, entityId: filters.entityId },
    orderBy: { at: "desc" },
    take: 500,
  });
  return rows.map(toAuditEntryDto);
}

export async function getIntegrations() {
  const sources = { AT_SMS_INBOUND: "sms", AT_SMS_DELIVERY: "sms", AT_USSD: "ussd", MPESA_RESULT: "mpesa", MPESA_TIMEOUT: "mpesa" } as const;
  const callsByCard = new Map<string, { at: string; status: string; summary: string }[]>();
  for (const [source, card] of Object.entries(sources)) {
    const calls = await prisma.webhookCall.findMany({ where: { source }, orderBy: { receivedAt: "desc" }, take: 20 });
    const list = callsByCard.get(card) ?? [];
    list.push(...calls.map((c) => ({ at: c.receivedAt.toISOString(), status: String(c.httpStatus), summary: c.error ?? `${source} received` })));
    callsByCard.set(card, list);
  }

  return [
    { name: "sms" as const, mode: config.SMS_PROVIDER, health: "ok" as const, webhookUrl: `${config.PUBLIC_BASE_URL}/webhooks/sms/inbound/${config.WEBHOOK_TOKEN}`, recentCalls: callsByCard.get("sms") ?? [] },
    { name: "ussd" as const, mode: config.USSD_PROVIDER, health: "ok" as const, webhookUrl: `${config.PUBLIC_BASE_URL}/webhooks/ussd/${config.WEBHOOK_TOKEN}`, recentCalls: callsByCard.get("ussd") ?? [] },
    { name: "mpesa" as const, mode: config.PAYOUT_PROVIDER, health: "ok" as const, webhookUrl: `${config.PUBLIC_BASE_URL}/webhooks/mpesa/b2c/result/${config.WEBHOOK_TOKEN}`, recentCalls: callsByCard.get("mpesa") ?? [] },
    { name: "ipfs" as const, mode: config.STORAGE_PROVIDER, health: config.STORAGE_PROVIDER === "none" ? ("down" as const) : ("ok" as const), recentCalls: [] },
    { name: "blockchain" as const, mode: config.CHAIN_ID === 31337 ? "local" : "sepolia", health: chainStatus.contractDeployed ? ("ok" as const) : ("down" as const), recentCalls: [] },
  ];
}

export async function testSmsIntegration(phone: string): Promise<void> {
  await sendSms({ phone, template: "HELP", vars: {}, bypassOptOut: true });
}

export async function testPayoutIntegration(): Promise<void> {
  const result = await payoutProvider.send({ payoutId: "test", originatorConversationId: `TT-admintest-${Date.now()}`, phone: config.MPESA_SANDBOX_FORCE_MSISDN, amountKes: 10, remarks: "TakaTrace integration test" });
  if (!result.accepted) throw new AppError("PROVIDER_ERROR", result.error ?? "Test payout was rejected.");
}

export async function testStorageIntegration(): Promise<{ cid: string }> {
  const bytes = new TextEncoder().encode(`TakaTrace storage test ${Date.now()}`);
  const cid = await storage.put(bytes);
  const chunks: Uint8Array[] = [];
  for await (const chunk of storage.get(cid)) chunks.push(chunk);
  if (chunks.length === 0) throw new AppError("PROVIDER_ERROR", "Could not read back the test file.");
  return { cid };
}
