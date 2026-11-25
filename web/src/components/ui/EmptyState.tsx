import type { ComponentType, ReactNode } from "react";

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  action?: ReactNode;
}

/** One sentence saying what will appear, plus the primary action (spec 4.5). */
export function EmptyState({ icon: Icon, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-lime-300 text-forest-700">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-base text-ink-600">{title}</p>
      {action}
    </div>
  );
}
