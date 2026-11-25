import { CalendarClock, ExternalLink } from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { KgByMaterialChart } from "../../components/charts/KgByMaterialChart";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePublicActivity, usePublicMaterials, usePublicStats } from "../../hooks/usePublicStats";
import { usePublicContract } from "../../hooks/usePublicContract";
import { formatDateTime, formatKg } from "../../lib/format";

export default function TransparencyPage() {
  useDocumentTitle("Transparency");
  const stats = usePublicStats();
  const materials = usePublicMaterials();
  const activity = usePublicActivity();
  const contract = usePublicContract();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-ink-600">Transparency</p>
      <h1 className="mt-2 text-3xl font-medium text-ink-900">Every anchored receipt, in the open.</h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Kg anchored" value={stats.data ? formatKg(stats.data.kgAnchored) : undefined} loading={stats.isLoading} />
        <SummaryStat
          label="Kg claimed"
          value={stats.data ? formatKg(stats.data.kgClaimed) : undefined}
          loading={stats.isLoading}
        />
        <SummaryStat label="Buying centres" value={stats.data?.centres.toString()} loading={stats.isLoading} />
        <SummaryStat label="Brands" value={stats.data?.brands.toString()} loading={stats.isLoading} />
      </div>

      <section id="materials" className="mt-14">
        <h2 className="text-xl font-semibold text-ink-900">Kilograms anchored by material</h2>
        {materials.isLoading ? (
          <Skeleton className="mt-4 h-64" />
        ) : materials.data && materials.data.length > 0 ? (
          <div className="mt-4">
            <KgByMaterialChart
              data={materials.data.map((m) => ({ material: m.label, kg: m.kgAnchored }))}
              summary="Kilograms anchored by material"
            />
          </div>
        ) : (
          <EmptyState icon={CalendarClock} title="No anchored weigh-ins yet." />
        )}
      </section>

      <section className="mt-10 rounded-card border border-line-200 bg-paper p-6">
        <h2 className="text-sm font-semibold text-ink-900">Smart contract</h2>
        {contract.data ? (
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-600">Network</dt>
              <dd className="text-ink-900">{contract.data.network}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-600">Address</dt>
              <dd>
                {contract.data.explorerUrl ? (
                  <a
                    href={`${contract.data.explorerUrl}/address/${contract.data.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline"
                  >
                    <HashDisplay value={contract.data.address} leadChars={6} trailChars={4} />
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : (
                  <HashDisplay value={contract.data.address} leadChars={6} trailChars={4} />
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-ink-600">Live figures unavailable.</p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-ink-900">Latest anchored receipts</h2>
        <ActivityTable
          rows={activity.data?.anchored}
          loading={activity.isLoading}
          extraColumn={null}
        />
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-ink-900">Latest claims</h2>
        <ActivityTable
          rows={activity.data?.claims}
          loading={activity.isLoading}
          extraColumn="brand"
        />
      </section>
    </div>
  );
}

function SummaryStat({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <div className="rounded-card border border-line-200 bg-paper p-5">
      <p className="text-xs font-medium text-ink-600">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-1 text-3xl font-medium text-ink-900">{value ?? "—"}</p>}
    </div>
  );
}

interface ActivityRow {
  receiptId: string;
  centre: string;
  material: string;
  weightKg: number;
  time: string;
  brand?: string;
}

function ActivityTable({ rows, loading, extraColumn }: { rows?: ActivityRow[]; loading: boolean; extraColumn: "brand" | null }) {
  if (loading) return <Skeleton className="mt-4 h-40" />;
  if (!rows || rows.length === 0) {
    return <EmptyState icon={CalendarClock} title="Nothing here yet." />;
  }

  return (
    <TableContainer className="mt-4">
      <Table>
        <THead>
          <TR>
            <TH>Receipt</TH>
            <TH>Centre</TH>
            <TH>Material</TH>
            <TH className="text-right">Weight</TH>
            {extraColumn === "brand" && <TH>Claimed by</TH>}
            <TH>Time</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={`${row.receiptId}-${row.time}`}>
              <TDMono>{row.receiptId}</TDMono>
              <TD>{row.centre}</TD>
              <TD>{row.material}</TD>
              <TD className="text-right">{formatKg(row.weightKg)}</TD>
              {extraColumn === "brand" && <TD>{row.brand}</TD>}
              <TD>{formatDateTime(row.time)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableContainer>
  );
}
