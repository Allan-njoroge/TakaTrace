import { useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, ClipboardList } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { config } from "../../config";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminAudit } from "../../hooks/useAdmin";
import { formatDateTime } from "../../lib/format";

export default function AuditPage() {
  useDocumentTitle("Audit log");
  const [params, setParams] = useSearchParams();
  const entityId = params.get("entityId") ?? "";
  const audit = useAdminAudit({ entityId: entityId || undefined });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Audit log</h1>
        <a
          href={`${config.apiUrl}/api/admin/audit?format=csv${entityId ? `&entityId=${entityId}` : ""}`}
          className="inline-flex min-h-11 items-center rounded-full border border-ink-900 px-5 text-sm font-semibold text-ink-900"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Input
          label="Entity ID"
          value={entityId}
          onChange={(e) => setParams(e.target.value ? { entityId: e.target.value } : {})}
          className="w-64"
        />
      </div>

      <div className="mt-6">
        {audit.isLoading ? (
          <Skeleton className="h-64" />
        ) : audit.data && audit.data.items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
            {audit.data.items.map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => (prev === entry.id ? null : entry.id))}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm"
                >
                  <span>
                    <span className="font-medium text-ink-900">{entry.action}</span> · {entry.summary}
                    <span className="block text-xs text-ink-600">
                      {entry.actor} · {formatDateTime(entry.at)} · {entry.ip}
                    </span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 transition-transform ${expanded === entry.id ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {expanded === entry.id && Boolean(entry.before || entry.after) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <pre className="overflow-x-auto rounded-input bg-cream-100 p-3 text-xs">{JSON.stringify(entry.before, null, 2)}</pre>
                    <pre className="overflow-x-auto rounded-input bg-cream-100 p-3 text-xs">{JSON.stringify(entry.after, null, 2)}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardList} title="No audit events match these filters." />
        )}
      </div>
    </div>
  );
}
