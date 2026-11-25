#!/usr/bin/env bash
# Starts the whole TakaTrace dev stack: local blockchain, contract deploy, backend,
# frontend. Safe to re-run — it reuses anything already up on the right port and only
# does the slow steps (install, rebuild, deploy) when they're actually needed.
#
# Usage: ./start.sh   (run from a Git Bash / MSYS shell — PowerShell can't run .sh)
# Stop everything with: ./stop.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOGDIR="$ROOT/.dev-logs"
mkdir -p "$LOGDIR"

HARDHAT_PORT=8545
BACKEND_PORT=3010
FRONTEND_PORT=5173

# ── helpers ──────────────────────────────────────────────────────────────

port_in_use() {
  # True if something accepts connections on localhost:$1. Probes the port directly
  # instead of asking Get-NetTCPConnection: on some Windows builds it reports a
  # listener's State as blank (so `-State Listen` never matches), and each
  # PowerShell launch takes ~20s, which made the wait loops far longer than intended.
  # curl exit 7 = connection refused, 28 = timed out; anything else means a server answered.
  local rc=0
  curl -s -o /dev/null --connect-timeout 2 -m 3 "http://localhost:$1/" || rc=$?
  [ "$rc" -ne 7 ] && [ "$rc" -ne 28 ]
}

wait_for_port() {
  local port=$1 tries=${2:-30}
  for ((i = 0; i < tries; i++)); do
    port_in_use "$port" && return 0
    sleep 1
  done
  return 1
}

# ── 0. env files from Infisical (automatic once set up) ─────────────────
# If this project is linked to Infisical (.infisical.json from `infisical init`,
# or INFISICAL_PROJECT_ID for a machine identity), refresh server/.env and
# web/.env from it before anything starts — same files, same folders the apps
# already read. Skip with INFISICAL_PULL=0. A failed pull (offline, not logged
# in) just warns and keeps the existing .env files.

if [ "${INFISICAL_PULL:-1}" = "0" ]; then
  echo "[0/5] Infisical: skipped (INFISICAL_PULL=0), using existing .env files"
elif ! command -v infisical > /dev/null; then
  echo "[0/5] Infisical: CLI not installed, using existing .env files"
elif [ ! -f "$ROOT/.infisical.json" ] && [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
  echo "[0/5] Infisical: project not linked yet (run 'infisical init'), using existing .env files"
else
  echo "[0/5] Infisical: pulling server/.env and web/.env"
  if ! "$ROOT/env.sh" pull | sed 's/^/    /'; then
    echo "    Infisical pull failed — continuing with the existing .env files"
  fi
fi

# ── 1. local blockchain ─────────────────────────────────────────────────

STARTED_HARDHAT=0
if port_in_use "$HARDHAT_PORT"; then
  echo "[1/5] Hardhat node: already running on :$HARDHAT_PORT, reusing it"
else
  echo "[1/5] Hardhat node: starting (log: .dev-logs/hardhat.log)"
  (npx hardhat node > "$LOGDIR/hardhat.log" 2>&1 &)
  if ! wait_for_port "$HARDHAT_PORT" 30; then
    echo "    Hardhat node didn't come up in time — check $LOGDIR/hardhat.log"
    exit 1
  fi
  STARTED_HARDHAT=1
fi

# ── 2. deploy the contract ──────────────────────────────────────────────
# Only redeploy if we just started a fresh node, or the address in
# server/src/contract.json has no code on this chain (e.g. the node was
# restarted outside this script, the exact "receipts need re-anchoring"
# situation). Reusing an already-deployed contract on an unchanged node
# avoids pointlessly invalidating already-anchored demo receipts.

NEEDS_DEPLOY=1
if [ "$STARTED_HARDHAT" -eq 0 ]; then
  if node -e "
    const info = require('./server/src/contract.json');
    fetch('http://127.0.0.1:$HARDHAT_PORT', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getCode', params: [info.address, 'latest'], id: 1 }),
    }).then((r) => r.json()).then((j) => process.exit(j.result && j.result !== '0x' ? 0 : 1)).catch(() => process.exit(1));
  " 2>/dev/null; then
    NEEDS_DEPLOY=0
  fi
fi

if [ "$NEEDS_DEPLOY" -eq 1 ]; then
  echo "[2/5] Deploying the contract"
  npx hardhat run scripts/deploy.ts --network localhost
else
  echo "[2/5] Contract already deployed on this chain, skipping"
fi

# ── 3. backend ───────────────────────────────────────────────────────────

cd "$ROOT/server"

if [ ! -d node_modules ]; then
  echo "[3/5] Backend: installing dependencies (first run — this takes a while)"
  npm install
fi

if [ ! -f .env ]; then
  echo "    server/.env is missing — run ./env.sh pull (Infisical), or see BACKEND_SPEC.md section 5 to create it (copy .env.example and fill in secrets), then re-run this script."
  exit 1
fi

if port_in_use "$BACKEND_PORT"; then
  echo "    Backend: already running on :$BACKEND_PORT, reusing it"
else
  # Native modules (better-sqlite3, sharp) are compiled for one specific Node
  # build; if the active Node version changed since the last install/rebuild
  # (common with nvm), loading them crashes with ERR_DLOPEN_FAILED. Rebuild
  # automatically whenever that's detected, instead of failing at startup.
  # Only safe to do when the backend isn't already running — a live process
  # holds its .node files open and a rebuild would fail trying to replace them.
  CURRENT_NODE_VERSION="$(node --version)"
  STAMP_FILE="node_modules/.node-version-stamp"
  if [ ! -f "$STAMP_FILE" ] || [ "$(cat "$STAMP_FILE")" != "$CURRENT_NODE_VERSION" ]; then
    echo "    Native modules need rebuilding for Node $CURRENT_NODE_VERSION..."
    npm rebuild
    echo "$CURRENT_NODE_VERSION" > "$STAMP_FILE"
  fi

  echo "    Backend: starting (log: .dev-logs/backend.log)"
  (npm run dev > "$LOGDIR/backend.log" 2>&1 &)
  if ! wait_for_port "$BACKEND_PORT" 30; then
    echo "    Backend didn't come up in time — check $LOGDIR/backend.log"
    exit 1
  fi
fi

# Whenever the local Hardhat node restarts (including just now, in step 1),
# every previously-anchored receipt needs re-anchoring — the restart wipes
# all chain history. Fix that automatically in demo mode instead of making
# you track it down by hand each time. Best-effort: never fails the script.
if grep -q "^DEMO_MODE=true" .env 2>/dev/null; then
  echo "    Checking whether any receipts need re-anchoring..."
  node scripts/auto-reanchor.mjs
fi

# ── 4. frontend ──────────────────────────────────────────────────────────

cd "$ROOT/web"

if [ ! -d node_modules ]; then
  echo "[4/5] Frontend: installing dependencies (first run — this takes a while)"
  npm install
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "[4/5] Frontend: already running on :$FRONTEND_PORT, reusing it"
else
  echo "[4/5] Frontend: starting (log: .dev-logs/frontend.log)"
  # --host: on some Windows setups Vite's default bind is IPv6-only (::1),
  # which breaks plain-IPv4 tooling even though browsers are unaffected.
  (npx vite --host > "$LOGDIR/frontend.log" 2>&1 &)
  if ! wait_for_port "$FRONTEND_PORT" 30; then
    echo "    Frontend didn't come up in time — check $LOGDIR/frontend.log"
    exit 1
  fi
fi

cd "$ROOT"

echo "[5/5] Done"
echo
echo "  Hardhat RPC   http://127.0.0.1:$HARDHAT_PORT"
echo "  Backend API   http://127.0.0.1:$BACKEND_PORT/api/health"
echo "  Frontend      http://127.0.0.1:$FRONTEND_PORT"
echo
echo "Logs are in .dev-logs/. Stop everything with: ./stop.sh"
