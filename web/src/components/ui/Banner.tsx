import type { ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "../../lib/cn";

export type BannerSeverity = "info" | "warning" | "danger";

export interface BannerProps {
  severity: BannerSeverity;
  message: ReactNode;
  action?: ReactNode;
}

const severityConfig: Record<BannerSeverity, { className: string; icon: typeof Info }> = {
  info: { className: "bg-cream-100 text-ink-900", icon: Info },
  warning: { className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  danger: { className: "bg-danger-100 text-danger-600", icon: OctagonAlert },
};

/** Full-width strip for system conditions, highest-priority one shown with a "+N more" (spec 6.4). */
export function Banner({ severity, message, action }: BannerProps) {
  const { className, icon: Icon } = severityConfig[severity];
  return (
    <div role={severity === "danger" ? "alert" : "status"} className={cn("flex items-center gap-3 px-4 py-3 text-sm", className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      {action}
    </div>
  );
}
