import type { ComponentType, ReactNode } from "react";

export interface StatBlockProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  value: ReactNode;
  caption: ReactNode;
  /** 0–1. When given, renders the progress underline with an accessible label. */
  ratio?: number;
  /** e.g. "97% of recorded weigh-ins are anchored" — read by screen readers for the underline. */
  ratioLabel?: string;
}

export function StatBlock({ icon: Icon, value, caption, ratio, ratioLabel }: StatBlockProps) {
  return (
    <div>
      <span className="flex size-8 items-center justify-center rounded-full bg-cream-100 text-forest-700" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-5xl font-medium leading-none text-ink-900">{value}</p>
      <p className="mt-2 max-w-[22ch] text-sm text-ink-600">{caption}</p>
      {ratio !== undefined && (
        <div
          role="img"
          aria-label={ratioLabel}
          className="mt-3 h-0.5 w-40 overflow-hidden rounded-full bg-line-200"
        >
          <div className="h-full bg-forest-700" style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
