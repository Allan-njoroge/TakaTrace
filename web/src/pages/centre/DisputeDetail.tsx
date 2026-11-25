import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { TxStepper } from "../../components/chain/TxStepper";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDispute } from "../../hooks/useDisputes";
import { useContractTx } from "../../hooks/useContractTx";
import { supportsFunction } from "../../lib/chain/contract";
import { api } from "../../lib/api";
import { formatKg } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";
import { toast } from "../../lib/toast";
import type { Material } from "../../types/api";

const SET_DISPUTED_SUPPORTED = supportsFunction("setDisputed");

export default function DisputeDetailPage() {
  const { disputeId } = useParams();
  const dispute = useDispute(disputeId);
  useDocumentTitle(disputeId ? `Dispute ${disputeId}` : "Dispute detail");
  const navigate = useNavigate();
  const blockTx = useContractTx();
  const resolveTx = useContractTx();
  const [decision, setDecision] = useState<"reject" | "uphold" | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [correctedMaterial, setCorrectedMaterial] = useState<Material>("PET");
  const [correctedWeight, setCorrectedWeight] = useState("");
  const [resolving, setResolving] = useState(false);

  if (dispute.isLoading) return <Skeleton className="h-64" />;
  if (!dispute.data) return <p className="text-sm text-ink-600">We couldn&apos;t load this dispute.</p>;

  const d = dispute.data;

  async function blockOnChain() {
    if (!SET_DISPUTED_SUPPORTED) {
      toast.error("The deployed contract doesn't support blocking disputes on-chain yet.");
      return;
    }
    await blockTx.run({
      send: (contract) => {
        if (!contract.setDisputed) throw new Error("setDisputed is not available on this contract.");
        return contract.setDisputed(d.receiptId, true);
      },
      onSubmitted: async (txHash) => {
        await api.post(`/api/receipts/${d.receiptId}/dispute-flag`, { txHash, disputed: true });
      },
    });
  }

  async function handleReject() {
    setResolving(true);
    try {
      await api.post(`/api/disputes/${disputeId}/resolve`, { outcome: "REJECTED", note: rejectNote });
      if (SET_DISPUTED_SUPPORTED) {
        const status = await resolveTx.run({
          send: (contract) => {
            if (!contract.setDisputed) throw new Error("setDisputed is not available on this contract.");
            return contract.setDisputed(d.receiptId, false);
          },
          onSubmitted: async (txHash) => {
            await api.post(`/api/receipts/${d.receiptId}/dispute-flag`, { txHash, disputed: false });
          },
        });
        if (status !== "synced") {
          toast.error("The dispute was resolved, but unblocking it on the blockchain didn't complete. Try again from this page.");
          return;
        }
      }
      toast.success("Dispute rejected — the record stands");
      navigate("/app/centre/disputes");
    } catch {
      toast.error("Couldn't resolve the dispute. Try again.");
    } finally {
      setResolving(false);
    }
  }

  async function handleUphold() {
    setResolving(true);
    try {
      await api.post(`/api/disputes/${disputeId}/resolve`, {
        outcome: "UPHELD",
        correctedMaterial,
        correctedWeightKg: Number(correctedWeight),
      });
      toast.success("Dispute upheld — a correction receipt was created");
      navigate("/app/centre/disputes");
    } catch {
      toast.error("Couldn't resolve the dispute. Try again.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-mono text-xl font-semibold text-ink-900">{d.id}</h1>

      <section className="mt-6 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Receipt</h2>
        <p className="mt-2 font-mono text-sm text-ink-900">{d.receipt.receiptId}</p>
        <p className="mt-1 text-sm text-ink-600">
          {MATERIAL_LABEL[d.receipt.material]} · {formatKg(d.receipt.weightKg)} · {d.receipt.weighedOn}
        </p>
        {d.receipt.photo && <img src={d.receipt.photo.url} alt="Scale photo" className="mt-3 h-40 w-full rounded-input object-cover" />}
      </section>

      <section className="mt-6 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Report</h2>
        <p className="mt-2 text-sm text-ink-900">{d.reason}</p>
        {d.message && <p className="mt-2 text-sm text-ink-600">{d.message}</p>}
      </section>

      <section className="mt-6 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Blockchain dispute flag</h2>
        {!SET_DISPUTED_SUPPORTED ? (
          <p className="mt-2 text-sm text-ink-600">The deployed contract doesn&apos;t support this check yet.</p>
        ) : d.receipt.disputed ? (
          <p className="mt-2 text-sm text-forest-700">Claims blocked on-chain</p>
        ) : (
          <div>
            <p className="mt-2 text-sm text-amber-700">Not blocked on-chain yet</p>
            <Button className="mt-3" onClick={() => void blockOnChain()}>
              Block claims on blockchain
            </Button>
            {blockTx.state.status !== "idle" && (
              <div className="mt-4">
                <TxStepper tx={blockTx.state} />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Decision</h2>
        <div className="mt-3 flex gap-3">
          <Button variant={decision === "reject" ? "primary" : "secondary"} icon={null} onClick={() => setDecision("reject")}>
            Reject
          </Button>
          <Button variant={decision === "uphold" ? "primary" : "secondary"} icon={null} onClick={() => setDecision("uphold")}>
            Uphold with correction
          </Button>
        </div>

        {decision === "reject" && (
          <div className="mt-4">
            <label htmlFor="reject-note" className="block text-sm font-semibold text-ink-900">
              Reason the record stands
            </label>
            <textarea
              id="reject-note"
              rows={3}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              className="mt-1.5 w-full rounded-input border border-line-200 bg-paper p-3 text-sm text-ink-900 outline-none focus:border-forest-700"
            />
            <Button className="mt-3" disabled={!rejectNote.trim()} loading={resolving} onClick={() => void handleReject()}>
              Confirm rejection
            </Button>
          </div>
        )}

        {decision === "uphold" && (
          <div className="mt-4 flex flex-col gap-4">
            <Select label="Corrected material" value={correctedMaterial} onChange={(e) => setCorrectedMaterial(e.target.value as Material)}>
              {MATERIALS.map((material) => (
                <option key={material} value={material}>
                  {MATERIAL_LABEL[material]}
                </option>
              ))}
            </Select>
            <Input
              label="Corrected weight"
              type="number"
              step="0.01"
              endAdornment="kg"
              value={correctedWeight}
              onChange={(event) => setCorrectedWeight(event.target.value)}
            />
            <p className="text-sm text-ink-600">
              A new correction receipt will be created and anchored by TakaTrace. The original stays disputed on the
              blockchain forever, so it can never be claimed.
            </p>
            <Button className="self-start" disabled={!correctedWeight} loading={resolving} onClick={() => void handleUphold()}>
              Confirm correction
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
