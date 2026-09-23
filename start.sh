#!/usr/bin/env bash
# ==============================================================================
# Industrial Evidence Chain — Development Environment Launcher
# start.sh  ·  macOS / Linux
# ==============================================================================
# Single authoritative IEC architecture:
#   ● PostgreSQL 5433  db_data/pgdata → iec_db (authoritative database)
#   ● Backend 5000     ASP.NET Core   → http://localhost:5000
#   ● Blockchain 5050  Node.js        → http://localhost:5050
#   ● DB Preview 3002  Node.js        → http://127.0.0.1:3002
#   ● Frontend 3000    Vite / React   → https://localhost:3000
#
# Password is requested manually via secure hidden prompt.
# It is NEVER written to disk, Git, config files, or logs.
# ==============================================================================

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${ROOT}/logs"
mkdir -p "${LOG_DIR}"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}==================================${RESET}"
echo -e "${BOLD}${CYAN}IEC DEVELOPMENT STARTUP${RESET}"
echo -e "${BOLD}${CYAN}==================================${RESET}"
echo ""

# ── 1. Locate PostgreSQL tools
for d in /Library/PostgreSQL/18/bin /Library/PostgreSQL/17/bin /Library/PostgreSQL/16/bin /Library/PostgreSQL/15/bin /Library/PostgreSQL/*/bin /opt/homebrew/bin /usr/local/bin; do
  if [ -d "$d" ] && [ -x "$d/psql" ]; then
    export PATH="$d:$PATH"
    break
  fi
done

# ── 2. Check essential tooling
MISSING=0
command -v dotnet >/dev/null 2>&1 || { echo -e "  ${RED}✘${RESET} 'dotnet' not found."; MISSING=1; }
command -v node   >/dev/null 2>&1 || { echo -e "  ${RED}✘${RESET} 'node' not found."; MISSING=1; }
command -v npm    >/dev/null 2>&1 || { echo -e "  ${RED}✘${RESET} 'npm' not found."; MISSING=1; }
command -v lsof   >/dev/null 2>&1 || { echo -e "  ${RED}✘${RESET} 'lsof' not found."; MISSING=1; }

if [ $MISSING -eq 1 ]; then
  echo -e "\n${RED}Please install missing tools before running start.sh.${RESET}"
  exit 1
fi

# ── 3. Check node_modules dependencies
if [ ! -d "${ROOT}/frontend/node_modules" ]; then
  echo -e "  ${DIM}Installing frontend dependencies...${RESET}"
  npm --prefix "${ROOT}/frontend" install --prefer-offline >/dev/null 2>&1 || true
fi
if [ ! -d "${ROOT}/blockchain/node_modules" ]; then
  echo -e "  ${DIM}Installing blockchain dependencies...${RESET}"
  npm --prefix "${ROOT}/blockchain" install --prefer-offline >/dev/null 2>&1 || true
fi
if [ ! -d "${ROOT}/tools/db-preview/node_modules" ]; then
  echo -e "  ${DIM}Installing db-preview dependencies...${RESET}"
  npm --prefix "${ROOT}/tools/db-preview" install --prefer-offline >/dev/null 2>&1 || true
fi

# ── 4. Prompt for PostgreSQL password securely (hidden input)
DB_PASSWORD="${DB_PASSWORD:-}"
if [ -z "$DB_PASSWORD" ]; then
  if [ -t 0 ]; then
    read -rsp "PostgreSQL password: " DB_PASSWORD
    echo ""
  else
    read -r DB_PASSWORD || true
  fi
fi

if [ -z "$DB_PASSWORD" ]; then
  echo -e "  ${RED}✘${RESET} Password cannot be empty."
  echo "PostgreSQL authentication failed."
  echo "IEC startup cancelled."
  exit 1
fi

# Helper functions
port_in_use() {
  lsof -i :"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# ── 5. PostgreSQL Cluster Verification & Startup (Port 5433)
echo -e "Validating PostgreSQL..."
PGDATA_DIR="${ROOT}/db_data/pgdata"

if port_in_use 5433; then
  echo -e "  ${GREEN}✔${RESET} PostgreSQL is already listening on port 5433."
else
  echo -e "Starting IEC PostgreSQL..."
  if [ ! -d "${PGDATA_DIR}" ]; then
    echo -e "  ${RED}✘${RESET} Permanent IEC database cluster directory not found at: ${PGDATA_DIR}"
    echo "IEC startup cancelled."
    exit 1
  fi

  if ! command -v pg_ctl >/dev/null 2>&1; then
    echo -e "  ${RED}✘${RESET} 'pg_ctl' utility not found in PATH."
    echo "IEC startup cancelled."
    exit 1
  fi

  pg_ctl -D "${PGDATA_DIR}" -l "${PGDATA_DIR}/logfile" -o "-p 5433" start >/dev/null 2>&1 || true

  # Wait for port 5433 readiness
  WAITED=0
  until port_in_use 5433 || [ $WAITED -ge 15 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if ! port_in_use 5433; then
    echo -e "  ${RED}✘${RESET} Timed out waiting for PostgreSQL cluster on port 5433 to start."
    echo "Check logfile at: ${PGDATA_DIR}/logfile"
    echo "IEC startup cancelled."
    exit 1
  fi
  echo -e "  ${GREEN}✔${RESET} PostgreSQL cluster started on port 5433."
fi

# ── 6. Check Database & Authentication
echo -e "Checking database..."
export PGPASSWORD="$DB_PASSWORD"

# Verify credentials against port 5433
AUTH_OK=0
if command -v psql >/dev/null 2>&1; then
  if psql -h localhost -p 5433 -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    AUTH_OK=1
  elif psql -h localhost -p 5433 -U postgres -d iec_db -c "SELECT 1;" >/dev/null 2>&1; then
    AUTH_OK=1
  fi
elif command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h localhost -p 5433 -U postgres >/dev/null 2>&1; then
    AUTH_OK=1
  fi
fi

if [ $AUTH_OK -ne 1 ]; then
  echo ""
  echo "PostgreSQL authentication failed."
  echo "IEC startup cancelled."
  exit 1
fi

# Verify iec_db exists in the permanent cluster (DO NOT auto-create empty DB)
if command -v psql >/dev/null 2>&1; then
  DB_EXISTS=$(psql -h localhost -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='iec_db';" 2>/dev/null || true)
  if [ "$DB_EXISTS" != "1" ]; then
    echo ""
    echo -e "  ${RED}✘${RESET} Database 'iec_db' does not exist in permanent cluster."
    echo -e "  ${YELLOW}Automatic database creation is disabled to prevent data loss.${RESET}"
    echo "IEC startup cancelled."
    exit 1
  fi
fi
echo -e "  ${GREEN}✔${RESET} Authoritative database 'iec_db' verified on localhost:5433."

# ── 7. Start Backend (Port 5000)
echo -e "Starting Backend..."
BACKEND_HEALTHY=0
if port_in_use 5000; then
  if curl -s -f http://localhost:5000/health >/dev/null 2>&1; then
    BACKEND_HEALTHY=1
    echo -e "  ${GREEN}✔${RESET} Backend already running on http://localhost:5000 and healthy."
  fi
fi

if [ $BACKEND_HEALTHY -eq 0 ]; then
  # Build backend if binary not present
  if [ ! -f "${ROOT}/backend/bin/Debug/net10.0/backend.dll" ]; then
    echo -e "  ${DIM}Building backend binary...${RESET}"
    dotnet build "${ROOT}/backend/backend.csproj" --nologo -v quiet || {
      echo "Backend build failed. IEC startup cancelled."; exit 1;
    }
  fi

  # Launch backend in background with strict port 5433 configuration
  (
    export DB_PASSWORD="${DB_PASSWORD}"
    export DB_HOST="localhost"
    export DB_PORT="5433"
    export DB_NAME="iec_db"
    export DB_USER="postgres"
    export ConnectionStrings__DefaultConnection="Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=${DB_PASSWORD}"
    cd "${ROOT}"
    exec dotnet run --project backend/backend.csproj --no-build >> "${LOG_DIR}/backend.log" 2>&1
  ) &

  # Wait for backend readiness & database connection
  WAITED=0
  until curl -s -f http://localhost:5000/health >/dev/null 2>&1 || [ $WAITED -ge 30 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if ! curl -s -f http://localhost:5000/health >/dev/null 2>&1; then
    echo -e "  ${RED}✘${RESET} Backend failed to report healthy on http://localhost:5000/health."
    echo "Check logfile at: ${LOG_DIR}/backend.log"
    echo "IEC startup cancelled."
    exit 1
  fi
  echo -e "  ${GREEN}✔${RESET} Backend started and connected to PostgreSQL 5433."
fi

# ── 8. Start Blockchain Adapter (Port 5050)
echo -e "Starting Blockchain Adapter..."
if port_in_use 5050; then
  echo -e "  ${GREEN}✔${RESET} Blockchain Adapter is already running on http://localhost:5050."
else
  (
    cd "${ROOT}/blockchain"
    exec npm start >> "${LOG_DIR}/blockchain.log" 2>&1
  ) &

  WAITED=0
  until curl -s -f http://localhost:5050/health >/dev/null 2>&1 || [ $WAITED -ge 20 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if ! curl -s -f http://localhost:5050/health >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${RESET} Blockchain Adapter did not respond on /health within 20s. Continuing..."
  else
    echo -e "  ${GREEN}✔${RESET} Blockchain Adapter started on http://localhost:5050."
  fi
fi

# ── 9. Start DB Preview (Port 3002)
echo -e "Starting DB Preview..."
if port_in_use 3002; then
  echo -e "  ${GREEN}✔${RESET} DB Preview is already running on http://127.0.0.1:3002."
else
  (
    export DB_PASSWORD="${DB_PASSWORD}"
    export DB_HOST="localhost"
    export DB_PORT="5433"
    export DB_NAME="iec_db"
    export DB_USER="postgres"
    cd "${ROOT}"
    exec node tools/db-preview/server.js >> "${LOG_DIR}/dbpreview.log" 2>&1
  ) &

  WAITED=0
  until curl -s -f http://127.0.0.1:3002/api/status >/dev/null 2>&1 || [ $WAITED -ge 15 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if ! curl -s -f http://127.0.0.1:3002/api/status >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${RESET} DB Preview did not respond on /api/status within 15s. Continuing..."
  else
    echo -e "  ${GREEN}✔${RESET} DB Preview started and verified on http://127.0.0.1:3002."
  fi
fi

# ── 10. Start Frontend (Port 3000)
echo -e "Starting Frontend..."
if port_in_use 3000; then
  echo -e "  ${GREEN}✔${RESET} Frontend is already running on port 3000."
else
  (
    cd "${ROOT}/frontend"
    exec npm run dev >> "${LOG_DIR}/frontend.log" 2>&1
  ) &

  WAITED=0
  until port_in_use 3000 || [ $WAITED -ge 20 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if ! port_in_use 3000; then
    echo -e "  ${YELLOW}⚠${RESET} Frontend did not start listening on port 3000 within 20s."
  else
    echo -e "  ${GREEN}✔${RESET} Frontend started on port 3000."
  fi
fi

# ── 11. Final Health Checks
echo ""
echo -e "${BOLD}${DIM}── Verifying Service Health ────────────────────────${RESET}"

CHECK_FAIL=0

# PostgreSQL
if port_in_use 5433; then
  echo -e "  ${GREEN}✔${RESET} PostgreSQL (5433)       : Reachable"
else
  echo -e "  ${RED}✘${RESET} PostgreSQL (5433)       : Unreachable"; CHECK_FAIL=1
fi

# Backend
if curl -s -f http://localhost:5000/health >/dev/null 2>&1; then
  echo -e "  ${GREEN}✔${RESET} Backend (5000)          : Healthy (Connected to DB 5433)"
else
  echo -e "  ${RED}✘${RESET} Backend (5000)          : Unhealthy"; CHECK_FAIL=1
fi

# Blockchain Adapter
if curl -s -f http://localhost:5050/health >/dev/null 2>&1; then
  echo -e "  ${GREEN}✔${RESET} Blockchain Adapter (5050): Healthy"
else
  echo -e "  ${YELLOW}⚠${RESET} Blockchain Adapter (5050): Not responding on /health"
fi

# DB Preview
if curl -s -f http://127.0.0.1:3002/api/status >/dev/null 2>&1; then
  echo -e "  ${GREEN}✔${RESET} DB Preview (3002)        : Reachable (Targeting 5433)"
else
  echo -e "  ${RED}✘${RESET} DB Preview (3002)        : Unreachable"; CHECK_FAIL=1
fi

# Frontend
if port_in_use 3000; then
  echo -e "  ${GREEN}✔${RESET} Frontend (3000)          : Reachable"
else
  echo -e "  ${RED}✘${RESET} Frontend (3000)          : Unreachable"; CHECK_FAIL=1
fi

if [ $CHECK_FAIL -eq 1 ]; then
  echo ""
  echo -e "${RED}One or more core services failed health checks.${RESET}"
  echo "Check log files in: ${LOG_DIR}"
  exit 1
fi

# ── 12. Startup URL Summary
echo ""
echo -e "${BOLD}${GREEN}==================================================${RESET}"
echo -e "${BOLD}${GREEN}IEC DEVELOPMENT ENVIRONMENT READY${RESET}"
echo -e "${BOLD}${GREEN}==================================================${RESET}"
echo ""
echo -e "  ${BOLD}Frontend:${RESET}"
echo -e "  https://localhost:3000"
echo ""
echo -e "  ${BOLD}Backend:${RESET}"
echo -e "  http://localhost:5000"
echo ""
echo -e "  ${BOLD}Blockchain Adapter:${RESET}"
echo -e "  http://localhost:5050"
echo ""
echo -e "  ${BOLD}DB Preview:${RESET}"
echo -e "  http://127.0.0.1:3002"
echo ""
echo -e "  ${BOLD}PostgreSQL:${RESET}"
echo -e "  localhost:5433"
echo ""
echo -e "${BOLD}${GREEN}==================================================${RESET}"
echo -e "  ${DIM}Logs available in : ${LOG_DIR}/${RESET}"
echo -e "  ${DIM}To stop services  : ./stop.sh${RESET}"
echo -e "${BOLD}${GREEN}==================================================${RESET}"
echo ""
