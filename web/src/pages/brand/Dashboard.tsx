import { Link } from "react-router";
import { Target } from "lucide-react";
import { LinkButton } from "../../components/ui/LinkButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBrandSummary } from "../../hooks/useBrand";
import { formatDate, formatKg } from "../../lib/format";
import { MATERIAL_LABEL } from "../../lib/materials";

function currentYear() {
  return new Date().getFullYear();
}

export default function BrandDashboardPage() {
  useDocumentTitle("Dashboard");
  const year = currentYear();
  const summary = useBrandSummary(year);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">EPR progress, {year}</h1>
        <LinkButton to="/app/brand/credits">Find credits to claim</LinkButton>
      </div>

      {summary.isLoading ? (
        <Skeleton className="mt-6 h-32" />
      ) : summary.data ? (
        <>
          <div className="mt-6 rounded-card border border-line-200 bg-paper p-6">
            <p className="text-sm text-ink-600">Overall</p>
            <p className="mt-1 text-4xl font-medium text-ink-900">
              {formatKg(summary.data.totalClaimedKg)} <span className="text-lg text-ink-600">of {formatKg(summary.data.totalTargetKg)}</span>
            </p>
            <ProgressBar ratio={summary.data.totalTargetKg > 0 ? summary.data.totalClaimedKg / summary.data.totalTargetKg : 0} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.data.targets.map((target) => (
              <div key={target.material} className="rounded-card border border-line-200 bg-paper p-5">
                <p className="text-sm font-semibold text-ink-900">{MATERIAL_LABEL[target.material]}</p>
                <p className="mt-1 text-xl font-medium text-ink-900">
                  {formatKg(target.claimedKg)} <span className="text-sm text-ink-600">of {formatKg(target.targetKg)}</span>
                </p>
                <ProgressBar ratio={target.targetKg > 0 ? target.claimedKg / target.targetKg : 0} />
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink-900">Recent claims</h2>
            {summary.data.recentClaims.length > 0 ? (
              <TableContainer className="mt-4">
                <Table>
                  <THead>
                    <TR>
                      <TH>Receipt</TH>
                      <TH>Material</TH>
                      <TH className="text-right">Weight</TH>
                      <TH>Centre</TH>
                      <TH>Claimed</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.data.recentClaims.map((claim) => (
                      <TR key={claim.id}>
                        <TDMono>
                          <Link to="/app/brand/claims">{claim.receiptId}</Link>
                        </TDMono>
                        <TD>{MATERIAL_LABEL[claim.material]}</TD>
                        <TD className="text-right">{formatKg(claim.weightKg)}</TD>
                        <TD>{claim.centre}</TD>
                        <TD>{formatDate(claim.claimedAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState icon={Target} title="No claims yet." action={<LinkButton to="/app/brand/credits">Find credits to claim</LinkButton>} />
            )}
          </section>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-600">Live figures unavailable.</p>
      )}
    </div>
  );
}

function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div role="img" aria-label={`${pct}% of target claimed`} className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-200">
      <div className="h-full bg-forest-700" style={{ width: `${pct}%` }} />
    </div>
  );
}
