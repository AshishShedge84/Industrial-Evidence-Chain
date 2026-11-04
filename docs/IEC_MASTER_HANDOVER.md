# Industrial Evidence Chain (IEC) — Master Handover & Developer Briefing

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Audited Branch:** `Testing_prot-1`  
**Target Audience:** Software Engineers, Solution Architects, and AI Pair-Programming Agents  

---

## 1. Quick Navigation & Documentation Map

This Master Handover document provides an authoritative, consolidated entry point for the **Industrial Evidence Chain (IEC)** project. For deep technical investigations, refer to the specialized documentation suite in `docs/`:

1. [IEC Complete Project Context](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_COMPLETE_PROJECT_CONTEXT.md) — Comprehensive overview, problem domain, industrial purpose, and high-level architecture.
2. [IEC Complete File Structure](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_COMPLETE_FILE_STRUCTURE.md) — Complete repository file map with exact responsibilities, callers, and dependencies.
3. [IEC Database & Data Model](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_DATABASE_AND_DATA_MODEL.md) — PostgreSQL 18 schema, table definitions, foreign keys, indexes, ER diagram, and port 5433 enforcement.
4. [IEC REST API Reference](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_API_REFERENCE.md) — Full endpoint reference table with methods, request/response DTOs, authorization policies, and business effects.
5. [IEC Workflows & RBAC](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_WORKFLOWS_AND_RBAC.md) — Role-based permission matrix, 7-step Technician capture wizard, Manager verification, QR codes, and notifications.
6. [IEC Setup, Operations & LAN Guide](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_SETUP_AND_OPERATIONS.md) — Ports, startup scripts (`start.sh` / `start.bat`), dual-protocol gateway, LAN testing, and health checks.
7. [IEC Current State & Known Issues](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/docs/IEC_CURRENT_STATE_AND_KNOWN_ISSUES.md) — Verified working features, technical debt, backend test compilation gaps, and operational risks.

---

## 2. Executive Overview: What IEC Does

The **Industrial Evidence Chain (IEC)** is a tamper-evident audit management system for mission-critical industrial plants. It ensures that every maintenance event, safety check, and incident log is:
1. **Accurately Attributed:** Grounded in unique physical machinery QR codes (`qr_identifier`).
2. **Captured in Real Time:** Sourced directly from live device cameras (photos/videos) and GPS sensors with zero camera roll uploads.
3. **Mathematically Sealed:** Canonicalized via **RFC 8785 (JCS)** and hashed with **SHA-256**.
4. **Immutably Anchored:** Committed to a **Hyperledger Fabric** blockchain ledger with non-repudiable transaction IDs.
5. **Systematically Verified:** Audited by facility managers against live disk files and ledger proofs, enabling operational escalation, recapture requests, and incident logging.

---

## 3. High-Level Architecture & Communication Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT TIER                              │
│   React 19 Web App (3000)   │   Kotlin Compose Android App  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (JSON) + JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION CORE TIER                      │
│            ASP.NET Core 10.0 Web API (Port 5000)            │
│   • Controllers & RBAC        • RFC 8785 Evidence Hasher    │
│   • LocalFileStorageService   • Audit & Notification Engine │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
      TCP 5433 │              Disk I/O │
               ▼                       ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│     POSTGRESQL 18         │  │     HOST MEDIA STORAGE       │
│  Port 5433 / iec_db       │  │       Uploaded Media/        │
│  (Authoritative Master)   │  │   (Photos & WebM Videos)     │
└───────────────────────────┘  └──────────────────────────────┘
               ▲
               │ Direct In-Process / HTTP 5050
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  BLOCKCHAIN LEDGER TIER                     │
│    MockBlockchainAdapter (In-Process C# Singleton)          │
│    Node.js Hyperledger Fabric Microservice (Port 5050)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. System Roles & Capabilities

| Role | Primary Dashboard | Primary Responsibilities |
| :--- | :--- | :--- |
| **Technician** | `TechnicianDashboard.tsx` | Scans asset QR tags, conducts inspections, captures live camera/video evidence and GPS, submits records for ledger anchoring. Full hashes are masked. |
| **Manager** | `ManagerDashboard.tsx` | Manages plant assets, reviews pending technician evidence in the Verification Center, executes live cryptographic verifications, and issues operational actions (Escalate, Request Recapture, Acknowledge Mismatch, Flag Storage). |
| **Auditor** | `AuditorDashboard.tsx` | Independent compliance observer. Inspects historical evidence, views complete unmasked 64-character SHA-256 hashes, verifies blockchain transaction proofs, and analyzes system audit logs. |
| **Admin** | `AdminDashboard.tsx` | System administrator. Approves/activates newly registered accounts, soft-decommissions assets, monitors system health, and reviews complete system-wide audit logs. |

---

## 5. Technology Cheat Sheet

| Component | Framework / Tool | Key Files / Config |
| :--- | :--- | :--- |
| **Web Frontend** | React 19, TypeScript, Tailwind CSS v4 | `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/app/routes.tsx` |
| **Backend API** | ASP.NET Core 10.0, C# 13 | `backend/backend.csproj`, `backend/Program.cs`, `backend/appsettings.json` |
| **Database** | PostgreSQL 18 (Port 5433, `iec_db`) | `db_data/pgdata`, `backend/Data/AppDbContext.cs`, `database/iec_db_authoritative_backup.sql` |
| **Media Storage** | Localhost Filesystem | `Uploaded Media/`, `backend/Services/LocalFileStorageService.cs` |
| **Blockchain** | Hyperledger Fabric 2.5 spec / Node.js | `blockchain/package.json`, `blockchain/src/chaincode/evidenceContract.ts`, `blockchain/src/server.ts` |
| **Mobile App** | Kotlin, Jetpack Compose, Retrofit2 | `APP DEV/Android/iec-mobile/app/build.gradle.kts`, `MainActivity.kt` |
| **Diagnostics** | Node.js Read-Only DB Preview (Port 3002) | `tools/db-preview/server.js`, `tools/db-preview/package.json` |

---

## 6. Default Development Accounts

All pre-seeded accounts share the default development password: `password123`.

| Username | Email | Role | Full Name |
| :--- | :--- | :--- | :--- |
| `admin` | `admin@iec.app` | **Admin** | Admin User |
| `manager`| `manager@iec.app` | **Manager** | Sarah Connor |
| `tech` | `tech@iec.app` | **Technician** | John Smith |
| `bablu` | `bablu@iec.app` | **Technician** | Bablu Field Tech |
| `auditor`| `auditor@iec.app` | **Auditor** | Michael Chen |

---

## 7. Fast Operational Commands

```bash
# ── Launch Complete Development Environment (Postgres, Backend, Blockchain, DB Preview, Frontend)
./start.sh

# ── Cleanly Stop All Services
./stop.sh

# ── Stop All Services Including PostgreSQL Cluster
./stop.sh --with-db

# ── Run Blockchain Microservice Tests (55 passing tests)
npm --prefix blockchain run test:ts

# ── Build & Typecheck Frontend
npm --prefix frontend run build

# ── Build Backend
dotnet build backend/backend.csproj --nologo

# ── Check Service Health
curl -s http://localhost:5000/health
curl -s http://localhost:5050/health
curl -s http://127.0.0.1:3002/api/status
```

---

## 8. Invariant Rules for Developers & AI Agents

1. **NEVER modify database port 5433:** Do not change configuration to port 5432. All scripts and backend code strictly enforce port 5433 and database `iec_db`.
2. **NEVER connect clients directly to PostgreSQL:** Clients (web or mobile) must never query PostgreSQL or use connection strings. All access goes through the authenticated ASP.NET Core API.
3. **NEVER permit file picker uploads in the Technician Capture Wizard:** The 7-step wizard strictly requires real-time camera capture to maintain evidential authenticity.
4. **NEVER classify unreadable storage files as tampering:** If a physical file cannot be read from disk, the system reports `STORAGE_ERROR` (`FAILED`), preserving distinct operational meaning from malicious cryptographic tampering (`INTEGRITY_MISMATCH`).
5. **DO NOT run destructive migrations or database drops:** `db_data/pgdata/` is the permanent cluster directory. Always preserve the database state.

