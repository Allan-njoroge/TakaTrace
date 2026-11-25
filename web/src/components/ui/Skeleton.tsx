import { cn } from "../../lib/cn";

/** A placeholder bar matching the final layout's size, to avoid loading-state layout shift. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-input bg-line-200", className)} aria-hidden="true" />;
}
