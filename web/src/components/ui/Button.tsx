import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "on-dark" | "ghost" | "danger" | "wallet";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner in place of the leading icon and keeps the button's width fixed. */
  loading?: boolean;
  /** Label to show while loading, e.g. "Saving…". Defaults to the normal children. */
  loadingLabel?: ReactNode;
  /** Leading icon. Defaults to an arrow for "primary" and a wallet glyph for "wallet". Pass `null` to hide it. */
  icon?: ReactNode | null;
}

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 disabled:cursor-not-allowed disabled:opacity-60";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-lime-300 text-forest-700 hover:bg-lime-300/90",
  secondary: "border border-ink-900 bg-paper text-ink-900 hover:bg-cream-100",
  "on-dark": "bg-paper text-forest-700 hover:bg-cream-100",
  ghost: "bg-transparent px-2 py-2 text-ink-900 underline-offset-4 hover:underline",
  danger: "bg-danger-600 text-paper hover:bg-danger-600/90",
  wallet: "bg-lime-300 text-forest-700 hover:bg-lime-300/90",
};

const defaultIcon: Partial<Record<ButtonVariant, ReactNode>> = {
  primary: <ArrowUpRight className="size-3.5" />,
  wallet: <Wallet className="size-3.5" />,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, loadingLabel, icon, children, className, disabled, type = "button", ...props },
  ref,
) {
  const resolvedIcon = icon === undefined ? defaultIcon[variant] : icon;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonBaseClass, buttonVariantClasses[variant], className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : resolvedIcon ? (
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-paper"
          aria-hidden="true"
        >
          {resolvedIcon}
        </span>
      ) : null}
      <span>{loading && loadingLabel !== undefined ? loadingLabel : children}</span>
    </button>
  );
});
