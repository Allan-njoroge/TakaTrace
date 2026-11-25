import { Outlet, Link } from "react-router";
import { Phone } from "lucide-react";
import { Logo } from "../components/brand/Logo";
import { PillNav } from "../components/ui/PillNav";
import { SystemBanners } from "../components/layout/SystemBanners";
import { useMe } from "../hooks/useMe";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { config } from "../config";
import { shortAddress } from "../lib/format";

const NAV_ITEMS = [
  { label: "Home", to: "/", end: true },
  { label: "How it works", to: "/how-it-works" },
  { label: "Verify", to: "/verify" },
  { label: "Transparency", to: "/transparency" },
];

const ROLE_LABEL: Record<string, string> = {
  CENTRE_OPERATOR: "Buying centre",
  BRAND_OFFICER: "Brand",
  ADMIN: "Admin",
};

function HeaderRight() {
  const { data: me } = useMe();

  if (me) {
    return (
      <Link
        to="/app"
        className="flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink-900"
      >
        {shortAddress(me.user.walletAddress)} {"·"} {ROLE_LABEL[me.user.role] ?? me.user.role}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link to="/sign-in" className="hidden text-sm font-medium text-white/90 underline-offset-4 hover:underline sm:inline">
        Sign in
      </Link>
      <span
        title="Pickers: check receipts and earnings from any phone"
        className="flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink-900"
      >
        <Phone className="size-4" aria-hidden="true" />
        Dial {config.ussdCode}
      </span>
    </div>
  );
}

export function PublicLayout() {
  useLiveEvents("public");

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="bg-forest-700 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <Logo />
          <PillNav items={NAV_ITEMS} mobileExtra={<HeaderRight />} />
          <div className="hidden md:block">
            <HeaderRight />
          </div>
        </div>
      </header>
      <SystemBanners scope="public" />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-forest-700 px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col items-start justify-between gap-8 border-b border-white/20 pb-10 md:flex-row">
          <Logo />
          <form className="flex w-full max-w-sm items-center gap-2" aria-label="Subscribe to the monthly recovery report">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              className="min-h-11 w-full rounded-full border border-white/30 bg-transparent px-4 text-sm text-white placeholder:text-white/60 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            />
            <button type="submit" className="min-h-11 shrink-0 rounded-full bg-forest-800 px-5 text-sm font-semibold text-white">
              Subscribe
            </button>
          </form>
        </div>
        <nav aria-label="Footer" className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
          <Link to="/about">About</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/transparency">Transparency</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <p className="mt-8 text-xs text-white/80">
          {config.demoMode && "Built for SDG 12 · Fictional demo data · "}
          <Link to="/transparency" className="underline-offset-4 hover:underline">
            Contract on {config.chainName}
          </Link>
        </p>
      </div>
    </footer>
  );
}
