# TakaTrace

TakaTrace is a demo system for tracking plastic recycling from the street to the recycling brand that pays for it, with every step recorded on a blockchain so the record can't be quietly changed later.

> **This is a demo/training project.** Everything — the organisations, the people, the recycling receipts — is fictional test data running on a private local blockchain. No real money, real companies, or real recycled plastic is involved.

## What problem this solves

Plastic recycling in Kenya today mostly runs on paper and trust: a waste picker brings bottles to a buying centre, gets weighed and paid in cash, and that's it — there's no shared, trustworthy record of how much plastic actually got recycled, who collected it, or whether a brand's recycling claims are real.

TakaTrace gives every weigh-in a permanent, tamper-evident **receipt**:

1. A **waste picker** brings sorted plastic to a **buying centre**.
2. The centre operator weighs it and records a **receipt** (material type, weight, photo of the scale, GPS location).
3. That receipt is **anchored on the blockchain** — a cryptographic fingerprint of it is written to a smart contract, so it can never be edited or deleted without it being obvious.
4. The picker is **paid** (by mobile money in real life; simulated here) and gets an SMS confirmation.
5. A **brand** (a company that buys recycling credits to meet its environmental targets) can see verified, anchored receipts and **claim** them as proof of the recycling it funded.
6. Anyone can **publicly verify** a receipt by its code — scanning a QR code or visiting a link shows exactly what was recorded and confirms it's genuinely on the blockchain, unaltered.
7. An **admin** oversees the whole system: approving buying centres and brands, watching the blockchain connection, resolving disputes, and producing reports.

## How it's built

TakaTrace is three pieces that run together on your own computer:

| Piece | What it does | Built with |
|---|---|---|
| **Blockchain** | A private local Ethereum-compatible blockchain that only your computer can see, running the TakaTrace smart contract | Hardhat, Solidity |
| **Backend** | The API, database, business rules, and the bridge between the app and the blockchain | Node.js, Express, Prisma, SQLite |
| **Frontend** | The website everyone uses — admin, buying centre, and brand dashboards, plus the public verification page | React, Vite |

Buying centres, brands, and admins sign in with a crypto wallet (MetaMask) instead of a password — their wallet's signature proves who they are, both to the website and to the blockchain. Waste pickers don't need a wallet or even a smartphone: their side of the system is designed to work over basic SMS text messages and USSD menus (the `*123#` style menus used on any phone in Kenya), which this project simulates on-screen so it can be tested without a real phone or SIM card.

## Documentation

Everything you need to install, run, and test this project is in [`docs/`](docs/):

| Guide | Read this when |
|---|---|
| **[Getting started](docs/getting-started.md)** | You're setting this up for the first time. Step-by-step, no prior technical knowledge assumed. |
| **[Using TakaTrace](docs/using-takatrace.md)** | You're set up and want a full walkthrough of the whole app — picker, buying centre, brand, public verification, and admin. |
| **[Test credentials](docs/test-credentials.md)** | You need a wallet, login, or test picker to try the app with. |
| **[Project structure](docs/project-structure.md)** | You want to understand how the pieces fit together and where to find things. |
| **[Everyday commands](docs/everyday-commands.md)** | You've already set up once and just want to start/stop/reset things day to day. |
| **[Troubleshooting](docs/troubleshooting.md)** | Something broke or showed an error you don't understand. |

## Quick start

If you've already read [Getting started](docs/getting-started.md) once and just need the commands:

```shell
./start.sh   # starts everything: blockchain, backend, frontend
./stop.sh    # stops everything cleanly
```

Then open **http://localhost:5173** in your browser.
