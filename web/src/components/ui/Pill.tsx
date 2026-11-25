import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/** Outlined pill label, e.g. "Why it matters" above a section statement (spec 4.5). */
export function Pill({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-ink-900 px-2.5 py-1 text-xs font-medium tracking-wide text-ink-900",
        className,
      )}
      {...props}
    />
  );
}
