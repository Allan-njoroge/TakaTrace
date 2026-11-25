import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shortHash } from "../../lib/format";
import { cn } from "../../lib/cn";

export interface HashDisplayProps {
  value: string;
  /** Pass false for values that are already short (addresses use shortAddress lengths via leadChars/trailChars). */
  leadChars?: number;
  trailChars?: number;
  className?: string;
}

/** Monospace hash/address with a copy button and a tooltip holding the full value (spec 4.5). */
export function HashDisplay({ value, leadChars = 10, trailChars = 6, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs text-ink-900", className)}>
      <span title={value}>{shortHash(value, leadChars, trailChars)}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : `Copy ${value}`}
        className="flex size-6 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100 hover:text-ink-900"
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
    </span>
  );
}
