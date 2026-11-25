import type { ComponentType, ReactNode } from "react";

export interface FeatureRowProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  description: ReactNode;
  /** Set false on the last row in a stacked group to omit the divider. */
  withDivider?: boolean;
}

export function FeatureRow({ icon: Icon, title, description, withDivider = true }: FeatureRowProps) {
  return (
    <div className={withDivider ? "border-b border-line-200 pb-6" : undefined}>
      <span className="flex size-12 items-center justify-center rounded-full bg-lime-300 text-forest-700" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-600">{description}</p>
    </div>
  );
}
