import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: ReactNode;
  error?: string;
  /** Shown inside the field, e.g. "kg" or "+254". */
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, startAdornment, endAdornment, id, className, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink-900">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger-600">
            {" "}
            *
          </span>
        )}
      </label>
      <div
        className={cn(
          "mt-1.5 flex min-h-12 items-center gap-2 rounded-input border bg-paper px-3",
          error ? "border-danger-600" : "border-line-200 focus-within:border-forest-700",
        )}
      >
        {startAdornment && <span className="shrink-0 text-sm text-ink-600">{startAdornment}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink-900 outline-none placeholder:text-ink-600"
          {...props}
        />
        {endAdornment && <span className="shrink-0 text-sm text-ink-600">{endAdornment}</span>}
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
