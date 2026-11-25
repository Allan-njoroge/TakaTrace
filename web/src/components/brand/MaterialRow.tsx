import type { ReactNode } from "react";
import { Link } from "react-router";

export interface MaterialRowProps {
  title: string;
  meta: ReactNode;
  thumbnailSrc?: string;
  thumbnailAlt?: string;
  to?: string;
  withDivider?: boolean;
}

/** List row with a thumbnail — used for materials and recent receipts (spec 4.5). */
export function MaterialRow({ title, meta, thumbnailSrc, thumbnailAlt = "", to, withDivider = true }: MaterialRowProps) {
  const titleClass = "text-base font-semibold text-ink-900 group-hover:underline";

  const content = (
    <div className={`flex items-center justify-between gap-4 py-4 ${withDivider ? "border-b border-line-200" : ""}`}>
      <div>
        <p className={titleClass}>{title}</p>
        <p className="mt-1 text-sm text-ink-600">{meta}</p>
      </div>
      {thumbnailSrc && (
        <img src={thumbnailSrc} alt={thumbnailAlt} className="h-14 w-24 shrink-0 rounded-input object-cover" />
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group block">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
}
