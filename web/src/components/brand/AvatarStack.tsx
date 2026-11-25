export interface AvatarStackProps {
  /** Initials for up to 3 overlapping circles. Never real photos of pickers (spec 4.5, 4.7). */
  initials: string[];
  count: number;
  label: string;
}

export function AvatarStack({ initials, count, label }: AvatarStackProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2" aria-hidden="true">
        {initials.slice(0, 3).map((initial, index) => (
          <span
            key={index}
            className="flex size-7 items-center justify-center rounded-full border-2 border-paper bg-forest-500 text-xs font-semibold text-paper"
          >
            {initial}
          </span>
        ))}
      </div>
      <p className="text-sm text-ink-600">
        <span className="font-semibold text-ink-900">{count.toLocaleString("en-KE")}</span> {label}
      </p>
    </div>
  );
}
