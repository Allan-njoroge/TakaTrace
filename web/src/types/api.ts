// Types matching BACKEND_SPEC.md sections 6, 7, 9, 11, 12.
// Keep in sync with the backend; these are the shapes the frontend fetches and sends.

export type Material = "PET" | "HDPE" | "LDPE" | "PP" | "PS" | "OTHER";

export type OrganizationType = "BUYING_CENTRE" | "BRAND";

export type Role = "CENTRE_OPERATOR" | "BRAND_OFFICER" | "ADMIN";

/** Internal lifecycle state (section 9). */
export type ReceiptStatus =
  | "DRAFT"
  | "ANCHORING"
  | "ANCHORED"
  | "ANCHOR_FAILED"
  | "NEEDS_REANCHOR"
  | "SUPERSEDED";

/** Status shown in chips (section 4.5), overlays claimed/disputed onto the internal status. */
export type DisplayStatus =
  | "DRAFT"
  | "ANCHORING"
  | "ANCHORED"
  | "CLAIMED"
  | "DISPUTED"
  | "SUPERSEDED"
  | "ANCHOR_FAILED"
  | "NEEDS_REANCHOR";

export type Verdict =
  | "MATCH"
  | "MISMATCH"
  | "NOT_ON_CHAIN"
  | "CHAIN_UNAVAILABLE"
  | "ON_CHAIN_UNKNOWN_RECORD";

export type PayoutStatus = "PENDING" | "SENT" | "PAID" | "FAILED" | "UNKNOWN";

export type SmsStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "UPHELD" | "REJECTED";

export type ClaimStatus = "CONFIRMED" | "STALE";

export interface ApiErrorBody {
  error: {
    code:
      | "VALIDATION"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "ROLE_NOT_ON_CHAIN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "TX_MISMATCH"
      | "INTEGRITY_MISMATCH"
      | "UNDER_DISPUTE"
      | "RATE_LIMITED"
      | "PROVIDER_ERROR"
      | "CHAIN_UNAVAILABLE"
      | "INTERNAL";
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface User {
  id: string;
  walletAddress: string;
  displayName: string;
  role: Role;
  onChainApproved: boolean;
}

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  code: string;
  county: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface Me {
  user: User;
  organization: Organization | null;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  time: string;
  db: "ok" | "down";
  chain: {
    chainId: number;
    latestBlock: number;
    contractAddress: string;
    contractDeployed: boolean;
    epoch: string;
    chainReset: boolean;
    indexerLagBlocks: number;
  };
  providers: {
    sms: "mock" | "sandbox" | "down";
    ussd: "mock" | "sandbox" | "down";
    payout: "mock" | "sandbox" | "down";
    storage: "local" | "pinata" | "down";
  };
}

export interface PublicStats {
  kgAnchored: number;
  receiptsRecorded: number;
  receiptsAnchored: number;
  receiptsClaimed: number;
  kgClaimed: number;
  doubleClaims: 0;
  pickersPaidThisMonth: number;
  kesPaidThisMonth: number;
  centres: number;
  brands: number;
  updatedAt: string;
}

export interface PublicMaterial {
  material: Material;
  label: string;
  kgAnchored: number;
  centres: number;
  receipts: number;
}

export interface PublicPartner {
  name: string;
  type: OrganizationType;
}

export interface PublicActivityItem {
  receiptId: string;
  centre: string;
  material: Material;
  weightKg: number;
  time: string;
}

export interface PublicActivity {
  anchored: PublicActivityItem[];
  claims: (PublicActivityItem & { brand: string })[];
}

export interface ContractInfo {
  address: string;
  chainId: number;
  network: string;
  explorerUrl: string;
  adminAddress: string;
  deployedAt: string;
}

export interface VerifyOnChain {
  dataHash: string;
  recordedBy: string;
  recordedAt: string;
  claimed: boolean;
  claimedBy: string | null;
  claimedByName: string | null;
  disputed: boolean;
  anchorTx: string | null;
  claimTx: string | null;
}

export interface VerifyResponse {
  receiptId: string;
  verdict: Verdict;
  record: {
    centre: { name: string; code: string; county: string };
    pickerCode: string;
    material: Material;
    weightKg: number;
    weighedOn: string;
    photo: { cid: string; url: string } | null;
    displayStatus: DisplayStatus;
    supersededBy: string | null;
    corrects: string | null;
  };
  recordText: string;
  serverHash: string;
  onChain: VerifyOnChain | null;
  contract: { address: string; chainId: number; explorerUrl: string };
  checkedAt: string;
}

export interface Picker {
  id: string;
  code: string;
  firstName: string;
  lastName: string | null;
  phoneMasked: string;
  phone?: string; // only present on the centre's own detail view
  language: "en" | "sw";
  registeredOn: string;
  receiptsCount: number;
  kgTotal: number;
  lastWeighIn: string | null;
  status: "ACTIVE" | "SUSPENDED" | "CONSENT_WITHDRAWN";
}

export interface UploadedPhoto {
  id: string;
  cid: string;
  url: string;
  sha256: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface Receipt {
  receiptId: string;
  pickerCode: string;
  centre: { name: string; code: string };
  material: Material;
  weightKg: number;
  weighedOn: string;
  payoutKes: number;
  photo: { cid: string; url: string } | null;
  note: string | null;
  status: ReceiptStatus;
  displayStatus: DisplayStatus;
  recordText: string;
  dataHash: string;
  anchorTx: string | null;
  claimedBy: string | null;
  disputed: boolean;
  supersededBy: string | null;
  corrects: string | null;
  createdAt: string;
}

export interface TimelineEntry {
  type:
    | "CREATED"
    | "ANCHOR_SENT"
    | "ANCHORED"
    | "ANCHOR_FAILED"
    | "SMS_SENT"
    | "SMS_DELIVERED"
    | "SMS_FAILED"
    | "PAYOUT_SENT"
    | "PAYOUT_PAID"
    | "PAYOUT_FAILED"
    | "DISPUTE_OPENED"
    | "DISPUTE_RESOLVED"
    | "CLAIMED";
  at: string;
  detail: string;
  txHash?: string;
}

export interface CentreSummary {
  kgToday: number;
  weighInsToday: number;
  kesPaidToday: number;
  openDisputes: number;
  needsAttention: Array<{
    kind: "DRAFT" | "ANCHOR_FAILED" | "PAYOUT_FAILED" | "DISPUTE_PENDING";
    receiptId?: string;
    disputeId?: string;
    label: string;
  }>;
  kgByMaterialLast14Days: Array<{ date: string } & Partial<Record<Material, number>>>;
}

export interface Price {
  material: Material;
  pricePerKgKes: number;
  effectiveFrom: string;
}

export interface Payout {
  id: string;
  receiptId: string;
  pickerCode: string;
  amountKes: number;
  provider: "MOCK" | "MPESA_SANDBOX";
  status: PayoutStatus;
  mpesaTransactionId: string | null;
  failureReason: string | null;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  receiptId: string;
  openedBy: "PICKER_USSD" | "PICKER_SMS" | "CENTRE";
  reason: string;
  message: string;
  status: DisputeStatus;
  openedAt: string;
  ageHours: number;
}

export interface Claim {
  id: string;
  receiptId: string;
  material: Material;
  weightKg: number;
  centre: string;
  claimedAt: string;
  complianceYear: number;
  productLine: string | null;
  txHash: string;
  status: ClaimStatus;
}

export interface BrandSummary {
  year: number;
  targets: Array<{ material: Material; targetKg: number; claimedKg: number }>;
  totalTargetKg: number;
  totalClaimedKg: number;
  recentClaims: Claim[];
}

export interface AvailableCredit {
  receiptId: string;
  centre: { name: string; code: string; county: string };
  material: Material;
  weightKg: number;
  weighedOn: string;
  verified: true;
}

export interface AdminOverview {
  organizations: { centres: number; brands: number };
  activePickers: number;
  receipts: Record<DisplayStatus, number>;
  kgAnchored: number;
  payouts: { paid: number; failed: number };
  smsToday: { sent: number; failed: number };
  indexerLagBlocks: number;
  latestAuditEvents: AuditEntry[];
  integrationsHealth: Record<"sms" | "ussd" | "mpesa" | "ipfs" | "blockchain", "ok" | "degraded" | "down">;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorType: "WALLET" | "SYSTEM" | "PICKER" | "WEBHOOK";
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  ip: string;
  before?: unknown;
  after?: unknown;
}

export interface ChainStatus {
  chainId: number;
  rpcUrl: string;
  latestBlock: number;
  contractAddress: string;
  adminAddress: string;
  indexer: {
    lastProcessedBlock: number;
    lagBlocks: number;
    eventsProcessed: number;
    lastError: string | null;
    status: "RUNNING" | "STOPPED" | "CATCHING_UP";
  };
  genesisHash: string;
  epoch: number;
  chainReset: boolean;
  receiptsNeedingReanchor: number;
}

export interface IntegrityScanResult {
  checked: number;
  match: number;
  mismatch: number;
  notOnChain: number;
  mismatches: Array<{ receiptId: string; reason: string }>;
}

export type DemoAnchorCancelReason = "USER_REJECTED" | "WRONG_NETWORK" | "OTHER";
