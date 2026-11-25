import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set false while a transaction is in flight: disables Escape and the close button. */
  canClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, footer, canClose = true }: ModalProps) {
  const containerRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose, canClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card bg-paper p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-semibold text-ink-900">
            {title}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
