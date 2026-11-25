import { useState } from "react";
import { Link } from "react-router";
import { FileClock } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { ReceiptStatusChip } from "../../components/ui/StatusChip";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useReceipts } from "../../hooks/useReceipts";
import { config } from "../../config";
import { formatKes, formatKg } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";

const STATUS_OPTIONS = ["", "DRAFT", "ANCHORED", "CLAIMED", "DISPUTED", "SUPERSEDED", "ANCHOR_FAILED"];

export default function CentreReceiptsPage() {
  useDocumentTitle("Receipts");
  const [status, setStatus] = useState("");
  const [material, setMaterial] = useState("");
  const [q, setQ] = useState("");
  const receipts = useReceipts({ status: status || undefined, material: material || undefined, q: q || undefined });

  const hasFilters = Boolean(status || material || q);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Receipts</h1>
        <div className="flex gap-3">
          <a
            href={`${config.apiUrl}/api/receipts/export.csv?${new URLSearchParams({
              ...(status ? { status } : {}),
              ...(material ? { material } : {}),
              ...(q ? { q } : {}),
            }).toString()}`}
            className="inline-flex min-h-11 items-center rounded-full border border-ink-900 px-5 text-sm font-semibold text-ink-900"
          >
            Export CSV
          </a>
          <LinkButton to="/app/centre/weigh-ins/new">New weigh-in</LinkButton>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Input label="Search" placeholder="Receipt ID or picker code" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option || "All"}
            </option>
          ))}
        </Select>
        <Select label="Material" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-44">
          <option value="">All</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_LABEL[m]}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            icon={null}
            onClick={() => {
              setStatus("");
              setMaterial("");
              setQ("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="mt-6">
        {receipts.isLoading ? (
          <Skeleton className="h-64" />
        ) : receipts.data && receipts.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Date</TH>
                  <TH>Picker</TH>
                  <TH>Material</TH>
                  <TH className="text-right">Weight</TH>
                  <TH className="text-right">Payout</TH>
                  <TH>Status</TH>
                  <TH>Claimed by</TH>
                </TR>
              </THead>
              <TBody>
                {receipts.data.items.map((receipt) => (
                  <TR key={receipt.receiptId} className="hover:bg-cream-100">
                    <TDMono>
                      <Link to={`/app/centre/receipts/${receipt.receiptId}`}>{receipt.receiptId}</Link>
                    </TDMono>
                    <TD>{receipt.weighedOn}</TD>
                    <TDMono>{receipt.pickerCode}</TDMono>
                    <TD>{MATERIAL_LABEL[receipt.material]}</TD>
                    <TD className="text-right">{formatKg(receipt.weightKg)}</TD>
                    <TD className="text-right">{formatKes(receipt.payoutKes)}</TD>
                    <TD>
                      <ReceiptStatusChip status={receipt.displayStatus} />
                    </TD>
                    <TD>{receipt.claimedBy ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState
            icon={FileClock}
            title={hasFilters ? "No weigh-ins match these filters." : "No weigh-ins yet. Record the first one."}
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  icon={null}
                  onClick={() => {
                    setStatus("");
                    setMaterial("");
                    setQ("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <LinkButton to="/app/centre/weigh-ins/new">New weigh-in</LinkButton>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
