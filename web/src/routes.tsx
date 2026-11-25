import { createBrowserRouter } from "react-router";
import { PublicLayout } from "./layouts/PublicLayout";
import { AppShell } from "./layouts/AppShell";
import { RequireRole } from "./components/layout/RequireRole";
import { config } from "./config";
import type { Role } from "./types/api";

/** Lazily loads a page module and wraps it in the role guard, for route-level code splitting (spec 9). */
function guardedLazy(role: Role, importPage: () => Promise<{ default: React.ComponentType }>) {
  return async () => {
    const { default: Page } = await importPage();
    return {
      Component: () => (
        <RequireRole role={role}>
          <Page />
        </RequireRole>
      ),
    };
  };
}

function lazyPage(importPage: () => Promise<{ default: React.ComponentType }>) {
  return async () => {
    const { default: Component } = await importPage();
    return { Component };
  };
}

const publicRoutes = [
  { index: true, lazy: lazyPage(() => import("./pages/public/Home")) },
  { path: "how-it-works", lazy: lazyPage(() => import("./pages/public/HowItWorks")) },
  { path: "verify", lazy: lazyPage(() => import("./pages/public/Verify")) },
  { path: "verify/:receiptId", lazy: lazyPage(() => import("./pages/public/VerifyResult")) },
  { path: "v/:receiptId", lazy: lazyPage(() => import("./pages/public/ShortLinkRedirect")) },
  { path: "transparency", lazy: lazyPage(() => import("./pages/public/Transparency")) },
  { path: "about", lazy: lazyPage(() => import("./pages/public/About")) },
  { path: "contact", lazy: lazyPage(() => import("./pages/public/Contact")) },
  { path: "sign-in", lazy: lazyPage(() => import("./pages/public/SignIn")) },
  ...(config.demoMode
    ? [{ path: "simulate/phone", lazy: lazyPage(() => import("./pages/simulate/PhoneSimulator")) }]
    : []),
];

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PublicLayout,
    children: publicRoutes,
  },
  {
    path: "/app",
    Component: AppShell,
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/app/AppIndex")) },
      { path: "account", lazy: lazyPage(() => import("./pages/account/Account")) },

      { path: "centre", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Dashboard")) },
      { path: "centre/weigh-ins/new", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/NewWeighIn")) },
      { path: "centre/receipts", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Receipts")) },
      {
        path: "centre/receipts/:receiptId",
        lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/ReceiptDetail")),
      },
      { path: "centre/pickers", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Pickers")) },
      { path: "centre/pickers/new", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/PickerNew")) },
      {
        path: "centre/pickers/:pickerId",
        lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/PickerDetail")),
      },
      { path: "centre/payouts", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Payouts")) },
      { path: "centre/disputes", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Disputes")) },
      {
        path: "centre/disputes/:disputeId",
        lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/DisputeDetail")),
      },
      { path: "centre/prices", lazy: guardedLazy("CENTRE_OPERATOR", () => import("./pages/centre/Prices")) },

      { path: "brand", lazy: guardedLazy("BRAND_OFFICER", () => import("./pages/brand/Dashboard")) },
      { path: "brand/credits", lazy: guardedLazy("BRAND_OFFICER", () => import("./pages/brand/Credits")) },
      { path: "brand/claims", lazy: guardedLazy("BRAND_OFFICER", () => import("./pages/brand/Claims")) },
      { path: "brand/reports", lazy: guardedLazy("BRAND_OFFICER", () => import("./pages/brand/Reports")) },

      { path: "admin", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Overview")) },
      { path: "admin/organizations", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Organizations")) },
      {
        path: "admin/organizations/:orgId",
        lazy: guardedLazy("ADMIN", () => import("./pages/admin/OrganizationDetail")),
      },
      { path: "admin/users", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Users")) },
      { path: "admin/chain", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Chain")) },
      { path: "admin/audit", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Audit")) },
      { path: "admin/integrations", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Integrations")) },
      ...(config.demoMode
        ? [{ path: "admin/demo", lazy: guardedLazy("ADMIN", () => import("./pages/admin/Demo")) }]
        : []),
    ],
  },
  { path: "*", lazy: lazyPage(() => import("./pages/public/NotFound")) },
]);
