import { Check, Loader2, X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { TxState } from "../../hooks/useContractTx";

type StepState = "pending" | "active" | "done" | "failed";

interface Step {
  label: string;
  state: StepState;
}

function buildSteps(tx: TxState): Step[] {
  const { status, blockNumber } = tx;
  const confirmedLabel = blockNumber ? `Confirmed (block ${blockNumber})` : "Confirmed";

  const stateFor = (step: 1 | 2 | 3 | 4): StepState => {
    const order: TxStatus_Order = {
      idle: 0,
      awaitingSignature: 1,
      submitted: 2,
      confirmed: 3,
      synced: 4,
      rejected: 1,
      failed: 2,
      syncTimeout: 4,
    };
    const current = order[status];

    if (status === "rejected" && step === 1) return "failed";
    if (status === "failed" && step === current) return "failed";
    if (status === "syncTimeout" && step === 4) return "failed";
    if (step < current) return "done";
    if (step === current && status !== "idle") return status === "synced" ? "done" : "active";
    return "pending";
  };

  return [
    { label: "Confirm in MetaMask", state: stateFor(1) },
    { label: "Sent to blockchain", state: stateFor(2) },
    { label: confirmedLabel, state: stateFor(3) },
    { label: "Saved in TakaTrace", state: stateFor(4) },
  ];
}

type TxStatus_Order = Record<TxState["status"], number>;

const stateStyles: Record<StepState, string> = {
  pending: "border-line-200 bg-paper text-ink-600",
  active: "border-forest-700 bg-forest-700 text-paper",
  done: "border-forest-700 bg-lime-100 text-forest-700",
  failed: "border-danger-600 bg-danger-100 text-danger-600",
};

/** Horizontal 4-step transaction indicator shown wherever the user signs a transaction (spec 4.5, 13.2). */
export function TxStepper({ tx }: { tx: TxState }) {
  const steps = buildSteps(tx);
  const currentLabel = steps.find((step) => step.state === "active")?.label;

  return (
    <div>
      <ol className="flex items-start gap-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex flex-1 flex-col items-center gap-2 text-center">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                stateStyles[step.state],
              )}
              aria-hidden="true"
            >
              {step.state === "done" ? (
                <Check className="size-4" />
              ) : step.state === "failed" ? (
                <X className="size-4" />
              ) : step.state === "active" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span className="text-xs text-ink-600">{step.label}</span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {currentLabel ?? (tx.status === "synced" ? "Done." : "")}
      </p>
      {tx.errorMessage && (
        <p role="alert" className="mt-3 text-sm text-danger-600">
          {tx.errorMessage}
        </p>
      )}
    </div>
  );
}
