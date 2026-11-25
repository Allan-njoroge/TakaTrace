import { forwardRef, useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: ReactNode;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, error, id, className, required, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-semibold text-ink-900">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger-600">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="relative mt-1.5">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(
            "min-h-12 w-full appearance-none rounded-input border bg-paper px-3 py-3 pr-9 text-base text-ink-900 outline-none focus:border-forest-700",
            error ? "border-danger-600" : "border-line-200",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
      </div>
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-ink-600">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-danger-600">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});
