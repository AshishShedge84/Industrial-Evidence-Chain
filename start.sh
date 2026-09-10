#!/usr/bin/env bash
# ==============================================================================
# Industrial Evidence Chain — Development Environment Launcher
# start.sh  ·  macOS / Linux
# ==============================================================================
# Starts all IEC services in separate Terminal windows:
#   ● Backend          ASP.NET Core   →  http://localhost:5000
#   ● Frontend         Vite / React   →  http://localhost:3000
#   ● Blockchain       Node.js        →  http://localhost:5050
#   ● DB Preview       Node.js        →  http://localhost:3002   (dev tool only)
#
# PostgreSQL password is prompted once and passed to services via env vars.
# The password is NEVER written to disk, history, or any file.
# ==============================================================================

set -euo pipefail

# ── Resolve absolute project root regardless of where script is called from
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colours & formatting
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${CYAN}║   Industrial Evidence Chain — Dev Environment Launcher       ║${RESET}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

info()    { echo -e "  ${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
err()     { echo -e "  ${RED}✘${RESET}  $*" >&2; }
section() { echo -e "\n${BOLD}${DIM}── $* ──────────────────────────────────────────────${RESET}"; }

# ── Check if a port is already occupied (returns 0 = free, 1 = occupied)
port_in_use() { lsof -i :"$1" -sTCP:LISTEN -t &>/dev/null; }

# ── Kill processes on a port (safe to call when port is free)
free_port() {
  local port=$1 name=$2
  if port_in_use "$port"; then
    warn "Port $port already in use ($name). Killing existing process..."
    lsof -i :"$port" -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    sleep 1
    if port_in_use "$port"; then
      err "Could not free port $port. Please stop the existing process manually and re-run."
      return 1
    fi
    info "Port $port freed."
  fi
}

# ── Open a new macOS Terminal window and run a command in it
open_terminal() {
  local title="$1"
  local cmd="$2"
  # Wrap command: show title, run cmd, pause on exit so the window stays visible
  local full_cmd="printf '\033]0;${title}\007'; cd '${ROOT}'; echo ''; echo '  ─── ${title} ───'; echo ''; ${cmd}; echo ''; echo '  [${title}] process exited. Press Enter to close.'; read"
  osascript > /dev/null 2>&1 <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "${full_cmd//\"/\\\"}"
end tell
APPLESCRIPT
}

# ── Check that a required command exists
need() {
  local cmd=$1 install_hint=$2
  if ! command -v "$cmd" &>/dev/null; then
    err "Required tool '$cmd' not found. $install_hint"
    return 1
  fi
  info "Found: $(command -v "$cmd")  ($(${cmd} --version 2>&1 | head -1 || echo 'version unknown'))"
}

# ==============================================================================
# MAIN
# ==============================================================================

banner

# ── 1. Dependency checks
section "Checking dependencies"

MISSING=0
need dotnet   "Install .NET SDK from https://dotnet.microsoft.com/download"       || MISSING=1
need node     "Install Node.js from https://nodejs.org"                            || MISSING=1
need npm      "Install Node.js from https://nodejs.org"                            || MISSING=1
need lsof     "lsof should be pre-installed on macOS"                              || MISSING=1

if [[ $MISSING -eq 1 ]]; then
  echo ""
  err "One or more required tools are missing. Install them and re-run start.sh."
  exit 1
fi

# Check frontend node_modules
if [[ ! -d "${ROOT}/frontend/node_modules" ]]; then
  warn "frontend/node_modules not found. Running npm install..."
  npm --prefix "${ROOT}/frontend" install --prefer-offline
  info "Frontend dependencies installed."
fi

# Check blockchain node_modules
if [[ ! -d "${ROOT}/blockchain/node_modules" ]]; then
  warn "blockchain/node_modules not found. Running npm install..."
  npm --prefix "${ROOT}/blockchain" install --prefer-offline
  info "Blockchain dependencies installed."
fi

# Check db-preview node_modules
if [[ ! -d "${ROOT}/tools/db-preview/node_modules" ]]; then
  warn "tools/db-preview/node_modules not found. Running npm install..."
  npm --prefix "${ROOT}/tools/db-preview" install --prefer-offline
  info "DB Preview dependencies installed."
fi

# ── 2. Prompt for PostgreSQL password (not stored anywhere)
section "PostgreSQL Authentication"

echo -e "  ${BOLD}The following services connect to PostgreSQL (iec_db @ localhost:5433):${RESET}"
echo -e "  ${DIM}  • Backend (ASP.NET Core)${RESET}"
echo -e "  ${DIM}  • DB Preview (localhost:3002)${RESET}"
echo ""
echo -e "  ${YELLOW}Enter your PostgreSQL password below.${RESET}"
echo -e "  ${DIM}  → It will NOT be echoed, saved, or written to any file.${RESET}"
echo -e "  ${DIM}  → It is passed to services as an in-memory environment variable.${RESET}"
echo ""

# Read password silently
while true; do
  read -rsp "  PostgreSQL password for 'postgres': " DB_PASSWORD
  echo ""
  if [[ -z "$DB_PASSWORD" ]]; then
    warn "Password cannot be empty. Please try again."
  else
    break
  fi
done

# Quickly verify the password by attempting a psql connection
# We try psql first, then pg_isready; both are optional on macOS
if command -v psql &>/dev/null || command -v pg_isready &>/dev/null; then
  echo -e "  ${DIM}Verifying password against iec_db...${RESET}"
  VERIFIED=0
  if command -v pg_isready &>/dev/null; then
    if PGPASSWORD="$DB_PASSWORD" pg_isready -h localhost -p 5433 -U postgres -d iec_db -q 2>/dev/null; then
      VERIFIED=1
    fi
  fi
  if [[ $VERIFIED -eq 0 ]] && command -v psql &>/dev/null; then
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5433 -U postgres -d iec_db \
          -c "SELECT 1" -q --no-psqlrc 2>/dev/null | grep -q '1'; then
      VERIFIED=1
    fi
  fi
  if [[ $VERIFIED -eq 1 ]]; then
    info "Password verified. Connected to iec_db successfully."
  else
    err "PostgreSQL authentication failed. Check host/port/credentials and try again."
    echo ""
    echo -e "  ${DIM}  Expected: Host=localhost, Port=5433, Database=iec_db, User=postgres${RESET}"
    exit 1
  fi
else
  warn "psql/pg_isready not found — skipping password pre-check."
  warn "Wrong password will cause Backend and DB Preview to fail on start."
fi

# ── 3. Build backend if needed (first run)
section "Backend Build Check"
if [[ ! -f "${ROOT}/backend/bin/Debug/net10.0/backend.dll" ]]; then
  echo -e "  ${DIM}First run — building backend (this may take ~30s)...${RESET}"
  dotnet build "${ROOT}/backend/backend.csproj" --nologo -v quiet
  info "Backend built."
else
  info "Backend binary found. Skipping build (use 'dotnet build' to rebuild)."
fi

# ── 4. Free ports
section "Freeing ports"
free_port 5000 "Backend"     || exit 1
free_port 3000 "Frontend"    || exit 1
free_port 5050 "Blockchain"  || exit 1
free_port 3002 "DB Preview"  || exit 1

# ── 5. Export environment for child Terminal windows
# These are NOT written to any file — only live in shell env
export DB_PASSWORD
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5433}"
export DB_NAME="${DB_NAME:-iec_db}"
export DB_USER="${DB_USER:-postgres}"

# ASP.NET Core env-var override (overrides appsettings.Development.json)
export ConnectionStrings__DefaultConnection="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}"

# ── 6. Launch each service in its own Terminal window
section "Launching services"

# Build the env-export prefix so each sub-shell has the vars
ENV_PREFIX="export DB_PASSWORD='${DB_PASSWORD}' DB_HOST='${DB_HOST}' DB_PORT='${DB_PORT}' DB_NAME='${DB_NAME}' DB_USER='${DB_USER}' ConnectionStrings__DefaultConnection='Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}'"

# ── Backend
BACKEND_CMD="${ENV_PREFIX}; dotnet run --project '${ROOT}/backend/backend.csproj' --no-build"
open_terminal "IEC Backend :5000" "$BACKEND_CMD"
info "Backend window opened  → http://localhost:5000"

sleep 0.5

# ── Frontend (no DB dependency)
FRONTEND_CMD="cd '${ROOT}/frontend'; npm run dev"
open_terminal "IEC Frontend :3000" "$FRONTEND_CMD"
info "Frontend window opened → http://localhost:3000"

sleep 0.5

# ── Blockchain Adapter (no DB dependency)
BLOCKCHAIN_CMD="cd '${ROOT}/blockchain'; npm start"
open_terminal "IEC Blockchain :5050" "$BLOCKCHAIN_CMD"
info "Blockchain window opened → http://localhost:5050"

sleep 0.5

# ── DB Preview
DBPREVIEW_CMD="${ENV_PREFIX}; node '${ROOT}/tools/db-preview/server.js'"
open_terminal "IEC DB Preview :3002" "$DBPREVIEW_CMD"
info "DB Preview window opened → http://localhost:3002  (dev-only, not linked to app)"

# ── 7. Summary
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   All services launched in separate Terminal windows         ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║   Frontend    →  http://localhost:3000                       ║${RESET}"
echo -e "${BOLD}${GREEN}║   Backend     →  http://localhost:5000                       ║${RESET}"
echo -e "${BOLD}${GREEN}║   Blockchain  →  http://localhost:5050                       ║${RESET}"
echo -e "${BOLD}${GREEN}║   DB Preview  →  http://localhost:3002  (dev only)           ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║   ${DIM}DB password was entered but NOT saved anywhere.${RESET}${BOLD}${GREEN}           ║${RESET}"
echo -e "${BOLD}${GREEN}║   ${DIM}Each service window will show its own logs.${RESET}${BOLD}${GREEN}               ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${DIM}To stop all services: close each Terminal window,${RESET}"
echo -e "  ${DIM}or run: lsof -ti :3000,:5000,:5050,:3002 | xargs kill -9${RESET}"
echo ""
