import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const errorId = `${checkboxId}-error`;

  return (
    <div>
      <label htmlFor={checkboxId} className="flex items-start gap-3">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-0.5 size-5 shrink-0 rounded-[4px] border border-line-200 text-forest-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700",
            className,
          )}
          {...props}
        />
        <span className="text-sm text-ink-900">{label}</span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
});
