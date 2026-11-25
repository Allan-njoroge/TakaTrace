import { useState } from "react";
import { Link } from "react-router";
import { BadgeCheck } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useClaims } from "../../hooks/useBrand";
import { formatDate, formatKg } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";
import type { Material } from "../../types/api";

export default function ClaimsPage() {
  useDocumentTitle("My claims");
  const [year, setYear] = useState<number | undefined>(undefined);
  const [material, setMaterial] = useState<Material | undefined>(undefined);
  const claims = useClaims({ year, material });

  const totalKg = claims.data?.items.reduce((sum, c) => sum + c.weightKg, 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">My claims</h1>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Select label="Year" value={year ?? ""} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)} className="w-32">
          <option value="">All</option>
          {[2026, 2025, 2024].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select label="Material" value={material ?? ""} onChange={(e) => setMaterial((e.target.value as Material) || undefined)} className="w-44">
          <option value="">All</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_LABEL[m]}
            </option>
          ))}
        </Select>
        {claims.data && <p className="ml-auto text-sm text-ink-600">Total: {formatKg(totalKg)}</p>}
      </div>

      <div className="mt-6">
        {claims.isLoading ? (
          <Skeleton className="h-64" />
        ) : claims.data && claims.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Material</TH>
                  <TH className="text-right">Kg</TH>
                  <TH>Centre</TH>
                  <TH>Claimed</TH>
                  <TH>Year</TH>
                  <TH>Product line</TH>
                  <TH>Transaction</TH>
                </TR>
              </THead>
              <TBody>
                {claims.data.items.map((claim) => (
                  <TR key={claim.id}>
                    <TDMono>
                      <Link to={`/verify/${claim.receiptId}`} target="_blank" rel="noreferrer">
                        {claim.receiptId}
                      </Link>
                    </TDMono>
                    <TD>{MATERIAL_LABEL[claim.material]}</TD>
                    <TD className="text-right">{formatKg(claim.weightKg)}</TD>
                    <TD>{claim.centre}</TD>
                    <TD>{formatDate(claim.claimedAt)}</TD>
                    <TD>{claim.complianceYear}</TD>
                    <TD>{claim.productLine ?? "—"}</TD>
                    <TD>
                      <HashDisplay value={claim.txHash} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={BadgeCheck} title="No claims yet." />
        )}
      </div>
    </div>
  );
}
