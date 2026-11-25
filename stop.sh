#!/usr/bin/env bash
# Stops everything start.sh started: Hardhat node, backend, frontend.
#
# Finds each by the port(s) it listens on and kills its whole process tree
# (taskkill /T), not just the top process — plain `kill`/`Stop-Process` only
# kills the one process you name, and tools like `npm run dev` / `tsx watch`
# spawn child processes that would otherwise survive and keep the port
# "in use" the next time you start.sh. Also sweeps for any TakaTrace
# hardhat/tsx/vite process that isn't currently bound to its usual port
# (e.g. a leftover from an earlier manual run) so nothing gets left behind.
#
# Usage: ./stop.sh

set -uo pipefail

HARDHAT_PORT=8545
BACKEND_PORT=3010
FRONTEND_PORT=5173

port_owner_pids() {
  # Prints every distinct PID currently LISTENing on $1, one per line.
  # Matches listeners by RemotePort 0 rather than `-State Listen`: some Windows
  # builds report a listener's State as blank, so the State filter misses it.
  powershell -NoProfile -Command \
    "(Get-NetTCPConnection -LocalPort $1 -ErrorAction SilentlyContinue | Where-Object { \$_.RemotePort -eq 0 } | Select-Object -ExpandProperty OwningProcess -Unique)" \
    2>/dev/null | tr -d '\r'
}

kill_tree() {
  taskkill //PID "$1" //T //F > /dev/null 2>&1
}

stop_port() {
  local port=$1 label=$2
  local pids
  pids="$(port_owner_pids "$port")"
  if [ -z "$pids" ]; then
    echo "  $label (:$port): not running"
    return
  fi
  local stopped=""
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    kill_tree "$pid"
    stopped="$stopped $pid"
  done <<< "$pids"
  echo "  $label (:$port): stopped (pid(s)$stopped and their child processes)"
}

echo "Stopping TakaTrace dev stack..."
stop_port "$FRONTEND_PORT" "Frontend"
stop_port "$BACKEND_PORT" "Backend"
stop_port "$HARDHAT_PORT" "Hardhat node"

# Fallback sweep: catch any TakaTrace hardhat/tsx/vite process left over from
# an earlier manual run that isn't (or is no longer) bound to its usual port.
# Matched on the project folder name rather than the full path, since bash's
# forward slashes and Windows CommandLine's backslashes don't compare as
# equal strings without fragile escaping.
STRAYS="$(powershell -NoProfile -Command "
  Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" |
    Where-Object { \$_.CommandLine -like '*TakaTrace*' -and (\$_.CommandLine -like '*hardhat*' -or \$_.CommandLine -like '*tsx*' -or \$_.CommandLine -like '*vite*') } |
    Select-Object -ExpandProperty ProcessId
" 2>/dev/null | tr -d '\r')"

if [ -n "$STRAYS" ]; then
  echo "  Clearing stray processes from earlier runs:"
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    kill_tree "$pid"
    echo "    pid $pid"
  done <<< "$STRAYS"
fi

echo "Done."
