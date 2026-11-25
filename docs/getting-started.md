# Getting started

This guide walks you through setting up TakaTrace on your own computer from nothing, step by step. It assumes no technical background beyond being comfortable installing programs and copying/pasting text. If a step says "run this command," it means: type or paste the text into a terminal window and press Enter — what a terminal is and how to open one is explained below.

This only needs to be done **once** per computer. After that, see [Everyday commands](everyday-commands.md) for the short version you'll use every time.

---

## What you're about to install

A few free programs, plus this project's code:

1. **Node.js** — the engine that runs the website and the server.
2. **Git** — downloads the project's code (if you don't already have the code as a folder).
3. **MetaMask** — a browser extension that acts like a digital wallet and ID card for signing in.
4. **Infisical CLI** — fetches the project's settings files (`server/.env`, `web/.env`) from your team's shared Infisical account, so nobody has to send them around. Only needed if your team uses Infisical; otherwise you can create the settings by hand.
5. **This project's code**, plus its own dependencies, which a script installs for you automatically.

Total time: 15–30 minutes, depending on download speeds.

---

## Step 1 — Install Node.js

Node.js is required to run both the backend server and the website.

1. Go to **[nodejs.org](https://nodejs.org)**.
2. Download the **LTS** version (the one labelled "Recommended for most users").
3. Run the installer and click through with the default options.
4. To check it worked, open a terminal (see the box below) and run:
   ```shell
   node --version
   ```
   You should see something like `v22.14.0` or higher. If you see "command not found" instead, restart your computer and try again — Windows sometimes needs a restart for new programs to be found by the terminal.

> **What's a terminal?**
> A terminal (also called "command line" or "shell") is a plain text window where you type commands instead of clicking things.
> - **Windows:** Search for "Git Bash" in the Start menu (installed with Git — see Step 2) and open it. Don't use PowerShell or Command Prompt for this project's scripts, since they use a different scripting language (Git Bash is included automatically with Git).
> - **Mac:** Search for "Terminal" with Spotlight (Cmd+Space) and open it.
>
> You'll keep this window open for as long as you want the project running.

---

## Step 2 — Install Git and get the project's code

If you already have this project's code as a folder on your computer (for example, someone sent you a ZIP file, or you can already see a `TakaTrace` folder), **skip to Step 3**.

Otherwise:

1. Download Git from **[git-scm.com](https://git-scm.com/downloads)** and install it with the default options (on Windows, this also installs **Git Bash**, the terminal mentioned above).
2. Open a terminal, navigate to where you want the project folder to live (for example, your Desktop), and download the code — ask whoever shared this project with you for the exact command, as it depends on where the code is hosted.

---

## Step 3 — Install MetaMask

Buying centre staff, brand staff, and admins sign in with a wallet instead of a username and password. MetaMask is the wallet.

1. Go to **[metamask.io](https://metamask.io)** and click **Download**.
2. Install it as a browser extension (Chrome, Firefox, and Edge are all supported).
3. Open the extension. When it asks you to create a new wallet or import one, **create a new wallet** and follow its setup (it'll ask you to write down a "secret recovery phrase" — for this demo project that phrase doesn't protect anything of real value, but it's good practice to still keep it somewhere safe).
4. Once MetaMask is set up and shows you an empty wallet, come back here.

You don't need to buy any cryptocurrency. Everything in this project runs on a private, play-money blockchain that only your own computer can see — the "money" in it isn't real and never leaves your machine.

---

## Step 4 — Get the project's settings from Infisical

The backend and the website each read a settings file: `server/.env` and `web/.env`. Some of those settings are secrets (API keys, encryption keys), so instead of passing the files around, the team keeps them in **[Infisical](https://infisical.com)**, a shared secrets manager. Infisical fills in those same two files for you — the files stay in the same folders, and the project reads them exactly as before.

> **Not using Infisical?** Skip this step. `./start.sh` works with hand-made `.env` files too — see "creating `server/.env`" in Step 5.

### 4a — Install the Infisical CLI (once per computer)

- **Windows:** open PowerShell (just this once) and run:
  ```shell
  winget install infisical
  ```
  Then close and reopen Git Bash.
- **Mac:** `brew install infisical/get-cli/infisical`

Check it worked (in Git Bash / Terminal):
```shell
infisical --version
```

### 4b — Sign in and link the project (once per computer)

Ask whoever runs the project to invite you to the **TakaTrace** project in Infisical. Then, in a terminal **inside the project folder**:

```shell
infisical login
infisical init
```

- `infisical login` opens your browser to sign in. (If your team uses Infisical's EU cloud or its own server, pick that option when asked.)
- `infisical init` asks which project this folder belongs to — choose **TakaTrace**. It saves the choice in a small `.infisical.json` file in the project folder. That file only holds the project's ID, not any secrets.

### 4c — Download the settings

```shell
./env.sh pull
```

You should see:
```
Pulling .env files from Infisical (dev)...
  server/.env: updated from Infisical /server (dev)
  web/.env: updated from Infisical /web (dev)
```

That's it. From now on **`./start.sh` does this for you automatically** every time it starts (its `[0/5] Infisical` line), so you always get the team's latest settings. If you're offline or signed out, it prints a warning and carries on with the `.env` files you already have.

<details>
<summary>More about <code>./env.sh</code> (for whoever manages the settings)</summary>

| Command | What it does |
|---|---|
| `./env.sh pull` | Infisical → `server/.env` and `web/.env`. The previous file is kept as `.env.bak` (with its comments). If Infisical is unreachable or empty, nothing is overwritten. |
| `./env.sh push` | `server/.env` and `web/.env` → Infisical. Use it once to upload the first copy, or after changing a setting locally that everyone should get. |
| `./env.sh status` | Shows whether the CLI is installed, the project is linked, and both `.env` files exist. |
| `./env.sh pull prod` | Same, but from another Infisical environment (default is `dev`). |

How Infisical folders map to files:

| Infisical folder | File in the project | Read by |
|---|---|---|
| `/server` | `server/.env` | backend |
| `/web` | `web/.env` | website |

Other switches:
- `INFISICAL_PULL=0 ./start.sh` — start without pulling (use your local `.env` files as they are, e.g. while trying out a local change).
- For CI or a shared server, use an Infisical machine identity: set `INFISICAL_TOKEN` and `INFISICAL_PROJECT_ID` instead of `infisical login` / `infisical init`.

Note: Infisical writes plain `KEY='value'` lines, so comments from a hand-written `.env` aren't kept in the pulled file. `server/.env.example` keeps the explanation of every setting.
</details>

---

## Step 5 — Start the project

1. Open a terminal **inside the project folder**. In Git Bash, you can usually right-click the folder in File Explorer and choose "Git Bash Here"; otherwise navigate to it with `cd path/to/TakaTrace`.
2. Run:
   ```shell
   ./start.sh
   ```
3. Watch the output. The first time you run this, it will take several minutes — it's downloading and preparing everything it needs. You'll see progress like:
   ```
   [0/5] Infisical: pulling server/.env and web/.env
   [1/5] Hardhat node: starting...
   [2/5] Deploying the contract
   [3/5] Backend: installing dependencies (first run — this takes a while)
   [4/5] Frontend: installing dependencies (first run — this takes a while)
   [5/5] Done
   ```
4. When you see `[5/5] Done` along with three web addresses printed, everything is running. **Leave this terminal window open** — closing it stops the project. (See [Troubleshooting](troubleshooting.md) if you ran into trouble instead of reaching this screen.)

> If `server/.env` doesn't exist yet, the script will stop and tell you to create it. If your team uses Infisical, run `./env.sh pull` (Step 4); otherwise see the box below.

<details>
<summary>Without Infisical: creating <code>server/.env</code> by hand</summary>

The backend needs a small configuration file with its settings. If `./start.sh` tells you `server/.env is missing` and you're not using Infisical:

1. In the `server` folder, copy `.env.example` to a new file named `.env` (same folder).
2. Open `.env` in any text editor.
3. For trying this out locally, the defaults are already set up correctly — you mainly need to generate two secret values. In your terminal, run:
   ```shell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Run it twice, and paste one result into `WEBHOOK_TOKEN=` and the other into `ID_ENCRYPTION_KEY=` in `.env`.
4. Make sure `DEMO_MODE=true` is set (it is, by default) — this turns on the test tools covered in this guide.
5. Save the file and run `./start.sh` again.

Full detail on every setting is in [`BACKEND_SPEC.md`](../BACKEND_SPEC.md), section 5, if you need it.

The website (frontend) has its own small configuration file too, `web/.env`, but it's already set up correctly for local use and ships with the project — you don't need to create or edit it unless you've changed one of the default ports.
</details>

---

## Step 6 — Open the website

Open your web browser and go to:

```
http://localhost:5173
```

You should see the TakaTrace homepage. This is the same website a real buying centre, brand, or admin would use.

---

## Step 7 — Connect MetaMask to the local blockchain

By default, MetaMask only knows about real blockchains. You need to tell it about this project's private local one, one time.

1. Click the MetaMask icon in your browser toolbar.
2. Click the **network dropdown** at the top (it probably says "Ethereum Mainnet").
3. Click **"Add a custom network"** (wording may vary slightly by version).
4. Fill in:
   | Field | Value |
   |---|---|
   | Network name | `TakaTrace Local` |
   | RPC URL | `http://127.0.0.1:8545` |
   | Chain ID | `31337` |
   | Currency symbol | `ETH` |
5. Save, then make sure MetaMask is switched to this new network (check the dropdown again).

---

## Step 8 — Import a test account

TakaTrace comes with a handful of ready-made test identities (an admin, a buying centre, two brands) so you can try the app immediately without anyone having to "approve" your personal wallet first.

Full details and all the test values are in **[Test credentials](test-credentials.md)** — here's the short version to get into the admin account:

1. In MetaMask, click the **account icon** (top right) → **"Add account or hardware wallet"** → **"Import account"**.
2. Choose **Private Key** as the type.
3. Paste this key exactly as written (it's a publicly known test-only key built into every Hardhat project — it is never used for anything real, and MetaMask may show a warning about that, which is expected here):
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click **Import**. A new account appears, starting with address `0xf39Fd...`.
5. Switch MetaMask to that account (click it in the account list).

---

## Step 9 — Sign in

1. On the TakaTrace website, click **"Sign in with MetaMask"**.
2. MetaMask will pop up twice:
   - First, to **connect** your account to the site — approve it.
   - Second, to **sign a message** — this is free, it is not a transaction, and it does not cost anything or move any funds. It's just proving you own that account, the same way a signature proves you wrote a letter.
3. You'll land on the admin dashboard.

You're set up. From here, see:
- **[Using TakaTrace](using-takatrace.md)** for a full walkthrough of every part of the app — buying centre, brand, public verification, picker SMS/USSD, and admin.
- **[Test credentials](test-credentials.md)** for the other test logins (buying centre, brands) and test waste pickers.
- **[Project structure](project-structure.md)** to understand what you're looking at.
- **[Everyday commands](everyday-commands.md)** for how to stop and restart the project next time.
