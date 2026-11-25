import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePicker, useSendTestSms, useSuspendPicker } from "../../hooks/usePickers";
import { formatKg } from "../../lib/format";
import { toast } from "../../lib/toast";

export default function PickerDetailPage() {
  const { pickerId } = useParams();
  const picker = usePicker(pickerId);
  useDocumentTitle(picker.data ? picker.data.code : "Picker detail");
  const sendTestSms = useSendTestSms(pickerId ?? "");
  const suspend = useSuspendPicker(pickerId ?? "");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (picker.isLoading) return <Skeleton className="h-64" />;
  if (!picker.data) return <p className="text-sm text-ink-600">We couldn&apos;t load this picker.</p>;

  const p = picker.data;

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-mono text-xl font-semibold text-ink-900">{p.code}</h1>
        <span className="text-sm text-ink-600">{p.status}</span>
      </div>

      <dl className="mt-6 flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
        <Row label="Name" value={`${p.firstName} ${p.lastName ?? ""}`.trim()} />
        <Row label="Phone" value={p.phoneMasked} />
        <Row label="Language" value={p.language === "sw" ? "Kiswahili" : "English"} />
        <Row label="Registered on" value={p.registeredOn} />
        <Row label="Receipts" value={p.receiptsCount.toString()} />
        <Row label="Kg total" value={formatKg(p.kgTotal)} />
        <Row label="Last weigh-in" value={p.lastWeighIn ?? "—"} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon={null}
          loading={sendTestSms.isPending}
          onClick={async () => {
            await sendTestSms.mutateAsync();
            toast.success("Test SMS sent");
          }}
        >
          Send test SMS
        </Button>
        {p.status === "ACTIVE" && (
          <Button variant="danger" icon={null} onClick={() => setSuspendOpen(true)}>
            Suspend picker
          </Button>
        )}
      </div>

      <Modal
        isOpen={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend this picker?"
        footer={
          <>
            <Button variant="secondary" icon={null} onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={null}
              disabled={reason.trim().length === 0}
              loading={suspend.isPending}
              onClick={async () => {
                await suspend.mutateAsync(reason);
                setSuspendOpen(false);
                toast.success("Picker suspended");
              }}
            >
              Suspend
            </Button>
          </>
        }
      >
        <label htmlFor="suspend-reason" className="block text-sm font-semibold text-ink-900">
          Reason
        </label>
        <textarea
          id="suspend-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1.5 w-full rounded-input border border-line-200 bg-paper p-3 text-sm text-ink-900 outline-none focus:border-forest-700"
        />
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-ink-900">{value}</dd>
    </div>
  );
}
