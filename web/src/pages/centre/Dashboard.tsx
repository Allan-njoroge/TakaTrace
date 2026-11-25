import { Link } from "react-router";
import { AlertCircle, Banknote, CircleDollarSign, MessageSquareWarning, Scale } from "lucide-react";
import { LinkButton } from "../../components/ui/LinkButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { ReceiptStatusChip } from "../../components/ui/StatusChip";
import { KgByMaterialChart } from "../../components/charts/KgByMaterialChart";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useCentreSummary, useReceipts } from "../../hooks/useReceipts";
import { useMe } from "../../hooks/useMe";
import { formatKes, formatKg } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function CentreDashboardPage() {
  useDocumentTitle("Dashboard");
  const { data: me } = useMe();
  const summary = useCentreSummary(todayIso());
  const recent = useReceipts({});

  const chartData = MATERIALS.map((material) => ({
    material: MATERIAL_LABEL[material],
    kg:
      summary.data?.kgByMaterialLast14Days.reduce((total, day) => total + (day[material] ?? 0), 0) ?? 0,
  })).filter((row) => row.kg > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Good day, {me?.organization?.name ?? "there"}</h1>
        <LinkButton to="/app/centre/weigh-ins/new">New weigh-in</LinkButton>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Scale} label="Kg bought today" value={summary.data ? formatKg(summary.data.kgToday) : undefined} loading={summary.isLoading} />
        <StatCard icon={CircleDollarSign} label="Weigh-ins today" value={summary.data?.weighInsToday.toString()} loading={summary.isLoading} />
        <StatCard icon={Banknote} label="KES paid today" value={summary.data ? formatKes(summary.data.kesPaidToday) : undefined} loading={summary.isLoading} />
        <StatCard icon={MessageSquareWarning} label="Open disputes" value={summary.data?.openDisputes.toString()} loading={summary.isLoading} />
      </div>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Needs attention</h2>
        {summary.isLoading ? (
          <Skeleton className="mt-3 h-16" />
        ) : summary.data && summary.data.needsAttention.length > 0 ? (
          <ul className="mt-3 flex flex-col divide-y divide-line-200">
            {summary.data.needsAttention.map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-3">
                <span className="flex items-center gap-2 text-sm text-ink-900">
                  <AlertCircle className="size-4 text-amber-600" aria-hidden="true" />
                  {item.label}
                </span>
                {item.receiptId && (
                  <Link to={`/app/centre/receipts/${item.receiptId}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    {item.kind === "ANCHOR_FAILED" ? "Retry" : item.kind === "DRAFT" ? "Anchor now" : "Open"}
                  </Link>
                )}
                {item.disputeId && (
                  <Link to={`/app/centre/disputes/${item.disputeId}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    Review
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-600">Nothing needs your attention.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Recent weigh-ins</h2>
        {recent.isLoading ? (
          <Skeleton className="mt-4 h-48" />
        ) : recent.data && recent.data.items.length > 0 ? (
          <TableContainer className="mt-4">
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Picker</TH>
                  <TH>Material</TH>
                  <TH className="text-right">Weight</TH>
                  <TH className="text-right">Payout</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {recent.data.items.slice(0, 10).map((receipt) => (
                  <TR key={receipt.receiptId} className="cursor-pointer hover:bg-cream-100">
                    <TDMono>
                      <Link to={`/app/centre/receipts/${receipt.receiptId}`}>{receipt.receiptId}</Link>
                    </TDMono>
                    <TDMono>{receipt.pickerCode}</TDMono>
                    <TD>{MATERIAL_LABEL[receipt.material]}</TD>
                    <TD className="text-right">{formatKg(receipt.weightKg)}</TD>
                    <TD className="text-right">{formatKes(receipt.payoutKes)}</TD>
                    <TD>
                      <ReceiptStatusChip status={receipt.displayStatus} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={Scale} title="No weigh-ins yet. Record the first one." action={<LinkButton to="/app/centre/weigh-ins/new">New weigh-in</LinkButton>} />
        )}
      </section>

      {chartData.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink-900">Kg per material, last 14 days</h2>
          <div className="mt-4">
            <KgByMaterialChart data={chartData} summary="Kilograms bought per material over the last 14 days" />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Scale;
  label: string;
  value?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-card border border-line-200 bg-paper p-5">
      <span className="flex size-8 items-center justify-center rounded-full bg-cream-100 text-forest-700" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-xs font-medium text-ink-600">{label}</p>
      {loading ? <Skeleton className="mt-1 h-8 w-20" /> : <p className="mt-1 text-2xl font-medium text-ink-900">{value ?? "—"}</p>}
    </div>
  );
}
