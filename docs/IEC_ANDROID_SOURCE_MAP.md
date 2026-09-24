# IEC Android Source Map & Architectural Reference

This document maps the **Industrial Evidence Chain (IEC)** web application and backend codebase directly to its native Android (**Kotlin + Jetpack Compose**) equivalent. Use this source map in Google AI Studio to inspect the reference implementation files and understand how each feature, service, and data contract translates into Android-native architecture.

---

## 1. Google AI Studio Priority Inspection Order

When importing or reading the repository in Google AI Studio, inspect files in this specific sequence to understand the authoritative contracts and behaviors:

| Priority | Path | Purpose & What to Inspect |
|:---|:---|:---|
| **1** | [`backend/Controllers/EvidenceController.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Controllers/EvidenceController.cs) | Master evidence contract: draft creation, media upload, RFC 8785 canonical submission, verification, operational manager actions, and audit trail endpoints. |
| **2** | [`backend/Services/EvidenceService.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Services/EvidenceService.cs) | Cryptographic canonicalization, live SHA-256 disk re-computation, integrity checking, tampering detection, and event notification dispatch. |
| **3** | [`backend/Controllers/AssetController.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Controllers/AssetController.cs) | Asset lifecycle, unique `QrIdentifier` generation and resolution, tag uniqueness, pagination, and audit history. |
| **4** | [`backend/Controllers/NotificationController.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Controllers/NotificationController.cs) | PostgreSQL-backed user notification center: unread count, fetch, mark read, mark all read. |
| **5** | [`backend/Controllers/AuthController.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Controllers/AuthController.cs) | JWT login, registration, profile retrieval, token refresh with rotation, and profile patch. |
| **6** | [`backend/Controllers/MediaController.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Controllers/MediaController.cs) | Media serving from host storage (`Uploaded Media/`), hash streaming, ID streaming, and byte-range support for video playback. |
| **7** | [`frontend/src/pages/technician/evidence/CaptureEvidencePage.tsx`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/frontend/src/pages/technician/evidence/CaptureEvidencePage.tsx) | Complete 7-step evidence capture flow, camera integration, GPS coordinate acquisition, review, and sealing. |
| **8** | [`frontend/src/pages/verification/VerificationPage.tsx`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/frontend/src/pages/verification/VerificationPage.tsx) | Manager Verification Center: Pending vs. Verified tabs, evidence inspection, live hash comparison, and 4 operational actions. |
| **9** | [`frontend/src/services/api/apiClient.ts`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/frontend/src/services/api/apiClient.ts) | Dynamic LAN IP discovery, JWT bearer injection, token refresh interceptor, and ApiResponse envelope unwrapping. |
| **10** | [`frontend/src/services/assistant/assistantIdentity.ts`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/frontend/src/services/assistant/assistantIdentity.ts) | 4 role-specific assistant identities and 6-expression Memoji emotion state machine. |
| **11** | [`backend/Data/AppDbContext.cs`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/backend/Data/AppDbContext.cs) | PostgreSQL schema, table names, foreign keys, and indexes (`ix_assets_qr_identifier`). |
| **12** | [`LAN_ACCESS.md`](file:///Users/ashishmac/Downloads/Projects/FYP%20GIT%20workspace/LAN_ACCESS.md) | Wi-Fi/LAN topology, host IP discovery, port binding (5000 API, 5433 DB), and client device access rules. |

---

## 2. Comprehensive Architectural Component Mapping

### A. Network & API Client Layer

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/services/api/apiClient.ts` | Axios instance with baseURL, auth header injection, error unwrapping, and refresh token interceptor. | `network/ApiClient.kt`, `network/AuthInterceptor.kt`, `network/TokenAuthenticator.kt` using **OkHttpClient** and **Retrofit 2**. Configurable base URL stored in `AppConfig` or `BuildConfig`. |
| `frontend/src/types/api.ts`<br>`backend/DTOs/Common/ApiResponse.cs` | Standard response envelope `{ success, data, error, traceId }`. | `data/model/common/ApiResponse.kt`: generic data class `ApiResponse<T>(val success: Boolean, val data: T?, val error: ErrorResponseDto?, val traceId: String?)`. |
| `frontend/src/services/auth/authService.ts`<br>`backend/Controllers/AuthController.cs` | Login, registration, token refresh, current user profile, profile update. | `data/api/AuthApiService.kt` and `data/repository/AuthRepository.kt`. Access and refresh tokens stored via `security/EncryptedSessionManager.kt` using AndroidX **Security-Crypto** (`EncryptedSharedPreferences`). |
| `frontend/src/services/assets/assetService.ts`<br>`backend/Controllers/AssetController.cs` | Fetch assets, search, get by ID/QR, create, update, decommission, get audit history. | `data/api/AssetApiService.kt` and `data/repository/AssetRepository.kt`. |
| `frontend/src/services/evidence/evidenceService.ts`<br>`backend/Controllers/EvidenceController.cs` | Create draft, upload multipart media, submit for blockchain anchoring, fetch evidence list and details. | `data/api/EvidenceApiService.kt` and `data/repository/EvidenceRepository.kt`. |
| `frontend/src/services/verification/verificationService.ts`<br>`backend/Controllers/EvidenceController.cs` | Trigger live verification (`POST /api/evidence/{id}/verify`), get verification status, fetch audit trail. | `data/api/VerificationApiService.kt` and `data/repository/VerificationRepository.kt`. |
| `frontend/src/services/notification/notificationService.ts`<br>`backend/Controllers/NotificationController.cs` | Fetch notifications, get unread count, mark read, mark all read. | `data/api/NotificationApiService.kt` and `data/repository/NotificationRepository.kt`. |
| `backend/Controllers/MediaController.cs` | Streams images, videos, documents by storage path, hash, or media ID. Supports HTTP range processing. | Handled via **Coil** for image loading (`AsyncImage`) and **Media3 / ExoPlayer** for video playback with range headers. |

---

### B. Authentication & Session Management

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/context/AuthContext.tsx` | React context providing `user`, `role`, `login`, `logout`, `isAuthenticated`, and session restoration. | `ui/auth/AuthViewModel.kt` backed by `data/repository/AuthRepository.kt` exposing `StateFlow<AuthState>`. |
| `frontend/src/pages/auth/LoginPage.tsx` | Split-screen branding, email/password form, pre-filled demo role credentials, loading spinner, error banners. | `ui/auth/LoginScreen.kt` using Jetpack Compose with glassmorphic cards, text inputs with visual transformation for passwords, quick-fill role chips, and auth state observing. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard checking authentication and required role. | Jetpack Compose Navigation: `NavHost` role-aware graph routing via `NavigationActions.kt`. |

---

### C. Layout, Navigation & Shell

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/components/layout/AppLayout.tsx` | Master shell: sticky top header island, left sidebar on desktop, slide-over drawer on mobile, floating assistant. | `ui/layout/MainScaffold.kt`: Compose `Scaffold` with custom floating top app bar island (`IecTopAppBar.kt`), bottom navigation bar (`IecNavigationBar.kt`), and floating assistant button. |
| `frontend/src/components/layout/Header.tsx` | Hamburger menu toggle, IEC logo, live clock/status, notification bell with unread badge, user profile menu. | `ui/components/IecTopAppBar.kt`: Row with menu icon, brand badge, notification icon with unread badge badge count, and user avatar. |
| `frontend/src/components/layout/MobileNav.tsx` | Off-screen sliding drawer navigation for mobile devices. | `ModalNavigationDrawer` with `IecDrawerSheet.kt` displaying role-specific navigation destinations, active indicators, and logout. |
| `frontend/src/styles/globals.css` | Color palette (Steel Blue `#1E3A5F`, Amber `#E4B018`), typography, spacing, glassmorphism panel styles. | `ui/theme/Color.kt`, `ui/theme/Theme.kt`, `ui/theme/Type.kt`, and custom modifier `Modifier.glassPanel()` using `drawBehind` and surface overlays. |

---

### D. Dashboards (Role-Specific)

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/technician/dashboard/TechnicianDashboard.tsx` | Technician portal: 2x2 stat cards, quick "Capture Evidence" action, live clock, recent activity list, status badges. | `ui/dashboard/TechnicianDashboardScreen.kt`: Jetpack Compose with `LazyColumn`, 2x2 grid (`LazyVerticalGrid` or paired `Row`s) of `StatCard.kt`, and quick action cards. |
| `frontend/src/pages/manager/dashboard/ManagerDashboard.tsx` | Operations Manager portal: 2x2 operational stat cards (Assets, Total Evidence, Pending Verification, Verified Reports), pending verification alert banner, operational shortcuts. | `ui/dashboard/ManagerDashboardScreen.kt`: Compose layout with pending verification banner, 2x2 stat cards, recent evidence inspection links, and operational actions shortcut. |
| `frontend/src/pages/auditor/dashboard/AuditorDashboard.tsx` | Auditor portal: ledger integrity metrics, total verified records, chain height, verification audit log table. | `ui/dashboard/AuditorDashboardScreen.kt`: Metrics overview, integrity score card, filterable audit log stream. |
| `frontend/src/pages/admin/dashboard/AdminDashboard.tsx` | System Administrator portal: system user counts, asset distribution, pending user approvals, system audit logs. | `ui/dashboard/AdminDashboardScreen.kt`: System status cards, user management shortcut, system audit log inspector. |
| `frontend/src/components/dashboard/StatCard.tsx` | Reusable stat card with title, numeric value, icon, change indicator, and glass surface. | `ui/components/StatCard.kt`: Composable with `Modifier.glassPanel()`, icon container, bold headline, and subtitle. |
| `frontend/src/components/dashboard/RecentActivity.tsx` | List of recent evidence submissions with activity icons, timestamp, and status badges. | `ui/components/RecentActivityList.kt`: Composable rendering activity rows with relative time (`DateUtils.toRelativeTimeSpanString`). |

---

### E. Asset Management & QR Code System

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/assets/AssetsPage.tsx` | Searchable, paginated asset inventory, category/status filters, QR scan trigger, new asset creation (Manager/Admin). | `ui/assets/AssetListScreen.kt`: Compose `LazyColumn` with search bar (`DockedSearchBar` or `OutlinedTextField`), filter chips, FAB for QR scanner, and asset item cards. |
| `frontend/src/pages/assets/AssetDetailsPage.tsx` | Complete asset metadata, location, assigned technician, QR code display, asset evidence history tab. | `ui/assets/AssetDetailScreen.kt`: Displays asset tags, specs JSON, QR code display dialog, and child evidence list. |
| `frontend/src/pages/assets/AssetHistoryPage.tsx` | Audit log of asset status changes, reassignments, and maintenance events. | `ui/assets/AssetHistoryScreen.kt`: Chronological timeline of asset lifecycle events. |
| `frontend/src/components/qr/QRScanner.tsx`<br>`frontend/src/components/qr/QRScannerModal.tsx` | Live HTML5 video QR scanner, camera switcher, Torch toggle, manual asset code fallback. | `ui/qr/QrScannerScreen.kt`: **CameraX** with **Google Code Scanner API** or **ML Kit Barcode Scanning** (`BarcodeScannerOptions.FORMAT_QR_CODE`), live viewfinder overlay, torch toggle button. |
| `frontend/src/components/qr/QRCodeDisplay.tsx` | Renders QR code SVG/Canvas using asset's unique `QrIdentifier`. | `ui/qr/QrCodeView.kt`: Uses **ZXing Android Embedded** or custom QR bitmap generator to render the `QrIdentifier` bitmap with share/save capabilities. |

---

### F. Evidence Capture Workflow (Technician 7-Step Engine)

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/technician/evidence/CaptureEvidencePage.tsx` | Master 7-step wizard: <br>1. Select Asset<br>2. Confirm Asset<br>3. Activity & Description<br>4. Geolocation Acquisition<br>5. Live Camera Capture<br>6. Review Package<br>7. Confirm & Seal on Blockchain | `ui/evidence/capture/EvidenceCaptureFlowScreen.kt` managed by `EvidenceCaptureViewModel.kt` with step state machine: <br>`Step 1`: `SelectAssetStep.kt`<br>`Step 2`: `ConfirmAssetStep.kt`<br>`Step 3`: `SelectActivityStep.kt`<br>`Step 4`: `AcquireLocationStep.kt`<br>`Step 5`: `CameraCaptureStep.kt`<br>`Step 6`: `ReviewEvidenceStep.kt`<br>`Step 7`: `SubmittingEvidenceStep.kt` |
| `frontend/src/hooks/useCamera.ts`<br>`frontend/src/components/camera/CameraCapture.tsx` | Browser MediaDevices camera preview, photo snap, video record, camera switcher. | `CameraCaptureStep.kt`: Native **CameraX** implementation using `PreviewView`, `ImageCapture`, and `VideoCapture<Recorder>`. Direct capture to local cache file, no gallery upload allowed. |
| `frontend/src/hooks/useGeolocation.ts` | Browser Geolocation API fetching lat/lng/accuracy. | `location/LocationProvider.kt`: **Google Play Services Location** (`FusedLocationProviderClient`) requesting `Priority.PRIORITY_HIGH_ACCURACY`. Captures latitude, longitude, accuracy in meters. |
| `frontend/src/services/evidence/evidenceService.ts` | Step 1: `createEvidence`<br>Step 2: `uploadMedia`<br>Step 3: `submitEvidence` | `EvidenceCaptureViewModel.kt`: Executes sequential coroutine calls: <br>1. `evidenceRepository.createDraft(req)`<br>2. `evidenceRepository.uploadMedia(id, file)` (as `MultipartBody.Part`)<br>3. `evidenceRepository.submitEvidence(id)` |
| `frontend/src/pages/evidence/EvidenceDetailsPage.tsx` | Evidence view: metadata, media viewer, SHA-256 hash card, verification timeline, blockchain anchor details. | `ui/evidence/detail/EvidenceDetailScreen.kt`: Header with status badge, media carousel/player, cryptographic hash inspect sheet, and blockchain transaction card. |

---

### G. Verification Center & Manager Review

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/verification/VerificationPage.tsx` | Tabbed Verification Center (Pending Verification vs. Previously Verified), multi-step recalculation progress, hash comparison box, tampering alert, operational actions sheet. | `ui/verification/VerificationCenterScreen.kt` backed by `VerificationViewModel.kt`. Segmented tab control (`TabRow`), item list with status pills, and detail review bottom sheet. |
| `frontend/src/components/evidence/IntegrityVerificationBox.tsx` | Side-by-side calculated live hash vs. trusted ledger hash, cryptographic comparison visual. | `ui/verification/components/IntegrityVerificationCard.kt`: Shows live hash, ledger proof hash, and animated match/mismatch banner. |
| `frontend/src/components/evidence/TamperingAlertBox.tsx` | Red alert box when hash mismatch or disk file modification is detected. Distinguishes storage error vs genuine tampering. | `ui/verification/components/TamperingAlertBanner.kt`: Warning card explaining discrepancy reason (`FILE_TAMPERED`, `STORAGE_ERROR`, `MISMATCH`). |
| Manager Decision Actions in `VerificationPage.tsx` | Executes: `ESCALATE`, `REQUEST_RECAPTURE`, `ACKNOWLEDGE_MISMATCH`, `FLAG_STORAGE_ISSUE`. | `ui/verification/components/OperationalActionDialog.kt`: Modal sheet allowing Manager to choose action, enter justification reason, and post to `POST /api/evidence/{id}/action`. |
| `frontend/src/components/verification/VerificationTimeline.tsx` | Audit timeline showing capture $\rightarrow$ submission $\rightarrow$ blockchain anchor $\rightarrow$ manager verification. | `ui/verification/components/VerificationTimelineView.kt`: Vertical timeline composable with status nodes. |

---

### H. Blockchain Proof & Ledger Transparency

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/evidence/EvidenceDetailsPage.tsx`<br>`frontend/src/components/verification/VerificationResult.tsx` | Displays Hyperledger Fabric transaction ID, block height, channel name, anchored timestamp, Merkle root. | `ui/blockchain/BlockchainProofDialog.kt` or `ui/blockchain/BlockchainProofCard.kt`: Displays real proof data returned from `GET /api/evidence/{id}/verification`. Copy-to-clipboard for transaction ID and hashes. |

---

### I. Notification Center

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/components/notifications/NotificationCenter.tsx` | Floating popover or drawer: list of user notifications, unread count badge, type icons (Alert, Info, Success), click to navigate to related entity, "Mark read" button, "Mark all as read" button. | `ui/notifications/NotificationBottomSheet.kt` or `ui/notifications/NotificationScreen.kt`: Jetpack Compose modal bottom sheet displaying notifications, swipe-to-dismiss (or tap) to mark as read, and bulk mark-all-read action in header. |

---

### J. Role-Aware AI Assistant / Chatbot

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/components/assistant/AssistantLauncher.tsx` | Floating Memoji button in bottom right corner, pulsing unread dot, click to open chat. | `ui/assistant/FloatingAssistantLauncher.kt`: Floating Action Button with animated Memoji avatar. |
| `frontend/src/components/assistant/ChatWindow.tsx`<br>`frontend/src/components/assistant/AssistantHeader.tsx` | Chat dialog with Memoji header, message stream, suggested prompts, message composer integration. | `ui/assistant/AssistantBottomSheet.kt`: Bottom sheet containing chat messages, prompt suggestions, and text input field. |
| `frontend/src/components/assistant/AssistantMemoji.tsx`<br>`frontend/src/services/assistant/assistantIdentity.ts` | Dynamically renders avatar for current user role and switches expression based on emotion state (`idle`, `thinking`, `success`, `error`). | `ui/assistant/AssistantMemojiView.kt`: Composable rendering Memoji drawable resources (`R.drawable.memoji_technician_idle`, etc.) based on `AssistantEmotion` StateFlow. |
| `frontend/src/services/assistant/assistantService.ts` | Natural language parser, entity extraction (`EV-xxx`, `AST-xxx`), role-based answering, notification dispatch assistance. | `domain/assistant/AssistantProcessor.kt`: Kotlin service matching query patterns, resolving entity context, and providing smart suggestions. |

---

### K. User Profile & Administrative Screens

| Web Path | Web Purpose | Native Android Architecture Equivalent |
|:---|:---|:---|
| `frontend/src/pages/profile/ProfilePage.tsx` | Displays user role badge, username, email, full name. Allows updating FullName and Email (persisted to PostgreSQL). | `ui/profile/ProfileScreen.kt`: Jetpack Compose profile screen with role badge, edit form, and session sign-out button. |
| `frontend/src/pages/admin/AdminUsersPage.tsx`<br>`backend/Controllers/AdminController.cs` | Admin screen listing all users, role filter, approve/deactivate user switch (`PATCH /api/admin/users/{id}/status`). | `ui/admin/AdminUserManagementScreen.kt`: List of system accounts with status toggles. |
| `frontend/src/pages/admin/AdminAuditPage.tsx`<br>`backend/Controllers/AdminController.cs` | System audit log table displaying actor, action, timestamp, entity, and IP address. | `ui/admin/AdminAuditScreen.kt`: Paginated system audit log list with detail inspect dialog. |

---

## 3. Database Entity to Kotlin Data Class Mapping

| PostgreSQL Table (`iec_db`) | EF Core Entity (`backend/Models`) | Kotlin Data Model (`data/model`) | Key Fields & Types |
|:---|:---|:---|:---|
| `users` | `User.cs` | `User.kt` | `userId: UUID`, `username: String`, `email: String`, `fullName: String`, `isActive: Boolean`, `createdAt: Instant` |
| `roles` | `Role.cs` | `Role.kt` | `roleId: UUID`, `name: String` (`Technician`, `Manager`, `Auditor`, `Admin`) |
| `user_roles` | `UserRole.cs` | (mapped into user's role list) | Joint entity linking `userId` and `roleId` |
| `assets` | `Asset.cs` | `Asset.kt` | `assetId: UUID`, `name: String`, `assetCode: String`, `qrIdentifier: String` (UUID), `category: String`, `location: String?`, `status: AssetStatus`, `specifications: String` (JSON) |
| `evidence_records` | `EvidenceRecord.cs` | `EvidenceRecord.kt` | `evidenceId: UUID`, `assetId: UUID`, `userId: UUID`, `activityType: ActivityType`, `timestamp: Instant`, `latitude: Double?`, `longitude: Double?`, `description: String`, `evidenceHash: String?`, `anchorStatus: AnchorStatus`, `assignedManagerId: UUID?` |
| `evidence_media` | `EvidenceMedia.cs` | `EvidenceMedia.kt` | `mediaId: UUID`, `evidenceId: UUID`, `fileName: String`, `fileType: MediaFileType`, `storageUrl: String`, `fileSizeBytes: Long?`, `fileHash: String?` (SHA-256), `uploadedAt: Instant` |
| `blockchain_proofs` | `BlockchainProof.cs` | `BlockchainProof.kt` | `proofId: UUID`, `evidenceId: UUID`, `assetId: UUID`, `evidenceHash: String`, `transactionId: String`, `signerIdentity: String?`, `anchoredAt: Instant` |
| `notifications` | `Notification.cs` | `NotificationItem.kt` | `id: UUID`, `userId: UUID`, `type: String`, `title: String`, `message: String`, `isRead: Boolean`, `createdAt: Instant`, `entityType: String?`, `entityId: UUID?` |
| `audit_logs` | `AuditLog.cs` | `AuditLogEntry.kt` | `auditLogId: UUID`, `userId: UUID?`, `action: String`, `entityType: String?`, `entityId: String?`, `details: String?`, `ipAddress: String?`, `createdAt: Instant` |
| `refresh_tokens` | `RefreshToken.cs` | (managed securely in Android) | `token: String`, `expiresAt: Instant`, `isRevoked: Boolean` |

---

## 4. Key Enums Exact Representation

```kotlin
// data/model/enums/ActivityType.kt
enum class ActivityType {
    Maintenance,
    Inspection,
    Safety,
    Quality,
    Audit,
    Incident,
    SparePart,
    Transfer
}

// data/model/enums/AssetStatus.kt
enum class AssetStatus {
    Active,
    Inactive,
    Maintenance,
    Retired,
    Lost,
    Decommissioned
}

// data/model/enums/AnchorStatus.kt
enum class AnchorStatus {
    Pending,
    Anchored,
    Failed
}

// data/model/enums/MediaFileType.kt
enum class MediaFileType {
    Image,
    Video,
    Document
}

// data/model/enums/VerificationStatus.kt
enum class VerificationStatus {
    WAITING_FOR_VERIFICATION,
    VERIFIED,
    INTEGRITY_MISMATCH,
    STORAGE_ERROR,
    NOT_ANCHORED,
    FAILED
}
```
