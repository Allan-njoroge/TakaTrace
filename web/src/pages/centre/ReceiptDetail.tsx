import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { BadgeCheck, CircleAlert, FileClock, Loader, MessageSquareWarning, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDiscardDraft, useReceipt, useReceiptTimeline } from "../../hooks/useReceipts";
import { useCreateDispute } from "../../hooks/useDisputes";
import { useVerifyReceipt } from "../../hooks/useVerifyReceipt";
import { useMe } from "../../hooks/useMe";
import { formatDateTime, formatKg } from "../../lib/format";
import { MATERIAL_LABEL } from "../../lib/materials";
import { toast } from "../../lib/toast";
import ReceiptPrint from "./ReceiptPrint";

const TIMELINE_ICON: Record<string, typeof FileClock> = {
  CREATED: FileClock,
  ANCHOR_SENT: PenLine,
  ANCHORED: ShieldCheck,
  ANCHOR_FAILED: CircleAlert,
  SMS_SENT: Loader,
  SMS_DELIVERED: BadgeCheck,
  SMS_FAILED: CircleAlert,
  PAYOUT_SENT: Loader,
  PAYOUT_PAID: BadgeCheck,
  PAYOUT_FAILED: CircleAlert,
  DISPUTE_OPENED: MessageSquareWarning,
  DISPUTE_RESOLVED: ShieldCheck,
  CLAIMED: BadgeCheck,
};

export default function CentreReceiptDetailPage() {
  const { receiptId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: me } = useMe();
  useDocumentTitle(receiptId ?? "Receipt");

  const receipt = useReceipt(receiptId);
  const timeline = useReceiptTimeline(receiptId);
  const integrity = useVerifyReceipt(receipt.data ? receiptId : undefined);
  const discardDraft = useDiscardDraft();
  const createDispute = useCreateDispute();
  const [discardOpen, setDiscardOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  if (params.get("print") === "1" && receipt.data) {
    return <ReceiptPrint receipt={receipt.data} />;
  }

  if (receipt.isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!receipt.data) {
    return <p className="text-sm text-ink-600">We couldn&apos;t load this receipt.</p>;
  }

  const r = receipt.data;

  async function handleDiscard() {
    if (!receiptId) return;
    await discardDraft.mutateAsync(receiptId);
    toast.success("Draft discarded");
    navigate("/app/centre/receipts");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold text-ink-900">{r.receiptId}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {(r.status === "DRAFT" || r.status === "ANCHOR_FAILED") && (
            <Link to={`/app/centre/weigh-ins/new`} className="text-sm font-medium underline-offset-4 hover:underline">
              Anchor now
            </Link>
          )}
          <Link to={`?print=1`} className="text-sm font-medium underline-offset-4 hover:underline">
            Print receipt
          </Link>
          <a href={`/verify/${r.receiptId}`} target="_blank" rel="noreferrer" className="text-sm font-medium underline-offset-4 hover:underline">
            Open public verification
          </a>
          {r.status === "DRAFT" && (
            <button type="button" onClick={() => setDiscardOpen(true)} className="text-sm font-medium text-danger-600 underline-offset-4 hover:underline">
              Discard draft
            </button>
          )}
          {r.displayStatus === "ANCHORED" && (
            <button type="button" onClick={() => setDisputeOpen(true)} className="text-sm font-medium text-amber-700 underline-offset-4 hover:underline">
              Flag dispute
            </button>
          )}
        </div>
      </div>

      <dl className="mt-6 flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
        <Row label="Buying centre" value={r.centre.name} />
        <Row label="Picker" value={r.pickerCode} mono />
        <Row label="Material" value={MATERIAL_LABEL[r.material]} />
        <Row label="Weight" value={formatKg(r.weightKg)} />
        <Row label="Weighed on" value={r.weighedOn} />
        {r.note && <Row label="Note" value={r.note} />}
      </dl>
      {r.photo && <img src={r.photo.url} alt="Scale photo" className="mt-4 h-48 w-full rounded-card border border-line-200 object-cover" />}

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Integrity check</h2>
        {integrity.isLoading ? (
          <Skeleton className="mt-3 h-10" />
        ) : integrity.data?.verdict === "MISMATCH" ? (
          <div className="mt-3 rounded-input bg-danger-100 p-4 text-sm text-danger-600">
            This record no longer matches its blockchain fingerprint.{" "}
            {me?.user.role === "ADMIN" ? (
              <Link to={`/app/admin/audit?entityId=${r.receiptId}`} className="underline">
                Investigate in the audit log
              </Link>
            ) : (
              "Ask your admin to investigate in the audit log."
            )}
          </div>
        ) : integrity.data?.verdict === "MATCH" ? (
          <p className="mt-3 text-sm text-forest-700">This receipt matches the blockchain.</p>
        ) : integrity.data?.verdict === "NOT_ON_CHAIN" ? (
          <p className="mt-3 text-sm text-ink-600">Not yet saved to the blockchain.</p>
        ) : (
          <p className="mt-3 text-sm text-ink-600">Couldn&apos;t reach the blockchain to check.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Timeline</h2>
        {timeline.isLoading ? (
          <Skeleton className="mt-4 h-32" />
        ) : timeline.data && timeline.data.length > 0 ? (
          <ol className="mt-4 flex flex-col gap-4">
            {[...timeline.data].reverse().map((entry, index) => {
              const Icon = TIMELINE_ICON[entry.type] ?? FileClock;
              return (
                <li key={index} className="flex gap-3 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-forest-700" aria-hidden="true" />
                  <div>
                    <p className="text-ink-900">{entry.detail}</p>
                    <p className="text-ink-600">{formatDateTime(entry.at)}</p>
                    {entry.txHash && <HashDisplay value={entry.txHash} />}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-ink-600">No activity yet.</p>
        )}
      </section>

      {(r.supersededBy || r.corrects) && (
        <p className="mt-6 text-sm text-ink-600">
          {r.supersededBy && (
            <>
              Replaced by{" "}
              <Link to={`/app/centre/receipts/${r.supersededBy}`} className="underline">
                {r.supersededBy}
              </Link>
            </>
          )}
          {r.corrects && (
            <>
              Corrects{" "}
              <Link to={`/app/centre/receipts/${r.corrects}`} className="underline">
                {r.corrects}
              </Link>
            </>
          )}
        </p>
      )}

      <Modal
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard this draft?"
        footer={
          <>
            <Button variant="secondary" icon={null} onClick={() => setDiscardOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={null} loading={discardDraft.isPending} onClick={() => void handleDiscard()}>
              Discard draft
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">This weigh-in hasn&apos;t been saved to the blockchain. This can&apos;t be undone.</p>
      </Modal>

      <Modal
        isOpen={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Flag a dispute"
        footer={
          <>
            <Button variant="secondary" icon={null} onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={null}
              loading={createDispute.isPending}
              disabled={disputeReason.trim().length === 0}
              onClick={async () => {
                if (!receiptId) return;
                await createDispute.mutateAsync({ receiptId, reason: disputeReason, message: disputeReason });
                setDisputeOpen(false);
                toast.success("Dispute opened");
                navigate("/app/centre/disputes");
              }}
            >
              Flag dispute
            </Button>
          </>
        }
      >
        <label htmlFor="dispute-reason" className="block text-sm font-semibold text-ink-900">
          What&apos;s wrong with this receipt?
        </label>
        <textarea
          id="dispute-reason"
          rows={3}
          value={disputeReason}
          onChange={(event) => setDisputeReason(event.target.value)}
          className="mt-1.5 w-full rounded-input border border-line-200 bg-paper p-3 text-sm text-ink-900 outline-none focus:border-forest-700"
        />
        <p className="mt-2 text-sm text-ink-600">Flagging a dispute blocks this receipt from being claimed until it&apos;s resolved.</p>
      </Modal>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-ink-900" : "text-ink-900"}>{value}</dd>
    </div>
  );
}
