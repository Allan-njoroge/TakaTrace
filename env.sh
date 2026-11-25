#!/usr/bin/env bash
# Syncs this project's .env files with Infisical, keeping every .env file exactly
# where the apps already read it from:
#
#   Infisical folder   <->   local file      (read by)
#   /server            <->   server/.env     (server: `import "dotenv/config"`)
#   /web               <->   web/.env        (web: Vite)
#
# The apps never talk to Infisical themselves; they keep reading their .env files.
# Infisical is just where the values live, so they can be shared without passing
# .env files around.
#
# Usage (from Git Bash, in the project root):
#   ./env.sh pull [env]     Infisical -> .env files   (env defaults to "dev")
#   ./env.sh push [env]     .env files -> Infisical   (one-off upload / after local edits)
#   ./env.sh status         Show whether Infisical is set up for this project
#
# One-time setup per machine:
#   infisical login         (or set INFISICAL_TOKEN for a machine identity)
#   infisical init          (in the project root; pick the TakaTrace project — writes .infisical.json)
#
# For machine identities / CI, also set INFISICAL_PROJECT_ID (no .infisical.json needed).
# Self-hosted or EU cloud: set INFISICAL_DOMAIN, or the "domain" field in .infisical.json.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Infisical folder => local directory holding that app's .env. Add a line here to
# manage another app's .env the same way.
ENV_DIRS=(
  "server"
  "web"
)

COMMAND="${1:-}"
INFISICAL_ENV="${2:-${INFISICAL_ENV:-dev}}"

die() { echo "env.sh: $*" >&2; exit 1; }

project_args() {
  # A machine identity has no .infisical.json to read the project from.
  if [ -n "${INFISICAL_PROJECT_ID:-}" ]; then
    echo "--projectId=$INFISICAL_PROJECT_ID"
  fi
}

require_setup() {
  command -v infisical > /dev/null || die "the Infisical CLI isn't installed (winget install infisical)."
  if [ ! -f "$ROOT/.infisical.json" ] && [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
    die "this project isn't linked to Infisical yet. Run 'infisical login' then 'infisical init' in $ROOT."
  fi
}

pull_one() {
  local dir=$1
  local target="$ROOT/$dir/.env"
  local tmp="$target.infisical-tmp"

  # Export to a temp file first so a failed or empty export never clobbers a working .env.
  if ! infisical export --silent --env="$INFISICAL_ENV" --path="/$dir" --format=dotenv \
      $(project_args) --output-file="$tmp" > /dev/null; then
    rm -f "$tmp"
    echo "  $dir/.env: pull FAILED, left the existing file untouched" >&2
    return 1
  fi
  if [ ! -s "$tmp" ]; then
    rm -f "$tmp"
    echo "  $dir/.env: Infisical folder /$dir in '$INFISICAL_ENV' is empty, left the existing file untouched" >&2
    return 1
  fi

  if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
    rm -f "$tmp"
    echo "  $dir/.env: already up to date"
    return 0
  fi

  # Keep the previous file (with its comments) as .env.bak; it's gitignored via .env.*.
  [ -f "$target" ] && cp "$target" "$target.bak"
  mv "$tmp" "$target"
  echo "  $dir/.env: updated from Infisical /$dir ($INFISICAL_ENV)"
}

push_one() {
  local dir=$1
  local source="$ROOT/$dir/.env"
  if [ ! -f "$source" ]; then
    echo "  $dir/.env: not found, skipped"
    return 0
  fi

  # Create the folder if missing; "already exists" is fine.
  infisical secrets folders create --silent --env="$INFISICAL_ENV" --path=/ --name="$dir" \
    $(project_args) > /dev/null 2>&1 || true

  # Table output would print secret values; send it nowhere.
  infisical secrets set --silent --env="$INFISICAL_ENV" --path="/$dir" --file="$source" \
    $(project_args) > /dev/null
  echo "  $dir/.env -> Infisical /$dir ($INFISICAL_ENV)"
}

case "$COMMAND" in
  pull)
    require_setup
    echo "Pulling .env files from Infisical ($INFISICAL_ENV)..."
    failed=0
    for dir in "${ENV_DIRS[@]}"; do pull_one "$dir" || failed=1; done
    exit "$failed"
    ;;
  push)
    require_setup
    echo "Pushing .env files to Infisical ($INFISICAL_ENV)..."
    for dir in "${ENV_DIRS[@]}"; do push_one "$dir"; done
    ;;
  status)
    if ! command -v infisical > /dev/null; then echo "Infisical CLI: not installed"; exit 1; fi
    echo "Infisical CLI: $(infisical --version 2>/dev/null | tail -1)"
    if [ -f "$ROOT/.infisical.json" ]; then echo "Project link:  .infisical.json present"
    elif [ -n "${INFISICAL_PROJECT_ID:-}" ]; then echo "Project link:  INFISICAL_PROJECT_ID=$INFISICAL_PROJECT_ID"
    else echo "Project link:  none — run 'infisical init'"; fi
    for dir in "${ENV_DIRS[@]}"; do
      if [ -f "$ROOT/$dir/.env" ]; then echo "  $dir/.env  present"; else echo "  $dir/.env  missing"; fi
    done
    ;;
  *)
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
