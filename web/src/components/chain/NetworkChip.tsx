import { config } from "../../config";
import { useWallet } from "../../hooks/useWallet";
import { cn } from "../../lib/cn";

/** Green/amber/grey dot showing wallet network status in the app top bar (spec 6.3). */
export function NetworkChip() {
  const { hasWallet, chainId, isWrongNetwork, switchNetwork } = useWallet();

  if (!hasWallet) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white/80">
        <span className="size-2 rounded-full bg-ink-600" aria-hidden="true" />
        No wallet
      </span>
    );
  }

  if (chainId !== null && isWrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => void switchNetwork()}
        className="flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white"
      >
        <span className={cn("size-2 rounded-full bg-amber-600")} aria-hidden="true" />
        Wrong network
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white">
      <span className="size-2 rounded-full bg-lime-300" aria-hidden="true" />
      {config.chainName}
    </span>
  );
}
