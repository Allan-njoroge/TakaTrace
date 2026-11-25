import { getContract } from "../../chain/provider.js";
import { chainStatus } from "../../chain/provider.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { gramsToKgNumber } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { buildRecordText, hashRecordText } from "../../lib/record.js";
import type { SessionUser } from "../../middleware/session.js";

interface DetailedRow {
  receipt_id: string;
  weighed_on: string;
  centre_code: string;
  centre_name: string;
  county: string | null;
  material: string;
  weight_kg: string;
  data_hash: string;
  anchor_tx: string;
  claim_tx: string;
  claim_block: number;
  claimed_at_utc: string;
  product_line: string;
  verification: "MATCH" | "MISMATCH";
}

export interface EprReport {
  brand: string;
  year: number;
  contractAddress: string;
  totalsByMaterial: { material: string; kg: number }[];
  totalsByMonth: { month: string; kg: number }[];
  lines: { receiptId: string; material: string; weightKg: number; dataHash: string; claimTxHash: string; blockNumber: number; claimedAt: string }[];
  mismatches: { receiptId: string; reason: string }[];
  /** Kept for the CSV export (section 19.2's full column set); not part of the frontend's EprReport type. */
  detailedRows: DetailedRow[];
  detailedMismatches: DetailedRow[];
}

export async function generateEprReport(user: SessionUser, year: number): Promise<EprReport> {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a brand.");
  const brand = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });

  const claims = await prisma.claim.findMany({
    where: { brandOrgId: brand.id, complianceYear: year, status: "CONFIRMED" },
    include: { receipt: { include: { organization: true } } },
    orderBy: { claimedAt: "asc" },
  });

  const detailedRows: DetailedRow[] = [];
  const detailedMismatches: DetailedRow[] = [];
  let checked = 0;

  for (const claim of claims) {
    const r = claim.receipt;
    const recordText = buildRecordText({ receiptId: r.receiptId, pickerCode: r.pickerCode, material: r.material, weightGrams: r.weightGrams, weighedOn: r.weighedOn, photoCid: r.photoCid, salt: r.salt });
    const currentHash = hashRecordText(recordText);
    let onChainOk = currentHash.toLowerCase() === r.dataHash.toLowerCase();

    if (onChainOk && checked < 500 && chainStatus.contractDeployed) {
      checked++;
      try {
        const contract = getContract();
        const [, , , , claimedBy] = await contract.getReceipt(r.receiptId);
        onChainOk = typeof claimedBy === "string" && claimedBy.toLowerCase() === claim.claimedByAddress.toLowerCase();
      } catch {
        onChainOk = false;
      }
    }

    const row: DetailedRow = {
      receipt_id: r.receiptId,
      weighed_on: r.weighedOn,
      centre_code: r.organization.code,
      centre_name: r.organization.name,
      county: r.organization.county,
      material: r.material,
      weight_kg: gramsToKgNumber(r.weightGrams).toFixed(2),
      data_hash: r.dataHash,
      anchor_tx: claim.txHash,
      claim_tx: claim.txHash,
      claim_block: claim.blockNumber,
      claimed_at_utc: claim.claimedAt.toISOString(),
      product_line: claim.productLine ?? "",
      verification: onChainOk ? "MATCH" : "MISMATCH",
    };
    if (onChainOk) detailedRows.push(row);
    else detailedMismatches.push(row);
  }

  const byMaterial = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const r of detailedRows) {
    const kg = Number(r.weight_kg);
    byMaterial.set(r.material, (byMaterial.get(r.material) ?? 0) + kg);
    const month = r.weighed_on.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + kg);
  }

  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "REPORT_GENERATED", entityType: "Organization", entityId: brand.id, summary: `EPR report generated for ${year}.` });

  return {
    brand: brand.name,
    year,
    contractAddress: chainStatus.contractAddress ?? "",
    totalsByMaterial: Array.from(byMaterial.entries()).map(([material, kg]) => ({ material, kg })),
    totalsByMonth: Array.from(byMonth.entries()).map(([month, kg]) => ({ month, kg })),
    lines: detailedRows.map((r) => ({
      receiptId: r.receipt_id,
      material: r.material,
      weightKg: Number(r.weight_kg),
      dataHash: r.data_hash,
      claimTxHash: r.claim_tx,
      blockNumber: r.claim_block,
      claimedAt: r.claimed_at_utc,
    })),
    mismatches: detailedMismatches.map((r) => ({ receiptId: r.receipt_id, reason: "On-chain hash or claimant no longer matches the stored record." })),
    detailedRows,
    detailedMismatches,
  };
}

export function eprReportToCsv(report: EprReport): string {
  const columns = ["receipt_id", "weighed_on", "centre_code", "centre_name", "county", "material", "weight_kg", "data_hash", "anchor_tx", "claim_tx", "claim_block", "claimed_at_utc", "product_line", "verification"];
  const header = columns.join(",") + "\n";
  const rows = [...report.detailedRows, ...report.detailedMismatches].map((r) => columns.map((c) => csvEscape(String((r as unknown as Record<string, unknown>)[c] ?? ""))).join(","));
  return header + rows.join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
