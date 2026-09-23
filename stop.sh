#!/usr/bin/env bash
# ==============================================================================
# Industrial Evidence Chain — Development Environment Stopper
# stop.sh  ·  macOS / Linux
# ==============================================================================

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}==================================================${RESET}"
echo -e "${BOLD}${CYAN}IEC STOPPING ALL DEVELOPMENT SERVICES${RESET}"
echo -e "${BOLD}${CYAN}==================================================${RESET}"

stop_port() {
  local port=$1 name=$2
  local pids
  pids=$(lsof -i :"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Stopping ${BOLD}${name}${RESET} on port ${port} (PID: ${pids})..."
    echo "$pids" | xargs kill -15 2>/dev/null || true
    sleep 1
    # Force kill if still lingering
    local lingering
    lingering=$(lsof -i :"$port" -sTCP:LISTEN -t 2>/dev/null || true)
    if [ -n "$lingering" ]; then
      echo "$lingering" | xargs kill -9 2>/dev/null || true
    fi
    echo -e "  ${GREEN}✔${RESET} ${name} stopped."
  else
    echo -e "  ${name} on port ${port} is not running."
  fi
}

stop_port 3000 "Frontend"
stop_port 5000 "Backend"
stop_port 5050 "Blockchain Adapter"
stop_port 3002 "DB Preview"

# Optional prompt to stop PostgreSQL 5433 cluster
if [ "${1:-}" = "--all" ] || [ "${1:-}" = "--with-db" ]; then
  for d in /Library/PostgreSQL/*/bin /opt/homebrew/bin /usr/local/bin; do
    if [ -d "$d" ] && [ -x "$d/pg_ctl" ]; then
      export PATH="$d:$PATH"
      break
    fi
  done
  if command -v pg_ctl &>/dev/null; then
    echo -e "  Stopping PostgreSQL cluster on port 5433..."
    pg_ctl -D "${ROOT}/db_data/pgdata" -m fast stop 2>/dev/null || true
    echo -e "  ${GREEN}✔${RESET} PostgreSQL cluster stopped."
  fi
else
  echo ""
  echo -e "  ${BOLD}Note:${RESET} PostgreSQL (port 5433) was kept running."
  echo -e "  To stop PostgreSQL as well, run: ${BOLD}./stop.sh --with-db${RESET}"
fi

echo ""
echo -e "${GREEN}All requested services stopped cleanly.${RESET}"
echo ""
