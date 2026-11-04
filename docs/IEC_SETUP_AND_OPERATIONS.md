# Industrial Evidence Chain (IEC) — Setup, Operations & LAN Guide

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Audited Branch:** `Testing_prot-1`  

---

## 1. Service Topology & Port Map

The Industrial Evidence Chain local development environment runs five cooperating services across dedicated TCP ports:

| Service | Port | Host Binding | Primary Protocol | Startup Script / Command | Health Check Endpoint |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **PostgreSQL 18** | `5433` | `localhost` | PostgreSQL wire protocol | `pg_ctl -D db_data/pgdata -o "-p 5433" start` | `pg_isready -h localhost -p 5433 -U postgres` |
| **ASP.NET Core API** | `5000` | `0.0.0.0` | HTTP / REST | `dotnet run --project backend/backend.csproj` | `curl -f http://localhost:5000/health` |
| **Blockchain Adapter** | `5050` | `0.0.0.0` | HTTP / REST | `npm --prefix blockchain start` | `curl -f http://localhost:5050/health` |
| **DB Preview Server** | `3002` | `127.0.0.1` | HTTP / HTML (Read-Only) | `node tools/db-preview/server.js` | `curl -f http://127.0.0.1:3002/api/status` |
| **Vite Web Frontend** | `3000` | `0.0.0.0` | HTTPS (Dual-Protocol) | `npm --prefix frontend run dev` | `curl -k -I https://localhost:3000` |

> [!IMPORTANT]
> **Strict Port 5433 Authority:**  
> The IEC database runs exclusively on **Port 5433** (`iec_db` in `db_data/pgdata`). It **never** uses the default PostgreSQL port 5432, preventing conflicts with existing system databases.

---

## 2. System Prerequisites

Before launching the IEC stack, ensure the following tools are installed:

1. **.NET SDK 10.0+**
   ```bash
   dotnet --version  # Verified: 10.0.400
   ```
2. **Node.js 20+ & npm 10+**
   ```bash
   node --version    # Recommended: v20+
   npm --version
   ```
3. **PostgreSQL 18 CLI Utilities (`psql`, `pg_ctl`, `pg_isready`)**
   - **macOS:** Typically at `/Library/PostgreSQL/18/bin` or Homebrew `/opt/homebrew/bin`.
   - **Windows:** Typically at `C:\Program Files\PostgreSQL\18\bin`.
4. **OpenSSL**
   Used by `frontend/vite.config.ts` to automatically generate local development SSL certificates with dynamic Subject Alternative Name (SAN) IPs.

---

## 3. Automated One-Command Startup

### macOS & Linux (`start.sh`)

```bash
cd "/Users/ashishmac/Downloads/Projects/FYP GIT workspace"
./start.sh
```

#### What `start.sh` does automatically:
1. Adds PostgreSQL 18 binaries to `PATH`.
2. Verifies presence of `dotnet`, `node`, `npm`, and `lsof`.
3. Checks and installs `node_modules` in `frontend/`, `blockchain/`, and `tools/db-preview/` if missing.
4. Securely prompts for the PostgreSQL password (hidden input, defaults to `'postgres'`). Password is held in memory and **never written to disk or logs**.
5. Starts the permanent PostgreSQL cluster on port 5433 (`db_data/pgdata`).
6. Verifies that `iec_db` exists (refuses to auto-create an empty DB, preserving existing data).
7. Builds and launches the ASP.NET Core backend on port 5000 in the background.
8. Launches the Node.js Blockchain Adapter on port 5050 in the background.
9. Launches the DB Preview diagnostics server on port 3002 in the background.
10. Launches the Vite frontend development server on port 3000 in the background.
11. Runs curl health checks against all 5 services and prints the access summary.

### Windows (`start.bat`)

```cmd
cd "C:\path\to\Industrial-Evidence-Chain"
start.bat
```
Mirrors the exact logic of `start.sh` using Windows Command Prompt syntax.

### Stopping Services (`stop.sh` / `stop.bat`)

```bash
# Stop frontend, backend, blockchain, and db-preview (keeps Postgres running)
./stop.sh

# Stop all services including the PostgreSQL 5433 cluster
./stop.sh --with-db
```

---

## 4. Manual Individual Service Launch Commands

If you need to run individual services in separate terminal windows for active debugging:

### Terminal 1: PostgreSQL 18
```bash
pg_ctl -D db_data/pgdata -l db_data/pgdata/logfile -o "-p 5433" start
```

### Terminal 2: ASP.NET Core Backend
```bash
export DB_PASSWORD=postgres
export DB_HOST=localhost
export DB_PORT=5433
export DB_NAME=iec_db
export DB_USER=postgres
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5433;Database=iec_db;Username=postgres;Password=${DB_PASSWORD}"

cd backend
dotnet run
```
*Backend listens on `http://0.0.0.0:5000`.*

### Terminal 3: Blockchain Adapter
```bash
cd blockchain
npm start
```
*Blockchain Adapter listens on `http://0.0.0.0:5050`.*

### Terminal 4: DB Preview Server
```bash
export DB_PASSWORD=postgres
export DB_PORT=5433
export DB_NAME=iec_db

node tools/db-preview/server.js
```
*DB Preview listens on `http://127.0.0.1:3002`.*

### Terminal 5: Vite Web Frontend
```bash
cd frontend
npm run dev
```
*Frontend listens on `https://localhost:3000` (HTTPS via internal port 3001).*

---

## 5. Dual-Protocol Gateway & HTTPS Mechanics

Modern mobile browsers (Safari on iOS, Chrome on Android) strictly require a **Secure Context (HTTPS)** to grant access to:
1. `navigator.mediaDevices.getUserMedia()` (Webcam & Phone Camera)
2. `navigator.geolocation.getCurrentPosition()` (GPS Coordinates)

To solve this transparently without breaking plain HTTP bookmarks or LAN IPs, `frontend/vite.config.ts` implements an innovative **Dual-Protocol Gateway**:

```text
Incoming Connection on Port 3000 (0.0.0.0)
                 │
        Inspect First Byte
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
  Byte == 0x16        Byte != 0x16
 (TLS Handshake)     (Plain HTTP)
       │                   │
  Pipe directly to     Respond HTTP 307 Redirect:
  Internal HTTPS       Location: https://<HOST>:3000/<path>
  Server on 3001
```

### Dynamic SSL Certificates with LAN SAN IPs
- `frontend/certs/dev.crt` is signed by a local Certificate Authority (`iec-ca.crt`).
- During startup, `vite.config.ts` scans all non-internal network interfaces (`en0`, `en1`, `wlan0`, etc.) and automatically appends every active LAN IP to the certificate's **Subject Alternative Name (SAN)** list (e.g. `IP:192.168.1.45`, `IP:172.21.10.75`).
- This guarantees that mobile devices connecting via local IP do not trigger invalid host certificate errors.

---

## 6. Multi-Device Local Area Network (LAN) & Phone Access

To test the full IEC system using a physical phone or tablet connected to the same Wi-Fi network:

### Step 1: Find the Host Machine's LAN IP
- **macOS:**
  ```bash
  ipconfig getifaddr en0   # Ethernet
  ipconfig getifaddr en1   # Wi-Fi
  ```
  *(Example: `192.168.1.45` or `172.21.10.75`)*
- **Windows:** Run `ipconfig` and find **IPv4 Address** under your active Wi-Fi adapter.
- **Linux:** Run `hostname -I | awk '{print $1}'`.

### Step 2: Open Browser on Mobile Device
1. Connect your phone to the **same Wi-Fi network**.
2. Open Safari or Chrome and navigate to:
   ```text
   https://<HOST-LAN-IP>:3000
   ```
   *(Example: `https://192.168.1.45:3000`)*
3. **Accept Development Certificate:** On first load, tap **Advanced $\rightarrow$ Proceed to site (unsafe)** to accept the local dev SSL certificate.
4. Grant **Camera** and **Location** permissions when prompted by the browser.

### Step 3: Login & Field Testing
Use any pre-seeded credentials:
- **Technician:** `bablu@iec.app` / `password123` or `tech@iec.app` / `password123`
- **Manager:** `manager@iec.app` / `password123`
- **Auditor:** `auditor@iec.app` / `password123`
- **Admin:** `admin@iec.app` / `password123`

---

## 7. Verification & Health Check Commands

To verify that all services are operational:

```bash
# 1. PostgreSQL 5433 Cluster
pg_isready -h localhost -p 5433 -U postgres
# Expected: localhost:5433 - accepting connections

# 2. ASP.NET Core Backend
curl -s http://localhost:5000/health | jq .
# Expected: { "status": "healthy", "database": "connected", "port": 5433, "db": "iec_db" }

# 3. Blockchain Adapter
curl -s http://localhost:5050/health | jq .
# Expected: { "isConnected": true, "details": { "adapterMode": "mock-in-memory" } }

# 4. DB Preview Server
curl -s http://127.0.0.1:3002/api/status | jq .
# Expected: { "status": "ok", "port": 5433, "db": "iec_db", "tables": [...] }

# 5. Frontend Gateway
curl -k -I https://localhost:3000
# Expected: HTTP/2 200 or HTTP/1.1 200 OK
```

---

## 8. Testing & Validation Commands

```bash
# 1. Build Backend
dotnet build backend/backend.csproj --nologo

# 2. Run Blockchain Microservice & Cryptography Test Suite (55 tests)
npm --prefix blockchain run test:ts

# 3. Build & Typecheck Frontend
npm --prefix frontend run build
```

