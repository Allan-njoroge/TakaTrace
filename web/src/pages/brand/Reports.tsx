import { useState } from "react";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useEprReport } from "../../hooks/useEprReport";
import { useMe } from "../../hooks/useMe";
import { config } from "../../config";
import { formatDate, formatKg } from "../../lib/format";
import { MATERIAL_LABEL } from "../../lib/materials";

export default function ReportsPage() {
  useDocumentTitle("Reports");
  const { data: me } = useMe();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const report = useEprReport(year);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">EPR report</h1>
          <div className="mt-4">
            <Select label="Compliance year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-36">
              {[2026, 2025, 2024].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={`${config.apiUrl}/api/reports/epr?year=${year}&format=csv`}
            className="inline-flex min-h-11 items-center rounded-full border border-ink-900 px-5 text-sm font-semibold text-ink-900"
          >
            Download CSV
          </a>
          <Button variant="secondary" icon={null} onClick={() => window.print()}>
            Printable report
          </Button>
        </div>
      </div>

      {report.isLoading ? (
        <Skeleton className="mt-8 h-64" />
      ) : report.data ? (
        <div className="mt-8">
          {report.data.mismatches.length > 0 && (
            <div className="mb-6 rounded-input bg-danger-100 p-4 text-sm text-danger-600">
              <p className="font-semibold">{report.data.mismatches.length} receipt(s) failed verification and are excluded from totals:</p>
              <ul className="mt-2 list-inside list-disc">
                {report.data.mismatches.map((m) => (
                  <li key={m.receiptId} className="font-mono text-xs">
                    {m.receiptId} — {m.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-ink-600">
            Every receipt below was claimed by {me?.organization?.name ?? "this brand"} on the blockchain at{" "}
            <HashDisplay value={report.data.contractAddress} leadChars={6} trailChars={4} /> and can be checked at{" "}
            {window.location.origin}/verify.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line-200 bg-paper p-4">
              <p className="text-sm font-semibold text-ink-900">Totals by material</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-600">
                {report.data.totalsByMaterial.map((row) => (
                  <li key={row.material} className="flex justify-between">
                    <span>{MATERIAL_LABEL[row.material]}</span>
                    <span className="text-ink-900">{formatKg(row.kg)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card border border-line-200 bg-paper p-4">
              <p className="text-sm font-semibold text-ink-900">Totals by month</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-600">
                {report.data.totalsByMonth.map((row) => (
                  <li key={row.month} className="flex justify-between">
                    <span>{row.month}</span>
                    <span className="text-ink-900">{formatKg(row.kg)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <TableContainer className="mt-6">
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Material</TH>
                  <TH className="text-right">Kg</TH>
                  <TH>Data hash</TH>
                  <TH>Claim tx</TH>
                  <TH>Block</TH>
                  <TH>Claimed</TH>
                </TR>
              </THead>
              <TBody>
                {report.data.lines.map((line) => (
                  <TR key={line.receiptId}>
                    <TDMono>{line.receiptId}</TDMono>
                    <TD>{MATERIAL_LABEL[line.material]}</TD>
                    <TD className="text-right">{formatKg(line.weightKg)}</TD>
                    <TD>
                      <HashDisplay value={line.dataHash} />
                    </TD>
                    <TD>
                      <HashDisplay value={line.claimTxHash} />
                    </TD>
                    <TD>{line.blockNumber}</TD>
                    <TD>{formatDate(line.claimedAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <p className="mt-8 text-sm text-ink-600">Couldn&apos;t load the report.</p>
      )}
    </div>
  );
}
