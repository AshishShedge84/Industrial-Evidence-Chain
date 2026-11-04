# Industrial Evidence Chain (IEC) — Current State, Gaps & Known Issues Audit

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Audited Branch:** `Testing_prot-1`  

---

## 1. Verified Working Features

The following features have been inspected, tested, and confirmed operational in the current working tree:

### 1.1 Authentication & RBAC
- **Credential Validation:** PBKDF2 HMAC-SHA256 password hashing with 10,000 iterations and 128-bit random salt.
- **JWT Lifecycles:** 60-minute access token generation with HMAC-SHA256 signing.
- **Refresh Token Rotation:** Single-use refresh tokens stored as SHA-256 hashes in `refresh_tokens`. Automatic revocation and token family replay detection.
- **Role Differentiation:** Four established roles (`Technician`, `Manager`, `Auditor`, `Admin`) properly enforced through backend authorization policies (`RequireAdmin`, `RequireManager`, `RequireTechnician`, `RequireAuditor`, `RequireEvidenceCreator`).
- **User Account Activation:** New self-registered accounts start inactive (`is_active = false`) and require Admin approval via `/api/admin/users/{id}/status`.

### 1.2 Asset Management & Unique QR Identification
- **Asset CRUD:** Creation, search, and metadata updates in PostgreSQL `assets`.
- **Unique QR Identifiers:** Non-enumerable GUID `qr_identifier` generated upon creation, indexed uniquely (`ix_assets_qr_identifier`).
- **QR Generation:** High-error-correction (`level="H"`) SVG generation via `qrcode.react`.
- **QR Scanning:** Live camera barcode reading via `html5-qrcode`.
- **Polymorphic Resolution:** `GET /api/assets/{id}` seamlessly resolves machinery whether given an internal `asset_id` GUID or a `qr_identifier` GUID.
- **Soft Decommissioning:** Decommissioning an asset preserves all historical records, linked evidence, and blockchain proofs.

### 1.3 Evidence Capture Lifecycle
- **Guided 7-Step Wizard:** Step-by-step UI with state validation.
- **Hardware-Enforced Media Capture:** Step 5 strictly enforces live camera/video capture directly from device media stream (`navigator.mediaDevices.getUserMedia()`). Desktop file pickers are omitted to prevent media recycling.
- **High-Accuracy Geolocation:** Live capture of latitude, longitude, and accuracy with reverse-geocoding fallback.
- **Explicit Confirmation Checkbox:** Mandatory legal acknowledgement before submission.
- **Atomic 3-Stage Submission:** Draft Creation $\rightarrow$ Media Upload $\rightarrow$ Canonical Ledger Anchoring.

### 1.4 Cryptographic Hashing & Off-Chain Storage
- **Deterministic Canonicalization:** Full implementation of **RFC 8785 JSON Canonicalization Scheme (JCS)** in `EvidenceHasher.cs`. Lexicographical UTF-16 key sorting, NFC string normalization, and UTC ISO-8601 millisecond formatting.
- **Dual-Layer Hashing:** Binary SHA-256 for physical media files + Canonical SHA-256 for overall evidence record.
- **Off-Chain Media Partitioning:** Files stored on host disk under `Uploaded Media/` organized by year/month.
- **Byte-Range Streaming:** `MediaController` enables HTTP range requests (`enableRangeProcessing: true`), supporting scrubbable video playback on mobile Safari and Chrome.

### 1.5 Manager Verification Center
- **Live Re-Verification:** Re-reads physical media from disk and recomputes live binary SHA-256 checksums.
- **Storage Fault Isolation:** Explicitly distinguishes missing/unreadable storage files (`STORAGE_ERROR` / `FAILED`) from malicious tampering (`INTEGRITY_MISMATCH`).
- **Ledger Verification:** Compares live canonical hash against anchored proof.
- **Operational Decisions:** Supports Manager actions (`ESCALATE`, `REQUEST_RECAPTURE`, `ACKNOWLEDGE_MISMATCH`, `FLAG_STORAGE_ISSUE`), persisting decisions to `audit_logs`.
- **Role-Based Hash Masking:** Full 64-character hex hashes are masked for field technicians while visible to Managers, Auditors, and Admins.

### 1.6 Notification Infrastructure
- **Database Persistence:** Real-time notifications stored in PostgreSQL `notifications`.
- **Strict Per-User Isolation:** Endpoints filter by caller's `user_id`. Frontend cache clears on user switch.

### 1.7 Mobile & Networking Capabilities
- **Dual-Protocol Gateway:** Port 3000 sniffer detects TLS 0x16 handshakes vs plain HTTP requests, issuing 307 redirects to ensure HTTPS for camera/location APIs.
- **Dynamic Local Certificates:** Automatically populates Subject Alternative Names (SANs) with all active local LAN IPs.
- **Reverse Proxy:** Vite proxies `/api` and `/uploads` directly to `http://localhost:5000`, eliminating CORS on local LAN.
- **Complete Android Kotlin Project:** Native Compose application located in `APP DEV/Android/iec-mobile/`.

---

## 2. Partially Implemented Features & Technical Debt

### 2.1 Extended User Profile Fields
- **Finding:** The frontend `ProfilePage.tsx` and `UpdateProfileRequestDto.cs` allow editing `bio`, `contactNumber`, `department`, `location`, and `avatarUrl`.
- **Status:** The backend persists only `email` and `full_name` to the PostgreSQL `users` table because the other columns do not exist in the current database schema. The frontend currently stores the extended profile fields in `localStorage`.
- **Impact:** Profile customizations made on one device do not synchronize across devices.

### 2.2 In-Process Mock Blockchain vs Node.js Adapter
- **Finding:** In `backend/Program.cs`, the service registration is:
  ```csharp
  builder.Services.AddSingleton<IBlockchainAdapter, MockBlockchainAdapter>();
  ```
- **Status:** The ASP.NET Core backend currently uses `MockBlockchainAdapter` directly in-process rather than making HTTP calls to the companion Node.js microservice (`blockchain/src/server.ts` on port 5050).
- **Impact:** The in-process mock maintains an in-memory dictionary of anchored proofs. While the Node.js microservice (`blockchain/`) possesses a complete 55-test suite and Fabric chaincode, the backend is not yet toggled to communicate with port 5050 via HTTP.

### 2.3 Assistant / Chatbot Integration
- **Finding:** The Memoji interactive assistant (`frontend/src/services/assistant/`) features rich 6-expression role packs and animated Memoji avatars.
- **Status:** The intelligence engine is currently a **client-side rule and regex intent processor** rather than an AI/LLM model. An extensive master prompt exists in `docs/GOOGLE_AI_STUDIO_IEC_ANDROID_MASTER_PROMPT.md` for integrating Google AI Studio / Gemini, but the web assistant runs on deterministic frontend logic.

---

## 3. Known Bugs & Test Suite Failures

### 3.1 Backend Test Compilation Failures (`tests/backend.Tests/`)
- **Impact:** High (prevents running `dotnet test`).
- **Root Cause:** The test project `tests/backend.Tests/` has fallen behind recent backend constructor updates:
  1. `AuthService(AppDbContext, IOptions<JwtSettings>, IAuditLogService)`: Tests in `AuthControllerMeEndpointTests.cs` pass only 2 arguments instead of 3.
  2. `EvidenceService(AppDbContext, IEvidenceHasher, IAuditLogService, IFileStorageService, IServiceProvider, INotificationService)`: 9 tests in `EvidenceServiceTests.cs` omit the new `INotificationService` parameter.
  3. `AssetService(AppDbContext, IAuditLogService, INotificationService)`: Asset tests omit the `INotificationService` parameter.
  4. `EvidenceControllerEndpointTests.cs`: References `GetEvidenceByAssetId`, but the actual controller method was renamed to `GetEvidenceByAsset`.
- **Remediation Note:** This documentation audit is strictly read-only; source code changes must be performed in a dedicated maintenance task.

### 3.2 Frontend Chunk Size Warning
- **Impact:** Low (informational build warning).
- **Finding:** `npm run build` produces a single JavaScript bundle `dist/assets/index-Cdmesxcd.js` of 1,249 kB (354 kB gzipped).
- **Recommendation:** Implement dynamic imports (`React.lazy`) for heavy pages (`VerificationPage.tsx`, `CaptureEvidencePage.tsx`, `AssetCatalogPage.tsx`).

---

## 4. Critical Operational Risks & Mitigation

| Risk Area | Description | Current Safety Measure |
| :--- | :--- | :--- |
| **Database Port Collision** | PostgreSQL running on system port 5432 might receive requests intended for IEC port 5433. | `backend/Program.cs` strictly enforces `Port=5433` via regex replacement. `start.sh` validates cluster readiness on port 5433 before launching the backend. |
| **Accidental Data Reset** | Running `dotnet ef database update` or auto-migration against a fresh empty database could wipe development records. | `start.sh` checks for `iec_db` existence and **refuses to auto-create an empty DB**. `DbInitializer.cs` checks connectivity and throws if unreachable. |
| **Media Directory Resolution** | Backend must find `Uploaded Media/` regardless of whether launched from workspace root or `backend/` directory. | `Program.cs` and `MediaController.cs` check both `../Uploaded Media` and `./Uploaded Media`. |
| **Self-Signed SSL on Mobile** | Mobile devices reject HTTPS if certificate lacks their specific LAN IP. | `frontend/vite.config.ts` dynamically injects all host network interface IPs into certificate Subject Alternative Names (SANs). |

