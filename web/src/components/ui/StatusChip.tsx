import type { ComponentType } from "react";
import {
  BadgeCheck,
  CircleAlert,
  Clock,
  FileClock,
  Loader,
  MessageSquareWarning,
  PenLine,
  Replace,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { DisplayStatus, PayoutStatus } from "../../types/api";

type ChipTone = "neutral" | "amber" | "success" | "danger";

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-cream-100 text-ink-600",
  amber: "bg-amber-100 text-amber-700",
  success: "bg-lime-100 text-forest-700",
  danger: "bg-danger-100 text-danger-600",
};

export interface ChipProps {
  tone: ChipTone;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  className?: string;
  /** Spins the icon, used for in-progress states like "Anchoring". */
  spin?: boolean;
}

export function Chip({ tone, icon: Icon, label, className, spin }: ChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      <Icon className={cn("size-3.5", spin && "animate-spin")} aria-hidden="true" />
      {label}
    </span>
  );
}

/** A receipt status that only exists transiently in the UI, before a tx hash is known. */
export type UiReceiptStatus = DisplayStatus | "AWAITING_SIGNATURE";

const receiptChip: Record<UiReceiptStatus, Omit<ChipProps, "label">> = {
  DRAFT: { tone: "neutral", icon: FileClock },
  AWAITING_SIGNATURE: { tone: "amber", icon: PenLine },
  ANCHORING: { tone: "amber", icon: Loader, spin: true },
  ANCHORED: { tone: "success", icon: ShieldCheck },
  CLAIMED: { tone: "success", icon: BadgeCheck },
  DISPUTED: { tone: "amber", icon: MessageSquareWarning },
  SUPERSEDED: { tone: "neutral", icon: Replace },
  ANCHOR_FAILED: { tone: "danger", icon: CircleAlert },
  NEEDS_REANCHOR: { tone: "danger", icon: RotateCcw },
};

const receiptDefaultLabel: Record<UiReceiptStatus, string> = {
  DRAFT: "Not yet on blockchain",
  AWAITING_SIGNATURE: "Waiting for MetaMask",
  ANCHORING: "Saving to blockchain",
  ANCHORED: "On blockchain",
  CLAIMED: "Claimed",
  DISPUTED: "Under dispute",
  SUPERSEDED: "Replaced",
  ANCHOR_FAILED: "Not saved to blockchain",
  NEEDS_REANCHOR: "Blockchain was reset",
};

export interface ReceiptStatusChipProps {
  status: UiReceiptStatus;
  /** Overrides the default label, e.g. "Claimed by Brand A" or "Replaced by TT-…". */
  detail?: string;
  className?: string;
}

export function ReceiptStatusChip({ status, detail, className }: ReceiptStatusChipProps) {
  const config = receiptChip[status];
  return <Chip {...config} label={detail ?? receiptDefaultLabel[status]} className={className} />;
}

const payoutChip: Record<PayoutStatus, ChipProps> = {
  PENDING: { tone: "amber", icon: Clock, label: "Pending" },
  SENT: { tone: "amber", icon: Send, label: "Sent" },
  PAID: { tone: "success", icon: BadgeCheck, label: "Paid" },
  FAILED: { tone: "danger", icon: CircleAlert, label: "Failed" },
  UNKNOWN: { tone: "amber", icon: Clock, label: "Checking with provider" },
};

export function PayoutStatusChip({ status, className }: { status: PayoutStatus; className?: string }) {
  return <Chip {...payoutChip[status]} className={className} />;
}
