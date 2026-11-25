import { useEffect, useId, useRef, useState } from "react";
import { NavLink } from "react-router";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/cn";

export interface PillNavItem {
  label: string;
  to: string;
  end?: boolean;
}

interface PillNavProps {
  items: PillNavItem[];
  /** Extra content shown in the mobile sheet below the links, e.g. "Sign in" and the USSD pill. */
  mobileExtra?: React.ReactNode;
}

/**
 * Outlined pill navigation for the green header/top bar (spec 4.5, 6.1, 6.3).
 * Collapses to a "Menu" pill under `md` that opens a full-screen sheet.
 */
export function PillNav({ items, mobileExtra }: PillNavProps) {
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex items-center gap-1 rounded-full border border-white/30 p-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white",
                    isActive && "text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="size-1 rounded-full bg-lime-300" aria-hidden="true" />}
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={sheetId}
        className="flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white md:hidden"
      >
        <Menu className="size-4" aria-hidden="true" />
        Menu
      </button>

      {open && (
        <div
          id={sheetId}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className="fixed inset-0 z-50 flex flex-col bg-forest-700 p-6 md:hidden"
        >
          <div className="flex justify-end">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-full border border-white/30 text-white"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-8 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-input px-3 py-3 text-xl font-medium text-white/80",
                      isActive && "text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {mobileExtra && <div className="mt-8">{mobileExtra}</div>}
        </div>
      )}
    </>
  );
}
