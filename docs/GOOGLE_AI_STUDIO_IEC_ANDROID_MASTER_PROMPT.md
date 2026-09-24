# GOOGLE AI STUDIO MASTER PROMPT
## Native Android Application Implementation for Industrial Evidence Chain (IEC)

> **Copy-Paste Instructions for Google AI Studio**:  
> Copy the complete prompt below directly into **Google AI Studio (Build Mode / Project Workspace)** with the imported repository `https://github.com/Pratham-dev05/Industrial-Evidence-Chain`.  
> This master prompt provides the complete, authoritative specification for creating the native Android application.

***

```markdown
# MISSION BRIEF: BUILD THE NATIVE ANDROID VERSION OF INDUSTRIAL EVIDENCE CHAIN (IEC)

You are tasked with building the official native Android application for the **Industrial Evidence Chain (IEC)** platform.

## 1. MANDATORY SOURCE OF TRUTH & REPOSITORY CONTEXT
- **Source Repository**: `https://github.com/Pratham-dev05/Industrial-Evidence-Chain`
- **Reference Codebase**: The imported repository contains the full ASP.NET Core Web API, PostgreSQL schema, and React web application.
- **Architectural Reference File**: Inspect `docs/IEC_ANDROID_SOURCE_MAP.md` in the repository for the exact 1-to-1 mapping of existing web components, services, controllers, and models to their Android counterparts.
- **Critical Policy**:
  - Do NOT invent a new design, new business logic, or extra roles.
  - Do NOT create a second database or require data migration.
  - The Android application is a native **Kotlin + Jetpack Compose** translation that must feel like the exact same IEC product, adapted for native Android.

---

## 2. STRICT SYSTEM ARCHITECTURE & NETWORK BOUNDARIES

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NATIVE ANDROID CLIENT                           │
│                     (Kotlin + Jetpack Compose)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / HTTP REST (JSON)
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ASP.NET CORE 10.0 REST API (PORT 5000)                │
│             (Controllers, RBAC, Hasher, File Storage)                  │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌───────────────────┐  ┌───────────────┐  ┌───────────────────┐
     │ PostgreSQL (5433) │  │Uploaded Media/│  │  Hyperledger      │
     │      iec_db       │  │ (Host Storage)│  │  Fabric Adapter   │
     └───────────────────┘  └───────────────┘  └───────────────────┘
```

### Absolute Architectural Constraints:
1. **NO Direct Database Connections**:
   - The Android app **MUST NEVER** connect directly to PostgreSQL, TCP port 5433, or the database connection string.
   - All persistence, asset queries, evidence submissions, and notifications pass exclusively through the ASP.NET Core REST API.
2. **NO Direct Blockchain Connections**:
   - The Android app **MUST NEVER** communicate directly with the Hyperledger Fabric ledger or mock blockchain service (port 5050). The backend handles hashing (RFC 8785 canonical JSON + SHA-256) and ledger anchoring.
3. **NO Direct Filesystem Access**:
   - The Android app **MUST NEVER** attempt to read or write directly to the host machine's `Uploaded Media/` directory. All media is uploaded via `POST /api/evidence/{id}/media` and streamed via `GET /api/media/{*storagePath}`.

---

## 3. CONFIGURABLE API BASE URL & LOCAL LAN TESTING

The Android application will run either on an Android emulator or on a physical Android smartphone connected to the same Local Area Network (Wi-Fi/LAN) as the development host.

### A. Environment Configuration (`IEC_API_BASE_URL`)
- Define a central, configurable `ApiConfig`:
  ```kotlin
  object ApiConfig {
      // Local LAN default (replace with your host machine's LAN IP e.g. 192.168.1.45 or 172.21.10.75)
      // When running on standard Android Emulator, host loopback is 10.0.2.2
      const val DEFAULT_DEV_URL = "http://10.0.2.2:5000/api/"
      
      // In-app editable configuration for physical device testing
      var baseUrl: String = DEFAULT_DEV_URL
  }
  ```
- Support modifying `baseUrl` in developer settings or via a connection settings dialog on the login screen.
- In production, changing this single URL to `https://<production-iec-backend>/api/` connects the application to production without changing any UI or business logic.

### B. Android Network Security Configuration (`res/xml/network_security_config.xml`)
To permit local LAN development over HTTP (`http://<HOST-LAN-IP>:5000`) without cleartext transmission errors on Android 9+ (API 28+):
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <!-- Android Emulator Loopback -->
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <!-- Private LAN Subnets -->
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">192.168.0.1</domain>
    </domain-config>
    <!-- For dev testing with self-signed SSL on LAN: -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

---

## 4. AUTHENTICATION & EXACT ROLE-BASED ACCESS CONTROL (RBAC)

The IEC platform defines exactly **four** authoritative roles. Do NOT invent or permit any other roles:
1. **Technician**: Field worker capturing real-world evidence against assets, scanning QR codes, submitting evidence to manager queues.
2. **Manager**: Operational supervisor reviewing pending evidence, performing live cryptographic integrity checks, executing operational actions (Escalate, Recapture, Flag), and managing assets.
3. **Auditor**: Independent compliance auditor viewing ledger integrity metrics, inspecting full SHA-256 hashes, reading audit trails, and verifying blockchain anchoring.
4. **Admin**: System administrator managing user account approvals (`IsActive`), viewing system audit logs, and decommissioning assets.

### Login Contract (`POST /api/auth/login`)
- **Request Body**:
  ```json
  {
    "usernameOrEmail": "technician@iec.app",
    "password": "password123"
  }
  ```
- **Response Body (`ApiResponse<LoginResponseDto>`)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "7d9a1f2b...",
      "expiresAt": "2026-09-24T12:00:00Z",
      "user": {
        "userId": "77aa54d5-6839-4fbf-84bc-19d511e82aaa",
        "username": "bablu",
        "email": "bablu@iec.app",
        "fullName": "Bablu Technician",
        "role": "Technician",
        "isActive": true
      }
    },
    "traceId": "0HN123456789"
  }
  ```
- **Token Security**:
  - Save `accessToken`, `refreshToken`, and user metadata using AndroidX `EncryptedSharedPreferences` (`security-crypto`).
  - Automatically append header: `Authorization: Bearer <accessToken>` to every protected request via an OkHttp `Interceptor`.
  - When encountering HTTP 401, use an OkHttp `Authenticator` to invoke `POST /api/auth/refresh` with `{ "refreshToken": "..." }`, save the rotated tokens, and retry the request seamlessly.
  - If refresh fails, clear session and navigate safely to `LoginScreen` without infinite redirect loops.

---

## 5. COMPLETE API CONTRACT TABLE

Every feature in the Android application maps to an existing ASP.NET Core API controller endpoint:

| Feature Area | HTTP Method | Endpoint | Request Payload | Response Data Type | Minimum Role | Android Screen / View |
|:---|:---|:---|:---|:---|:---|:---|
| **Auth** | `POST` | `/api/auth/login` | `LoginRequestDto` | `LoginResponseDto` | Public | `LoginScreen` |
| **Auth** | `POST` | `/api/auth/refresh` | `RefreshTokenRequestDto` | `RefreshTokenResponseDto` | Public | Background Authenticator |
| **Auth** | `GET` | `/api/auth/me` | None | `AuthUserDto` | Authenticated | `ProfileScreen`, App Startup |
| **Profile** | `PATCH` / `PUT` | `/api/auth/profile` | `UpdateProfileRequestDto` | `AuthUserDto` | Authenticated | `ProfileScreen` |
| **Assets** | `GET` | `/api/assets` | Query: `query, category, status, page, pageSize` | `PagedResult<AssetDto>` | Authenticated | `AssetListScreen` |
| **Assets** | `GET` | `/api/assets/{id}` | Path: `{id}` (GUID or `QrIdentifier`) | `AssetDto` | Authenticated | `AssetDetailScreen`, QR Scan Resolver |
| **Assets** | `POST` | `/api/assets` | `CreateAssetRequestDto` | `AssetDto` | Manager, Admin | `CreateAssetDialog` |
| **Assets** | `PUT` | `/api/assets/{id}` | `UpdateAssetRequestDto` | `AssetDto` | Manager, Admin | `EditAssetDialog` |
| **Assets** | `DELETE` | `/api/assets/{id}` | None (Soft decommission) | `AssetDto` | Admin | `AssetDetailScreen` |
| **Assets** | `GET` | `/api/assets/{id}/history` | None | `List<AssetHistoryDto>` | Authenticated | `AssetHistoryScreen` |
| **Assets** | `GET` | `/api/assets/{id}/evidence` | Query: `page, pageSize` | `PagedResult<EvidenceDto>` | Authenticated | `AssetDetailScreen` (Evidence Tab) |
| **Evidence** | `POST` | `/api/evidence` | `CreateEvidenceRequestDto` | `EvidenceDto` | Technician, Manager, Admin | `EvidenceCaptureFlowScreen` (Step 1) |
| **Evidence** | `GET` | `/api/evidence` | Query: `assetId, userId, activityType, status, dates, search` | `PagedResult<EvidenceDto>` | Authenticated | `EvidenceListScreen`, Manager Dashboard |
| **Evidence** | `GET` | `/api/evidence/{id}` | None | `EvidenceDto` | Authenticated | `EvidenceDetailScreen` |
| **Evidence** | `POST` | `/api/evidence/{id}/media` | `multipart/form-data` (file) | `EvidenceMediaDto` | Technician, Manager, Admin | `EvidenceCaptureFlowScreen` (Step 5) |
| **Evidence** | `POST` | `/api/evidence/{id}/submit` | None | `EvidenceDto` | Technician, Manager, Admin | `EvidenceCaptureFlowScreen` (Step 7) |
| **Evidence** | `GET` | `/api/evidence/{id}/media` | None | `List<EvidenceMediaDto>` | Authenticated | `EvidenceDetailScreen` |
| **Evidence** | `GET` | `/api/evidence/{id}/audit-trail`| None | `List<AuditTrailEntryDto>` | Authenticated | `EvidenceDetailScreen` (Audit Trail) |
| **Verification**| `GET` | `/api/evidence/{id}/verification`| None | `EvidenceVerificationResponseDto` | Authenticated | `EvidenceDetailScreen`, `VerificationCenter` |
| **Verification**| `POST`| `/api/evidence/{id}/verify` | None (Triggers live recalculation) | `EvidenceVerificationResponseDto` | Manager, Auditor, Admin | `VerificationCenterScreen` |
| **Verification**| `POST`| `/api/evidence/{id}/action` | `OperationalActionRequestDto` | `Boolean` | Manager, Admin | `OperationalActionSheet` |
| **Notifications**| `GET`| `/api/notifications` | None | `List<NotificationDto>` | Authenticated | `NotificationBottomSheet` |
| **Notifications**| `GET`| `/api/notifications/unread-count`| None | `Int` | Authenticated | `IecTopAppBar` (Bell Badge) |
| **Notifications**| `PATCH`| `/api/notifications/{id}/read` | None | `Boolean` | Authenticated | `NotificationBottomSheet` |
| **Notifications**| `PATCH`| `/api/notifications/read-all` | None | `Boolean` | Authenticated | `NotificationBottomSheet` |
| **Media Stream**| `GET`| `/api/media/{*storagePath}` | HTTP Range Header (optional) | Binary Stream (Image/Video) | Public / Anonymous | Coil `AsyncImage`, ExoPlayer |
| **Admin** | `GET` | `/api/admin/users` | None | `List<UserDto>` | Admin | `AdminUserManagementScreen` |
| **Admin** | `PATCH`| `/api/admin/users/{id}/status` | `UpdateUserStatusDto` (`isActive`) | `UserDto` | Admin | `AdminUserManagementScreen` |
| **Admin** | `GET` | `/api/admin/audit` | Query: `limit=100` | `List<AdminAuditLogDto>` | Admin | `AdminAuditScreen` |

---

## 6. PERSISTENT UNIQUE QR SYSTEM

Every industrial asset in the IEC system possesses a persistent, unique QR identifier:
- **Database Schema**: `assets.qr_identifier` (Indexed with `UNIQUE` constraint: `ix_assets_qr_identifier`).
- **Generation**: Generated automatically by the backend upon asset creation (`Guid.NewGuid().ToString()`).
- **Resolution**:
  - `GET /api/assets/{id}` in `AssetController.cs` evaluates:
    ```csharp
    .FirstOrDefaultAsync(a => a.AssetId == id || a.QrIdentifier == idString)
    ```
  - An Android QR scan of an asset code or QR UUID string directly calls `GET /api/assets/{qrString}`. The backend resolves the asset automatically.
- **Android Capabilities Required**:
  1. **Display Asset QR**: Renders a clean QR code using the asset's `qrIdentifier` with asset code and name overlay.
  2. **Scan Asset QR**: Integrates CameraX with Google Code Scanner or ML Kit Barcode Scanning.
  3. **Scan-to-Action**: Scanning a QR code navigates directly to `AssetDetailScreen` or immediately selects the asset in Step 1 of the Evidence Capture flow.

---

## 7. TECHNICIAN EVIDENCE CAPTURE — EXACT 7-STEP FLOW

The Android evidence capture wizard must implement the exact 7-step workflow from `CaptureEvidencePage.tsx`:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    STEP 1    │ ──► │    STEP 2    │ ──► │    STEP 3    │ ──► │    STEP 4    │
│ Select Asset │     │ Confirm Asset│     │ Activity Type│     │  GPS Location│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│    STEP 7    │ ◄── │    STEP 6    │ ◄── │    STEP 5    │ ◄───────────┘
│Seal on Ledger│     │Review Package│     │ Live Camera  │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **Step 1: Select Asset**: Search asset catalog by tag, name, or scan physical QR code using the device camera.
2. **Step 2: Confirm Asset**: Displays selected asset specifications, current location, and status badge to ensure correct target equipment.
3. **Step 3: Activity & Description**:
   - Activity Type dropdown/chips: `Maintenance`, `Inspection`, `Safety`, `Quality`, `Audit`, `Incident`, `SparePart`, `Transfer`.
   - Work notes text input field.
   - ISO-8601 captured timestamp.
4. **Step 4: Geolocation Acquisition**:
   - Uses `FusedLocationProviderClient` to get real device GPS coordinates (latitude, longitude, accuracy in meters).
   - Shows live satellite coordinate chips with accuracy indicator.
   - Handles location permissions gracefully.
5. **Step 5: Live Camera Capture**:
   - Uses native **CameraX** (`ImageCapture` and `VideoCapture`).
   - Captures live photos or short inspection videos directly on the device.
   - **No gallery upload** for standard tamper-evident workflows.
6. **Step 6: Review Evidence Package**:
   - Displays all captured data: asset summary, activity tag, description, GPS coordinates on map card, thumbnail preview of captured media, and estimated hash preview.
7. **Step 7: Confirm & Seal on Blockchain**:
   - Executes the 3-step backend transactional sequence:
     1. `POST /api/evidence` $\rightarrow$ creates draft record.
     2. `POST /api/evidence/{id}/media` $\rightarrow$ streams media bytes via multipart upload. Backend saves file to host storage and computes live SHA-256 file hash.
     3. `POST /api/evidence/{id}/submit` $\rightarrow$ backend canonicalizes JSON metadata (RFC 8785), computes top-level evidence hash, and anchors proof to Hyperledger Fabric.
   - Evidence state enters: **`WAITING_FOR_VERIFICATION`**.
   - Navigates to `EvidenceDetailScreen`.

---

## 8. MANAGER VERIFICATION CENTER & CRYPTOGRAPHIC INTEGRITY

The Manager Verification workflow in `VerificationPage.tsx` is the cryptographic core of IEC:

### A. Verification States
The Android app must strictly distinguish between these 6 verification results returned by `POST /api/evidence/{id}/verify`:
1. `VERIFIED`: The live SHA-256 checksum recomputed from physical storage files and canonical metadata exactly matches the anchored blockchain proof hash (`isValid: true`).
2. `INTEGRITY_MISMATCH`: The live checksum does NOT match the ledger proof hash. Physical file or metadata has been altered after sealing (`isValid: false`).
3. `STORAGE_ERROR`: A physical media file is missing from host disk storage or unreadable (`isValid: false`). **A missing storage file must NOT be reported as intentional tampering; it must clearly indicate storage infrastructure failure.**
4. `WAITING_FOR_VERIFICATION`: Freshly submitted evidence pending manager verification.
5. `NOT_ANCHORED`: Evidence created but not yet submitted for ledger anchoring.
6. `FAILED`: Generic execution or adapter failure.

### B. Manager Operational Decision Actions (`POST /api/evidence/{id}/action`)
When reviewing evidence (especially in `INTEGRITY_MISMATCH` or `STORAGE_ERROR` states), Managers have 4 authoritative operational actions:
1. `ESCALATE`: Escalate issue to Security Operations & Facility Administration.
2. `REQUEST_RECAPTURE`: Dispatch re-capture request back to field technician queue.
3. `ACKNOWLEDGE_MISMATCH`: Acknowledge integrity discrepancy for formal compliance audit.
4. `FLAG_STORAGE_ISSUE`: Register storage infrastructure incident ticket with IT.

---

## 9. NOTIFICATION SYSTEM (POSTGRESQL-BACKED)

The notification system runs strictly off the backend PostgreSQL `notifications` table:
- **Unread Count**: `GET /api/notifications/unread-count` continuously informs the badge counter on the top app bar bell icon.
- **Fetch Notifications**: `GET /api/notifications` returns the active user's notifications sorted by creation date descending.
- **Mark As Read**: `PATCH /api/notifications/{id}/read` updates `is_read = true` in PostgreSQL.
- **Mark All Read**: `PATCH /api/notifications/read-all` marks all unread notifications read for the current user.
- **Strict Role & User Isolation**:
  - The Android app must NEVER display another user's notifications.
  - On user logout / switch, clear local notification caches immediately.
- **Real Backend Event Flow**:
  - When a Technician submits evidence $\rightarrow$ Assigned Manager receives a `"Verification Requested"` notification.
  - When a Manager verifies evidence $\rightarrow$ Technician receives an `"Evidence Verified"` or `"Verification Failed"` notification.

---

## 10. ROLE-AWARE AI ASSISTANT (MEMOJI SYSTEM)

The IEC chatbot assistant features 4 role-specific identities and a 6-expression emotion state machine:

### A. Identities
- **Technician**: `Technician Support`
- **Manager**: `Manager Support`
- **Auditor**: `Auditor Support`
- **Admin**: `Admin Support`

### B. 6 Expression States (`AssistantEmotion`)
1. `initial`: Initial greeting state.
2. `hover`: Interactive touch / focus state.
3. `idle`: Resting state awaiting input.
4. `thinking`: Active while network query or parsing is in flight.
5. `success`: Work done / verification passed / action completed.
6. `error`: Integrity mismatch alert / permission error / network failure.

### C. Assistant Capabilities
- Floating action button in bottom right corner with unread badge.
- Bottom sheet chat interface with quick action suggestions.
- Context-aware entity recognition: automatically recognizes evidence IDs (`EV-xxx`) and asset codes (`AST-xxx`).

---

## 11. UI & DESIGN SYSTEM REPLICATION (INDUSTRIAL PRECISION)

Replicate the exact visual identity of the IEC web application:

### A. Color Palette
- **Primary (Industrial Steel Blue)**:
  - `Primary 600`: `#1E3A5F` (Dominant brand color)
  - `Primary 500`: `#2E5A8A`
  - `Primary 700`: `#172D4A`
  - `Primary 100`: `#D6E4F0`
- **Accent (Warm Amber / Blockchain Anchor)**:
  - `Accent 500`: `#C49102`
  - `Accent 400`: `#E4B018`
  - `Accent 100`: `#F9EDB7`
- **Neutrals & Dark Surfaces**:
  - `Background Dark`: `#0A0A0A`
  - `Surface Elevated`: `#171717`
  - `Surface Hover`: `#262626`
  - `Border Default`: `#262626`
  - `Border Strong`: `#404040`
- **Status Semantics**:
  - `Success`: `#22C55E` / `#16A34A`
  - `Warning`: `#FFB300` / `#FFA000`
  - `Error`: `#EF4444` / `#DC2626`
  - `Info`: `#3B82F6` / `#2563EB`

### B. Key Layout Rules
1. **Balanced Mobile Gutters**: Maintain equal left and right padding (`12dp` to `16dp`) across all screens.
2. **2×2 Stat Cards**: On phone viewports, render dashboard stat cards in a balanced 2-column by 2-row grid:
   ```
   [ Operational Assets ] [ Total Evidence Records ]
   [ Pending Verify     ] [ Verified Reports      ]
   ```
3. **Glassmorphism Panels**: Use subtle translucent surface cards with thin borders (`border: 1dp solid rgba(255,255,255,0.08)`) and rounded corners (`16dp`).
4. **Touch Targets**: All interactive buttons, chips, and items must meet or exceed `48dp` touch height.
5. **No Horizontal Clipping**: Enforce `Modifier.fillMaxWidth()` and natural vertical scrolling with zero horizontal scroll leakage.

---

## 12. STEP-BY-STEP BUILD ORDER FOR GOOGLE AI STUDIO

Follow this structured implementation sequence in Google AI Studio:

1. **Phase 1: Gradle & Architecture Setup**:
   - Setup Kotlin, Compose BOM, Jetpack Navigation, Retrofit 2, Moshi/Kotlinx Serialization, OkHttp, Coil, CameraX, Play Services Location, Security-Crypto.
   - Configure `network_security_config.xml` and `AndroidManifest.xml` (Camera, Fine/Coarse Location, Internet permissions).
2. **Phase 2: Network & Session Layer**:
   - Implement `ApiClient`, `AuthInterceptor`, `TokenAuthenticator`, and `EncryptedSessionManager`.
   - Setup `ApiResponse<T>` envelope unwrapping and Retrofit service interfaces for all endpoints.
3. **Phase 3: Design System & Theme**:
   - Implement `Color.kt`, `Theme.kt`, `Type.kt`, and reusable components (`StatCard`, `GlassCard`, `IecTopAppBar`, `StatusBadge`).
4. **Phase 4: Authentication**:
   - Build `LoginScreen` with role quick-fill chips, error handling, and session restoration on app launch.
5. **Phase 5: Dashboards & Navigation**:
   - Implement role-based navigation routing: Technician, Manager, Auditor, Admin dashboards with 2x2 stat cards.
6. **Phase 6: Asset Catalog & QR Scanner**:
   - Implement `AssetListScreen`, `AssetDetailScreen`, `QrScannerScreen` (CameraX + ML Kit), and `QrCodeView`.
7. **Phase 7: Technician Evidence Capture**:
   - Implement the complete 7-step wizard with live CameraX capture, GPS coordinate fetching, and the 3-step submit sequence.
8. **Phase 8: Manager Verification Center**:
   - Implement `VerificationCenterScreen`, live hash recomputation trigger, integrity comparison card, and operational actions modal sheet.
9. **Phase 9: Notifications & AI Assistant**:
   - Implement `NotificationBottomSheet` with unread count badge, and `AssistantBottomSheet` with 4 Memoji personas.
10. **Phase 10: Validation & Acceptance Checklist**:
    - Verify against local LAN host, test all 4 roles, verify QR resolution, and ensure visual parity with the web application.
```
