import { Link } from "react-router";
import { Skeleton } from "../../components/ui/Skeleton";
import { Chip } from "../../components/ui/StatusChip";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminOverview } from "../../hooks/useAdmin";
import { formatDateTime, formatKg } from "../../lib/format";

const HEALTH_CHIP = {
  ok: { tone: "success" as const, icon: CircleCheck, label: "OK" },
  degraded: { tone: "amber" as const, icon: CircleAlert, label: "Degraded" },
  down: { tone: "danger" as const, icon: CircleX, label: "Down" },
};

export default function AdminOverviewPage() {
  useDocumentTitle("Overview");
  const overview = useAdminOverview();

  if (overview.isLoading) return <Skeleton className="h-96" />;
  if (!overview.data) return <p className="text-sm text-ink-600">Couldn&apos;t load the overview.</p>;

  const o = overview.data;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Buying centres" value={o.organizations.centres.toString()} />
        <StatCard label="Brands" value={o.organizations.brands.toString()} />
        <StatCard label="Active pickers" value={o.activePickers.toString()} />
        <StatCard label="Kg anchored" value={formatKg(o.kgAnchored)} />
        <StatCard label="Payouts paid" value={o.payouts.paid.toString()} />
        <StatCard label="Payouts failed" value={o.payouts.failed.toString()} />
        <StatCard label="SMS sent today" value={o.smsToday.sent.toString()} />
        <StatCard label="Indexer lag" value={`${o.indexerLagBlocks} blocks`} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">Integrations health</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(o.integrationsHealth).map(([name, health]) => {
            const chip = HEALTH_CHIP[health];
            return (
              <div key={name} className="flex items-center gap-2 rounded-card border border-line-200 bg-paper px-4 py-2 text-sm">
                <span className="capitalize text-ink-900">{name}</span>
                <Chip tone={chip.tone} icon={chip.icon} label={chip.label} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">Latest audit events</h2>
        <ul className="mt-4 flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
          {o.latestAuditEvents.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="text-ink-900">{entry.summary}</p>
                <p className="text-ink-600">
                  {entry.actor} · {formatDateTime(entry.at)}
                </p>
              </div>
              <Link to={`/app/admin/audit?entityId=${entry.entityId}`} className="text-xs font-medium underline-offset-4 hover:underline">
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line-200 bg-paper p-5">
      <p className="text-xs font-medium text-ink-600">{label}</p>
      <p className="mt-1 text-2xl font-medium text-ink-900">{value}</p>
    </div>
  );
}
