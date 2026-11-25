# Project structure

This explains how TakaTrace's code is organised and why, so you can find things and understand how a change in one place affects another. It assumes you've read the [README](../README.md) overview first.

## The three pieces, and how they talk to each other

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────────┐
│   Frontend       │  HTTP  │   Backend         │  RPC   │   Blockchain        │
│   (web/)         │◄──────►│   (server/)       │◄──────►│   (contracts/)      │
│   React website   │        │   API + database  │        │   Smart contract    │
└─────────────────┘        └──────────────────┘        └────────────────────┘
      :5173                       :3010                       :8545
```

- **You** interact only with the **frontend**, in your browser.
- The **frontend** asks the **backend** for data and to perform actions (e.g. "create this receipt") over a normal web API.
- The **backend** is the only piece that talks to the **blockchain** directly. It keeps its own database (for speed and for data that shouldn't be public, like phone numbers) and separately anchors a tamper-evident fingerprint of each receipt on-chain.
- The three pieces run as three separate processes on your computer, each listening on its own "port" (think of a port as a numbered door — :5173, :3010, :8545 above). `./start.sh` starts all three for you.

## Folder-by-folder

```
TakaTrace/
├── contracts/            The smart contract itself (Solidity — TakaTrace.sol)
├── scripts/               One-off utility scripts, e.g. deploying the contract
│
├── server/                 The backend (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── modules/        One folder per feature area — see table below
│   │   ├── chain/           Talks to the blockchain: reads events, sends transactions
│   │   ├── providers/       Pluggable external services (SMS, USSD, M-Pesa, photo storage) — each has a mock and a real mode
│   │   ├── middleware/      Cross-cutting request handling: auth checks, validation
│   │   ├── lib/              Small shared helpers used across modules
│   │   ├── jobs/             Background tasks that run on a timer
│   │   └── db.ts, app.ts, index.ts   Wiring: database connection, the Express app, the startup entry point
│   └── prisma/
│       ├── schema.prisma    The database's structure, in plain English-ish syntax
│       └── seed.ts          Creates the test data described in test-credentials.md
│
├── web/                    The frontend (React + Vite)
│   └── src/
│       ├── pages/            One folder per section of the site — see table below
│       ├── components/       Reusable pieces of interface (buttons, cards, etc.)
│       ├── hooks/             Reusable logic, e.g. "talk to the connected wallet"
│       ├── lib/                Shared helpers, including the code that calls the backend API
│       └── routes.tsx         Maps web addresses (like /admin/overview) to pages
│
├── docs/                   You are here
├── start.sh / stop.sh       Scripts that start/stop the whole project (see everyday-commands.md)
├── README.md                Project overview
├── BACKEND_SPEC.md           Full technical specification of the backend (very detailed — a reference, not a tutorial)
└── FRONTEND_SPEC.md          Full technical specification of the frontend (same)
```

## What each backend module does

The backend is organised by **feature**, not by technical layer — everything about, say, disputes lives together in `server/src/modules/disputes/`.

| Module | Responsibility |
|---|---|
| `auth` | Wallet sign-in (nonce + signature verification), sessions |
| `health` | System status check used by the frontend to detect if the backend/blockchain is reachable |
| `public` | What anyone can see without signing in — the verification page, public stats, partner list |
| `verify` | Looking up a single receipt by its code, for the public verification page |
| `receipts` | Creating and viewing weigh-in receipts, their anchoring status and timeline |
| `pickers` | Registering and looking up waste pickers |
| `centre` | The buying centre's own dashboard data |
| `prices` | Per-material recycling prices a centre is currently paying |
| `payouts` | Paying pickers (mock M-Pesa in demo mode) |
| `disputes` | Flagging and resolving problems with a receipt (e.g. wrong weight recorded) |
| `brand` / `claims` | Brands browsing and claiming verified receipts toward their recycling targets |
| `reports` | CSV/summary exports, EPR (Extended Producer Responsibility) reporting |
| `admin` | Organisation and user management, blockchain status, audit log, integration tests |
| `demo` | Demo-only tools: the phone simulator backend, re-anchoring fix-up — all gated behind `DEMO_MODE=true` |
| `events` | Live updates pushed to the browser as things happen (new receipt, dispute resolved, etc.) |
| `webhooks` | Endpoints that real external services (SMS/USSD/payment providers) call into, in non-demo "sandbox" mode |
| `uploads` | Handling scale-photo uploads |

## What each frontend section does

| Folder | Who sees it | What's there |
|---|---|---|
| `pages/public` | Everyone, no sign-in needed | Homepage, sign-in, the public receipt verification page |
| `pages/admin` | Admins | Overview, organisations, users, blockchain status, audit log, integrations, demo tools |
| `pages/centre` | Buying centre operators | Dashboard, new weigh-in, receipts, pickers, prices, payouts, disputes |
| `pages/brand` | Brand officers | Dashboard, claims, available credits, reports |
| `pages/app` | Any signed-in user | Shared entry point that redirects to the right dashboard for their role |
| `pages/simulate` | Anyone (demo mode) | The on-screen phone simulator for testing the picker SMS/USSD experience |

## Where to go deeper

- **`BACKEND_SPEC.md`** and **`FRONTEND_SPEC.md`** are the full, exhaustive specifications these were built from — every API endpoint, every database table, every business rule. Use them as a reference when you need an exact detail, not as a first read.
- **`INTEGRATION_PROGRESS.md`** records, step by step, how the backend and frontend were wired together to match — useful mainly as project history, not something you need to read to use the app.
