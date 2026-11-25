import { Link } from "react-router";
import { cn } from "../../lib/cn";

/** White pill with the TakaTrace mark and wordmark (spec 6.1). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2 rounded-full bg-paper py-1.5 pl-1.5 pr-3 text-sm font-semibold text-ink-900",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-lime-300" aria-hidden="true">
        TT
      </span>
      TakaTrace
    </Link>
  );
}
