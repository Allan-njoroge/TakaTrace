import { useState } from "react";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Chip } from "../../components/ui/StatusChip";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminIntegrations, useTestIntegration } from "../../hooks/useAdmin";
import { formatDateTime } from "../../lib/format";
import { toast } from "../../lib/toast";

const HEALTH_CHIP = {
  ok: { tone: "success" as const, icon: CircleCheck, label: "OK" },
  degraded: { tone: "amber" as const, icon: CircleAlert, label: "Degraded" },
  down: { tone: "danger" as const, icon: CircleX, label: "Down" },
};

const LABEL: Record<string, string> = {
  sms: "SMS",
  ussd: "USSD",
  mpesa: "M-Pesa payouts",
  ipfs: "IPFS",
  blockchain: "Blockchain",
};

export default function IntegrationsPage() {
  useDocumentTitle("Integrations");
  const integrations = useAdminIntegrations();
  const testIntegration = useTestIntegration();
  const [testPhone, setTestPhone] = useState("");

  if (integrations.isLoading) return <Skeleton className="h-64" />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Integrations</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {integrations.data?.map((card) => {
          const chip = HEALTH_CHIP[card.health];
          return (
            <div key={card.name} className="rounded-card border border-line-200 bg-paper p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">{LABEL[card.name] ?? card.name}</p>
                <Chip tone={chip.tone} icon={chip.icon} label={chip.label} />
              </div>
              <p className="mt-1 text-xs text-ink-600">Mode: {card.mode}</p>
              {card.webhookUrl && (
                <p className="mt-2 break-all font-mono text-xs text-ink-600">{card.webhookUrl}</p>
              )}

              {card.name === "sms" && (
                <div className="mt-3 flex items-end gap-2">
                  <Input label="Test phone" className="flex-1" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                  <Button
                    variant="secondary"
                    icon={null}
                    loading={testIntegration.isPending}
                    onClick={async () => {
                      await testIntegration.mutateAsync({ kind: "sms", phone: testPhone });
                      toast.success("Test SMS sent");
                    }}
                  >
                    Send test SMS
                  </Button>
                </div>
              )}
              {card.name === "mpesa" && (
                <Button
                  variant="secondary"
                  icon={null}
                  className="mt-3"
                  loading={testIntegration.isPending}
                  onClick={async () => {
                    await testIntegration.mutateAsync({ kind: "payout" });
                    toast.success("Test payout sent");
                  }}
                >
                  Send test payout KES 10
                </Button>
              )}
              {card.name === "ipfs" && (
                <Button
                  variant="secondary"
                  icon={null}
                  className="mt-3"
                  loading={testIntegration.isPending}
                  onClick={async () => {
                    await testIntegration.mutateAsync({ kind: "storage" });
                    toast.success("Test file uploaded");
                  }}
                >
                  Upload test file
                </Button>
              )}

              {card.recentCalls.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-line-200 pt-3 text-xs text-ink-600">
                  {card.recentCalls.slice(0, 5).map((call, index) => (
                    <li key={index}>
                      {formatDateTime(call.at)} · {call.status} · {call.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
