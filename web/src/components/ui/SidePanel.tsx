import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  canClose?: boolean;
}

/** Right-side panel, 480px on desktop, full screen on mobile (spec 4.5). */
export function SidePanel({ isOpen, onClose, title, children, canClose = true }: SidePanelProps) {
  const containerRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose, canClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
        tabIndex={-1}
        className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-paper p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="side-panel-title" className="text-xl font-semibold text-ink-900">
            {title}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-4 flex-1">{children}</div>
      </div>
    </div>
  );
}
