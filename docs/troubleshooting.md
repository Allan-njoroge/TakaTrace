# Troubleshooting

Common problems you might run into, in plain language, and what to do about each.

---

### "This wallet isn't registered. Ask an admin to add you." when signing in

This means the MetaMask account you're signed in as isn't one TakaTrace knows about yet. This is expected the first time you try your own personal wallet — only the test accounts and anything an admin has explicitly added can sign in.

**Fix:** Use one of the ready-made test accounts instead — see [Test credentials](test-credentials.md). Or have an admin add your wallet address under **Admin → Organizations → (pick one) → Add user**.

---

### "Your wallet isn't approved on the blockchain yet."

The account exists in TakaTrace's records, but hasn't been separately approved on the smart contract itself (these are two different checks, for security). This sometimes happens right after the local blockchain restarts, before the next `./start.sh` has had a chance to fix it up.

**Fix:** Run `./start.sh` again — it automatically detects and re-approves accounts that need it. If it still happens, see "Local blockchain was restarted" below.

---

### "Local blockchain was restarted. Receipts need re-anchoring."

Your private local blockchain doesn't save its history between restarts — every time it starts fresh, it forgets everything, including the receipts that were anchored to it before. TakaTrace notices this and tells you.

**Fix:** This is handled **automatically** by `./start.sh` — just run it, and it checks for and fixes any receipts that need re-anchoring as one of its normal steps (you'll see a line like `Checking whether any receipts need re-anchoring...`). You never need to do this by hand.

---

### Visiting `http://127.0.0.1:8545` in the browser shows an error like `"Parse error: Unexpected end of JSON input"`

This is expected, not a problem — that address isn't a webpage meant to be opened in a browser; it's a technical endpoint the blockchain tool talks to behind the scenes using a different kind of request than a browser sends. If MetaMask and the website can talk to it (you can sign in, and the site loads data), everything is fine. You never need to visit that address yourself.

---

### "The smart contract isn't deployed on this network."

The backend can't find the smart contract on the currently-running blockchain — usually because the blockchain was restarted without redeploying it.

**Fix:** Run `./start.sh` — it checks for exactly this and redeploys automatically when needed. If you're running things manually instead of with the script, redeploy with:
```shell
npx hardhat run scripts/deploy.ts --network localhost
```

---

### A port is already in use / "address already in use" / `EADDRINUSE`

This means something is already using one of the three "doors" (ports) TakaTrace needs — `8545` (blockchain), `3010` (backend), or `5173` (frontend). Often this is TakaTrace itself, left running from before.

**Fix:**
```shell
./stop.sh
./start.sh
```
If that doesn't clear it, something unrelated to this project is using that port — close whatever other program might be using it, or ask for help identifying it.

---

### A native module error when starting the backend (mentions `ERR_DLOPEN_FAILED`, `NODE_MODULE_VERSION`, or `better-sqlite3`)

Some of the backend's building blocks are compiled specifically for the exact version of Node.js you have installed. If that version changes (e.g. you updated Node, or a different Node version was used before), those pieces need to be rebuilt.

**Fix:** `./start.sh` detects this automatically and rebuilds what's needed before starting the backend. If you're seeing this error, just run `./start.sh` again. If it still fails and nothing else is running on port 3010, try:
```shell
cd server
npm rebuild
cd ..
./start.sh
```

---

### The `./start.sh` or `./stop.sh` commands don't run / "command not found" / looks like it's trying to run as a program, not a script

These are shell scripts and need a terminal that understands that kind of script.

- **Windows:** Use **Git Bash**, not PowerShell or Command Prompt (installed automatically with Git — search for "Git Bash" in the Start menu).
- **Mac/Linux:** Use the regular Terminal app.

---

### The website loads but looks broken, blank, or stuck "Loading..." forever

This usually means the website (frontend) is running but can't reach the backend — check for one of the backend-related problems above first (ports, native modules, etc.), since the frontend depends on the backend being up.

**Fix:**
1. Open your browser's developer console (right-click the page → **Inspect** → **Console** tab) and look for red error text — it often names the problem directly.
2. Confirm the backend is actually reachable by visiting `http://localhost:3010/api/health` directly — you should see a small block of JSON text, not an error page. If that doesn't load, the backend isn't running; see "A port is already in use" and the native-module problem above, or just run `./stop.sh` then `./start.sh`.

---

### MetaMask shows the wrong network, or keeps asking you to switch

The website only works against the **TakaTrace Local** network (Chain ID `31337`) — see [Getting started](getting-started.md) step 7 for how to add it if you haven't, or switch MetaMask to it in the network dropdown if you have.

**Fix:** Click the MetaMask icon → network dropdown at the top → select **TakaTrace Local**.

---

### Signing in does nothing, or MetaMask never pops up

1. Make sure the MetaMask browser extension is actually installed and unlocked (click its icon — if it asks for your password, it's locked).
2. Some browsers block extension pop-ups by default on first use — check for a small MetaMask icon with a dot/badge in the browser's toolbar or address bar, which means it's waiting for your attention.
3. Try reloading the TakaTrace page and clicking **Sign in with MetaMask** again.

---

### Nothing above matches what you're seeing

1. Check the relevant log file in `.dev-logs/` (see [Everyday commands](everyday-commands.md)) — the real error message is usually there even if the terminal only showed a short summary.
2. Try a clean restart:
   ```shell
   ./stop.sh
   ./start.sh
   ```
3. If the problem is specific to a weird state in the test data rather than the services themselves, try resetting it (see "Reset the test data" in [Everyday commands](everyday-commands.md)).
