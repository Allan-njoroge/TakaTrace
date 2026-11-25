import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Copy, LogOut, Menu, X } from "lucide-react";
import { Logo } from "../components/brand/Logo";
import type { PillNavItem } from "../components/ui/PillNav";
import { NetworkChip } from "../components/chain/NetworkChip";
import { SystemBanners } from "../components/layout/SystemBanners";
import { useMe } from "../hooks/useMe";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { shortAddress } from "../lib/format";
import { toast } from "../lib/toast";
import type { Role } from "../types/api";

const NAV_BY_ROLE: Record<Role, PillNavItem[]> = {
  CENTRE_OPERATOR: [
    { label: "Dashboard", to: "/app/centre", end: true },
    { label: "Weigh-ins", to: "/app/centre/weigh-ins/new" },
    { label: "Receipts", to: "/app/centre/receipts" },
    { label: "Pickers", to: "/app/centre/pickers" },
    { label: "Payouts", to: "/app/centre/payouts" },
    { label: "Disputes", to: "/app/centre/disputes" },
    { label: "Prices", to: "/app/centre/prices" },
  ],
  BRAND_OFFICER: [
    { label: "Dashboard", to: "/app/brand", end: true },
    { label: "Available credits", to: "/app/brand/credits" },
    { label: "My claims", to: "/app/brand/claims" },
    { label: "Reports", to: "/app/brand/reports" },
  ],
  ADMIN: [
    { label: "Overview", to: "/app/admin", end: true },
    { label: "Organisations", to: "/app/admin/organizations" },
    { label: "Users", to: "/app/admin/users" },
    { label: "Blockchain", to: "/app/admin/chain" },
    { label: "Audit log", to: "/app/admin/audit" },
    { label: "Integrations", to: "/app/admin/integrations" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  CENTRE_OPERATOR: "Buying centre",
  BRAND_OFFICER: "Brand",
  ADMIN: "Admin",
};

function AccountMenu() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!me) return null;

  const walletAddress = me.user.walletAddress;

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(queryKeys.me(), null);
    navigate("/");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(walletAddress);
    toast.success("Address copied");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white"
      >
        {shortAddress(me.user.walletAddress)} {"·"} {ROLE_LABEL[me.user.role]}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-card border border-line-200 bg-paper p-2 text-ink-900 shadow-sm"
        >
          <p className="px-2 py-1.5 text-xs text-ink-600">{me.organization?.name ?? "No organisation"}</p>
          <Link
            to="/app/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-input px-2 py-2 text-sm hover:bg-cream-100"
          >
            My account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void handleCopy();
            }}
            className="flex w-full items-center gap-2 rounded-input px-2 py-2 text-left text-sm hover:bg-cream-100"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy address
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-input px-2 py-2 text-left text-sm text-danger-600 hover:bg-danger-100"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileNavSheet({ items }: { items: PillNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white lg:hidden"
      >
        <Menu className="size-4" aria-hidden="true" />
        Menu
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="App navigation" className="fixed inset-0 z-50 flex flex-col bg-forest-700 p-6 lg:hidden">
          <div className="flex justify-end">
            <button
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
                <Link to={item.to} onClick={() => setOpen(false)} className="block rounded-input px-3 py-3 text-xl font-medium text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function AppShell() {
  const { data: me } = useMe();
  const items = me ? NAV_BY_ROLE[me.user.role] : [];
  const liveStatus = useLiveEvents("app", Boolean(me));

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="bg-forest-700 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full border border-white/30 p-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? "text-white" : "text-white/80 hover:text-white"}`
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
          <MobileNavSheet items={items} />
          <div className="flex items-center gap-2">
            {liveStatus === "polling" && (
              <span className="hidden text-xs text-white/70 sm:inline" title="Live updates aren't connecting; refreshing periodically instead.">
                Live updates paused
              </span>
            )}
            <NetworkChip />
            <AccountMenu />
          </div>
        </div>
      </header>
      <SystemBanners scope="app" />
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
