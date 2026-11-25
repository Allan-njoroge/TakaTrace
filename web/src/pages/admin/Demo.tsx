import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useRestoreReceipt, useResetDemoData, useSeedSampleWeek, useTamperReceipt } from "../../hooks/useDemoTools";
import { useContractTx } from "../../hooks/useContractTx";
import { TxStepper } from "../../components/chain/TxStepper";
import { toast } from "../../lib/toast";

export default function DemoToolsPage() {
  useDocumentTitle("Demo tools");
  const tamper = useTamperReceipt();
  const restore = useRestoreReceipt();
  const reset = useResetDemoData();
  const seedWeek = useSeedSampleWeek();

  const [receiptId, setReceiptId] = useState("");
  const [field, setField] = useState<"weightKg" | "material" | "pickerCode" | "weighedOn">("weightKg");
  const [value, setValue] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [doubleClaimReceiptId, setDoubleClaimReceiptId] = useState("");
  const doubleClaimTx = useContractTx();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink-900">Demo tools</h1>
      <Banner severity="warning" message="Demo tools change data on purpose. Never available in production." />

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Tamper with a record</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Input label="Receipt ID" value={receiptId} onChange={(e) => setReceiptId(e.target.value)} />
          <Select label="Field" value={field} onChange={(e) => setField(e.target.value as typeof field)}>
            <option value="weightKg">Weight</option>
            <option value="material">Material</option>
            <option value="pickerCode">Picker code</option>
            <option value="weighedOn">Date</option>
          </Select>
          <Input label="New value" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex gap-3">
            <Button
              variant="danger"
              icon={null}
              disabled={!receiptId || !value}
              loading={tamper.isPending}
              onClick={async () => {
                await tamper.mutateAsync({ receiptId, field, value });
                toast.success("Record changed");
              }}
            >
              Change the record
            </Button>
            <Button
              variant="secondary"
              icon={null}
              disabled={!receiptId}
              loading={restore.isPending}
              onClick={async () => {
                await restore.mutateAsync(receiptId);
                toast.success("Original record restored");
              }}
            >
              Restore original
            </Button>
          </div>
          {receiptId && (
            <Link to={`/verify/${receiptId}`} target="_blank" rel="noreferrer" className="text-sm underline-offset-4 hover:underline">
              Open public verification
            </Link>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Double-claim test</h2>
        <p className="mt-1 text-sm text-ink-600">
          Signs <code className="font-mono">claimCredit</code> from the currently connected MetaMask account for a receipt
          that&apos;s already claimed, to show the revert message the contract gives a second brand.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <Input label="Already-claimed receipt ID" value={doubleClaimReceiptId} onChange={(e) => setDoubleClaimReceiptId(e.target.value)} />
          <Button
            variant="danger"
            icon={null}
            disabled={!doubleClaimReceiptId}
            onClick={() =>
              void doubleClaimTx.run({ send: (contract) => contract.claimCredit(doubleClaimReceiptId) })
            }
          >
            Attempt double claim
          </Button>
        </div>
        {doubleClaimTx.state.status !== "idle" && (
          <div className="mt-4">
            <TxStepper tx={doubleClaimTx.state} />
          </div>
        )}
      </section>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Reset demo data</h2>
        <p className="mt-1 text-sm text-ink-600">
          Clears receipts, claims, payouts, SMS and disputes but keeps organisations, users and pickers.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <Input label='Type "RESET" to confirm' value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} />
          <Button
            variant="danger"
            icon={<AlertTriangle className="size-3.5" />}
            disabled={resetConfirm !== "RESET"}
            loading={reset.isPending}
            onClick={async () => {
              await reset.mutateAsync();
              setResetConfirm("");
              toast.success("Demo data reset");
            }}
          >
            Reset demo data
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Seed sample week</h2>
        <p className="mt-1 text-sm text-ink-600">Creates 30 sample weigh-ins over 7 days, anchored with the practice keys.</p>
        <Button
          className="mt-4"
          variant="secondary"
          icon={null}
          loading={seedWeek.isPending}
          onClick={async () => {
            await seedWeek.mutateAsync();
            toast.success("Sample week seeded");
          }}
        >
          Seed sample week
        </Button>
      </section>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Phone simulator</h2>
        <Link to="/simulate/phone" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline-offset-4 hover:underline">
          Open phone simulator
        </Link>
      </section>
    </div>
  );
}
