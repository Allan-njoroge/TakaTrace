import { useEffect, useRef, useState } from "react";
import { Leaf } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAvailableCredits, useRecordClaim, type CreditFilters } from "../../hooks/useBrand";
import { useWallet } from "../../hooks/useWallet";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { getBrowserProvider } from "../../lib/chain/provider";
import { getWriteContract, getReadContract } from "../../lib/chain/contract";
import { getFriendlyChainErrorMessage } from "../../lib/chain/errors";
import { formatDate, formatKg } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";
import { toast } from "../../lib/toast";

type RowStatus = "pending" | "signing" | "confirming" | "done" | "skipped" | "failed";

interface ClaimRowState {
  receiptId: string;
  status: RowStatus;
  message?: string;
}

export default function CreditsPage() {
  useDocumentTitle("Available credits");
  const [filters, setFilters] = useState<CreditFilters>({ sort: "oldest" });
  const credits = useAvailableCredits(filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [complianceYear, setComplianceYear] = useState(() => new Date().getFullYear());
  const [productLine, setProductLine] = useState("");
  const [rows, setRows] = useState<ClaimRowState[]>([]);
  const [claiming, setClaiming] = useState(false);
  const wallet = useWallet();
  const recordClaim = useRecordClaim();
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useLiveEvents("app", true, (event) => {
    if (event.type === "receipt.claimed" && event.receiptId && selectedRef.current.has(event.receiptId)) {
      toast.error(`${event.receiptId} was just claimed by another brand`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(event.receiptId as string);
        return next;
      });
    }
  });

  const selectedReceipts = credits.data?.filter((c) => selected.has(c.receiptId)) ?? [];
  const selectedKg = selectedReceipts.reduce((sum, c) => sum + c.weightKg, 0);

  function toggle(receiptId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(receiptId)) next.delete(receiptId);
      else next.add(receiptId);
      return next;
    });
  }

  async function startClaiming() {
    setClaiming(true);
    setRows(selectedReceipts.map((c) => ({ receiptId: c.receiptId, status: "pending" })));

    for (const credit of selectedReceipts) {
      setRows((prev) => prev.map((r) => (r.receiptId === credit.receiptId ? { ...r, status: "signing" } : r)));
      try {
        const readContract = getReadContract();
        const onChain = await readContract.getReceipt(credit.receiptId);
        if (onChain.claimed) {
          setRows((prev) =>
            prev.map((r) => (r.receiptId === credit.receiptId ? { ...r, status: "skipped", message: "Already claimed by another brand" } : r)),
          );
          continue;
        }

        const signer = await getBrowserProvider().getSigner();
        const contract = getWriteContract(signer);
        const tx = await contract.claimCredit(credit.receiptId);
        setRows((prev) => prev.map((r) => (r.receiptId === credit.receiptId ? { ...r, status: "confirming" } : r)));
        await tx.wait(1);

        await recordClaim.mutateAsync({
          receiptId: credit.receiptId,
          txHash: tx.hash,
          complianceYear,
          productLine: productLine || undefined,
        });
        setRows((prev) => prev.map((r) => (r.receiptId === credit.receiptId ? { ...r, status: "done" } : r)));
      } catch (error) {
        const message = getFriendlyChainErrorMessage(error);
        setRows((prev) => prev.map((r) => (r.receiptId === credit.receiptId ? { ...r, status: "failed", message } : r)));
      }
    }

    setClaiming(false);
    setSelected(new Set());
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Available credits</h1>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Select
          label="Material"
          value={filters.material ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value || undefined }))}
          className="w-44"
        >
          <option value="">All</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_LABEL[m]}
            </option>
          ))}
        </Select>
        <Input
          label="Min kg"
          type="number"
          className="w-32"
          value={filters.minKg ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, minKg: e.target.value ? Number(e.target.value) : undefined }))}
        />
        <Select label="Sort" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as "oldest" | "largest" }))} className="w-40">
          <option value="oldest">Oldest first</option>
          <option value="largest">Largest first</option>
        </Select>
      </div>

      <div className="mt-6">
        {credits.isLoading ? (
          <Skeleton className="h-64" />
        ) : credits.data && credits.data.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10" />
                  <TH>Receipt</TH>
                  <TH>Centre</TH>
                  <TH>County</TH>
                  <TH>Material</TH>
                  <TH className="text-right">Kg</TH>
                  <TH>Weighed on</TH>
                </TR>
              </THead>
              <TBody>
                {credits.data.map((credit) => (
                  <TR key={credit.receiptId}>
                    <TD>
                      <input
                        type="checkbox"
                        aria-label={`Select ${credit.receiptId}`}
                        checked={selected.has(credit.receiptId)}
                        onChange={() => toggle(credit.receiptId)}
                        className="size-5"
                      />
                    </TD>
                    <TDMono>{credit.receiptId}</TDMono>
                    <TD>{credit.centre.name}</TD>
                    <TD>{credit.centre.county}</TD>
                    <TD>{MATERIAL_LABEL[credit.material]}</TD>
                    <TD className="text-right">{formatKg(credit.weightKg)}</TD>
                    <TD>{formatDate(credit.weighedOn)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={Leaf} title="No unclaimed credits match these filters. New receipts appear here as soon as buying centres anchor them." />
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-line-200 bg-paper px-6 py-4 shadow-sm">
          <p className="text-sm text-ink-900">
            {selected.size} receipts selected · {formatKg(selectedKg)} kg
          </p>
          <Button onClick={() => setModalOpen(true)} disabled={!wallet.hasWallet}>
            Claim selected
          </Button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => !claiming && setModalOpen(false)} canClose={!claiming} title="Claim credits">
        {rows.length === 0 ? (
          <div className="flex flex-col gap-4">
            <Input label="Compliance year" type="number" value={complianceYear} onChange={(e) => setComplianceYear(Number(e.target.value))} />
            <Input label="Product line (optional)" value={productLine} onChange={(e) => setProductLine(e.target.value)} placeholder="500 ml PET bottles" />
            <Button onClick={() => void startClaiming()}>Claim {selected.size} receipts</Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.receiptId} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-mono text-xs">{row.receiptId}</span>
                <span className={row.status === "failed" ? "text-danger-600" : row.status === "skipped" ? "text-amber-700" : "text-ink-600"}>
                  {row.message ??
                    { pending: "Waiting…", signing: "Confirm in MetaMask…", confirming: "Confirming…", done: "Claimed", skipped: "Skipped", failed: "Failed" }[row.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && !claiming && (
          <Button
            className="mt-4"
            variant="secondary"
            icon={null}
            onClick={() => {
              setModalOpen(false);
              setRows([]);
              toast.success("Done");
            }}
          >
            Close
          </Button>
        )}
      </Modal>
    </div>
  );
}
