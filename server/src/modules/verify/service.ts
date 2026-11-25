import { chainStatus, getContract } from "../../chain/provider.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { config } from "../../config.js";
import { emitEvent } from "../../lib/events.js";
import { gramsToKgNumber } from "../../lib/dto.js";
import { buildRecordText, hashRecordText } from "../../lib/record.js";

export interface VerifyResult {
  receiptId: string;
  verdict: "MATCH" | "MISMATCH" | "NOT_ON_CHAIN" | "ON_CHAIN_UNKNOWN_RECORD" | "CHAIN_UNAVAILABLE";
  record?: unknown;
  recordText?: string;
  serverHash?: string;
  onChain: unknown;
  contract: { address: string; chainId: number; explorerUrl: string };
  checkedAt: string;
}

export async function verifyReceipt(receiptId: string): Promise<VerifyResult | null> {
  const receipt = await prisma.receipt.findUnique({
    where: { receiptId },
    include: { organization: true, claims: { include: { brandOrg: true } }, anchors: true },
  });

  const onChain = await readOnChain(receiptId);

  if (!receipt) {
    if (onChain) return buildResult(receiptId, "ON_CHAIN_UNKNOWN_RECORD", undefined, undefined, onChain);
    return null;
  }

  const recordText = buildRecordText({
    receiptId: receipt.receiptId,
    pickerCode: receipt.pickerCode,
    material: receipt.material,
    weightGrams: receipt.weightGrams,
    weighedOn: receipt.weighedOn,
    photoCid: receipt.photoCid,
    salt: receipt.salt,
  });
  const serverHash = hashRecordText(recordText);

  let verdict: VerifyResult["verdict"];
  if (!chainStatus.contractDeployed) verdict = "CHAIN_UNAVAILABLE";
  else if (!onChain) verdict = "NOT_ON_CHAIN";
  else verdict = onChain.dataHash.toLowerCase() === serverHash.toLowerCase() ? "MATCH" : "MISMATCH";

  if (verdict !== receipt.integrity) {
    await prisma.receipt.update({ where: { id: receipt.id }, data: { integrity: verdict === "CHAIN_UNAVAILABLE" ? receipt.integrity : verdict, integrityCheckedAt: new Date() } });
    if (verdict === "MISMATCH") {
      await writeAudit(prisma, { actorType: "SYSTEM", action: "INTEGRITY_MISMATCH_DETECTED", entityType: "Receipt", entityId: receipt.id, summary: `Verification found a mismatch for ${receiptId}.` });
      emitEvent({ name: "integrity.mismatch", data: { receiptId }, audiences: [{ kind: "role", role: "ADMIN" }] });
    }
  }

  const claim = receipt.claims.find((c) => c.status === "CONFIRMED");
  const confirmedAnchor = receipt.anchors.find((a) => a.status === "CONFIRMED");
  const supersededBy = await prisma.receipt.findFirst({ where: { correctsId: receipt.id }, select: { receiptId: true } });

  const record = {
    centre: { name: receipt.organization.name, code: receipt.organization.code, county: receipt.organization.county ?? "" },
    pickerCode: receipt.pickerCode,
    material: receipt.material,
    weightKg: gramsToKgNumber(receipt.weightGrams),
    weighedOn: receipt.weighedOn,
    photo: receipt.photoCid ? { cid: receipt.photoCid, url: `${config.PUBLIC_BASE_URL}/api/photos/${receipt.photoCid}` } : null,
    displayStatus: displayStatus(receipt),
    supersededBy: supersededBy?.receiptId ?? null,
    corrects: receipt.correctsId,
  };

  return buildResult(receiptId, verdict, record, recordText, onChain, serverHash, claim?.txHash, claim?.brandOrg.name, confirmedAnchor?.txHash);
}

export async function verifyRecordText(recordText: string) {
  const parts = recordText.split("|");
  const receiptId = parts[1];
  if (!receiptId) return { verdict: "NOT_FOUND" as const };
  const result = await verifyReceipt(receiptId);
  if (!result) return { verdict: "NOT_FOUND" as const };
  const serverHash = hashRecordText(recordText);
  return { ...result, submittedTextMatchesChain: result.onChain != null && typeof result.onChain === "object" && "dataHash" in result.onChain && (result.onChain as { dataHash: string }).dataHash.toLowerCase() === serverHash.toLowerCase() };
}

async function readOnChain(receiptId: string) {
  if (!chainStatus.contractDeployed) return null;
  try {
    const contract = getContract();
    const [dataHash, recordedBy, recordedAt, claimed, claimedBy] = await contract.getReceipt(receiptId);
    const disputed: boolean = await contract.isDisputed(receiptId);
    if (recordedAt === 0n) return null;
    return { dataHash: dataHash as string, recordedBy: recordedBy as string, recordedAt: new Date(Number(recordedAt) * 1000), claimed: claimed as boolean, claimedBy: claimedBy as string, disputed };
  } catch {
    return null;
  }
}

function displayStatus(receipt: { status: string; claimStatus: string }): string {
  if (receipt.status === "SUPERSEDED") return "SUPERSEDED";
  if (receipt.claimStatus === "CLAIMED") return "CLAIMED";
  return receipt.status;
}

function buildResult(
  receiptId: string,
  verdict: VerifyResult["verdict"],
  record: unknown,
  recordText: string | undefined,
  onChain: Awaited<ReturnType<typeof readOnChain>>,
  serverHash?: string,
  claimTx?: string,
  claimedByName?: string,
  anchorTx?: string
): VerifyResult {
  return {
    receiptId,
    verdict,
    record,
    recordText,
    serverHash,
    onChain: onChain
      ? {
          dataHash: onChain.dataHash,
          recordedBy: onChain.recordedBy,
          recordedAt: onChain.recordedAt.toISOString(),
          claimed: onChain.claimed,
          claimedBy: onChain.claimed ? onChain.claimedBy : null,
          claimedByName: onChain.claimed ? (claimedByName ?? null) : null,
          disputed: onChain.disputed,
          anchorTx: anchorTx ?? null,
          claimTx: claimTx ?? null,
        }
      : null,
    contract: { address: chainStatus.contractAddress ?? "", chainId: config.CHAIN_ID, explorerUrl: "" },
    checkedAt: new Date().toISOString(),
  };
}
