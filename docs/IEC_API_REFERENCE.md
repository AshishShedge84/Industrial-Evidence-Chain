# Industrial Evidence Chain (IEC) — Complete REST API Reference

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Base URL:** `http://localhost:5000/api` (proxied via Vite frontend at `https://localhost:3000/api`)  
**Envelope Format:** All application API responses are wrapped in the standard `ApiResponse<T>` envelope.  

---

## 1. Response Envelope Format

All ASP.NET Core endpoints return responses wrapped in this consistent structure:

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "requestId": "0HN7B6GQ9G8..."
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Asset with ID '...' does not exist.",
    "statusCode": 400,
    "traceId": "0HN7B6GQ9G8..."
  },
  "requestId": "0HN7B6GQ9G8..."
}
```

---

## 2. Complete Endpoints Reference Table

| Feature Area | Method | Endpoint | Request Body DTO | Response Data DTO | Authorization Rule | Database & Business Effect |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | `LoginRequestDto`<br>`{ usernameOrEmail, password }` | `LoginResponseDto`<br>`{ user, accessToken, refreshToken, expiresIn }` | Anonymous | Verifies PBKDF2 hash, issues JWT access token (60 min) and saves hashed refresh token in `refresh_tokens`. |
| **Auth** | `POST` | `/api/auth/register` | `RegisterRequestDto`<br>`{ username, email, password, fullName, requestedRole }` | `RegisterResponseDto`<br>`{ userId, username, email, isPendingApproval, message }` | Anonymous | Inserts inactive user into `users` (`is_active = false`), assigns role, and awaits Admin approval. |
| **Auth** | `GET` | `/api/auth/me` | None | `AuthUserDto`<br>`{ id, username, email, fullName, role, isActive }` | `Authorize` (Any valid JWT) | Reads current user profile from PostgreSQL matching `sub` claim. |
| **Auth** | `POST` | `/api/auth/refresh` | `RefreshTokenRequestDto`<br>`{ refreshToken }` | `RefreshTokenResponseDto`<br>`{ accessToken, refreshToken, expiresIn }` | Anonymous | Validates refresh token, detects replay attacks, revokes old token, issues new token pair in `refresh_tokens`. |
| **Auth** | `PATCH`<br>`PUT` | `/api/auth/profile` | `UpdateProfileRequestDto`<br>`{ email, fullName, bio, avatarUrl, ... }` | `AuthUserDto` | `Authorize` (Any valid JWT) | Updates `email` and `full_name` in `users`. Logs `action = 'ProfileUpdated'` in `audit_logs`. |
| **Users** | `PATCH`<br>`PUT` | `/api/users/{id:guid}` | `UpdateProfileRequestDto`<br>`{ email, fullName }` | `AuthUserDto` | `Authorize` (Caller must match `{id}`) | Updates user profile for self only; rejects modifications to other accounts with 403 Forbidden. |
| **Assets** | `GET` | `/api/assets` | Query: `query`, `category`, `status`, `assignedTo`, `page`, `pageSize` | `PagedResult<AssetDto>`<br>`{ items, total, page, pageSize }` | `Authorize` (Any valid JWT) | Queries `assets` table with case-insensitive search matching `asset_code`, `qr_identifier`, `name`, `description`. |
| **Assets** | `GET` | `/api/assets/{id:guid}` | None (Path GUID or QR Identifier) | `AssetDto` | `Authorize` (Any valid JWT) | Resolves asset by matching either `asset_id == id` OR `qr_identifier == id`. |
| **Assets** | `POST` | `/api/assets` | `CreateAssetRequestDto`<br>`{ assetTag, name, description, category, location, assignedTo }` | `AssetDto` | `RequireManager`<br>(Manager, Admin) | Generates unique `qr_identifier` GUID, persists new asset, assigns to user, dispatches `AssetAssigned` notification. |
| **Assets** | `PUT` | `/api/assets/{id:guid}` | `UpdateAssetRequestDto`<br>`{ name, description, category, status, location, assignedTo }` | `AssetDto` | `RequireManager`<br>(Manager, Admin) | Updates asset metadata; if status changes, logs `action = 'StatusChanged'` in `audit_logs`. |
| **Assets** | `DELETE`| `/api/assets/{id:guid}` | None | `AssetDto` | `RequireAdmin`<br>(Admin only) | Soft-decommissions asset (`status = 'Decommissioned'`). Preserves all historical records, evidence, and proofs. |
| **Assets** | `GET` | `/api/assets/{id:guid}/history` | None | `IReadOnlyList<AssetHistoryDto>` | `Authorize` (Any valid JWT) | Reads lifecycle audit events from `audit_logs` where `entity_type = 'Asset'`. |
| **Assets** | `GET` | `/api/assets/{assetId:guid}/evidence`| Query: `page`, `pageSize` | `PagedResult<EvidenceDto>` | `Authorize` (Any valid JWT) | Lists all evidence records associated with the specified asset. |
| **Evidence** | `POST` | `/api/evidence` | `CreateEvidenceRequestDto`<br>`{ assetId, activityType, timestamp, latitude, longitude, description, location }` | `EvidenceDto` | `RequireEvidenceCreator`<br>(Tech, Manager, Admin) | Inserts draft evidence (`anchor_status = 'Pending'`), logs `EvidenceCreated`, notifies assigned manager (`VerificationRequest`). |
| **Evidence** | `GET` | `/api/evidence` | Query: `assetId`, `userId`, `assignedManagerId`, `activityType`, `status`, `verificationStatus`, `fromDate`, `toDate`, `query` | `PagedResult<EvidenceDto>` | `Authorize` (Any valid JWT) | Queries `evidence_records`. For Managers, automatically scopes to records where `assigned_manager_id == currentUserId`. Masks hash for Techs. |
| **Evidence** | `GET` | `/api/evidence/{id:guid}` | None | `EvidenceDto` | `Authorize` (Any valid JWT) | Retrieves full evidence detail including media files, assigned manager, and verification status. Masks hash for Techs. |
| **Evidence** | `GET` | `/api/evidence/{id:guid}/media` | None | `IReadOnlyList<EvidenceMediaDto>` | `Authorize` (Any valid JWT) | Returns list of media attachments and their binary SHA-256 hashes (`file_hash`). |
| **Evidence** | `POST` | `/api/evidence/{id:guid}/media`<br>`/api/evidence/{id:guid}/upload` | `multipart/form-data`<br>`file` (IFormFile) | `EvidenceMediaDto`<br>`{ mediaId, evidenceId, fileName, fileType, storageUrl, fileHash, fileSizeBytes }` | `RequireEvidenceCreator`<br>(Tech, Manager, Admin) | Streams file to `Uploaded Media/`, computes live SHA-256 during write, inserts row in `evidence_media`, logs `MediaAttached`. Rejects if already anchored. |
| **Evidence** | `POST` | `/api/evidence/{id:guid}/submit` | None | `EvidenceDto` | `RequireEvidenceCreator`<br>(Tech, Manager, Admin) | Gathers media hashes, runs RFC 8785 JCS canonicalization, computes SHA-256, anchors to Hyperledger Fabric, inserts `blockchain_proofs`, logs `EvidenceSubmitted`. |
| **Evidence** | `GET` | `/api/evidence/{id:guid}/verification`| None | `EvidenceVerificationResponseDto`<br>`{ evidenceId, calculatedHash, trustedHash, isValid, status, transactionId }` | `Authorize` (Any valid JWT) | Returns existing verification status and transaction proof without triggering a new disk re-read. |
| **Evidence** | `POST` | `/api/evidence/{id:guid}/verify`<br>Alias: `/api/verification/{id:guid}` | None | `EvidenceVerificationResponseDto`<br>`{ evidenceId, calculatedHash, trustedHash, isValid, status, transactionId, error }` | `Manager,Auditor,Admin` | Re-reads physical files from disk, recomputes live binary SHA-256, checks for tampering, recomputes canonical hash, verifies ledger proof, logs `EvidenceVerified`, notifies technician. |
| **Evidence** | `POST` | `/api/evidence/{id:guid}/action` | `OperationalActionRequestDto`<br>`{ action, reason }`<br>(Actions: `ESCALATE`, `REQUEST_RECAPTURE`, `ACKNOWLEDGE_MISMATCH`, `FLAG_STORAGE_ISSUE`) | `bool` | `Manager,Admin` | Logs manager decision in `audit_logs` (`EvidenceEscalated`, `EvidenceRecaptureRequested`, `EvidenceMismatchAcknowledged`, `EvidenceStorageIssueFlagged`). |
| **Evidence** | `GET` | `/api/evidence/{id:guid}/audit-trail` | None | `IReadOnlyList<AuditTrailEntryDto>` | `Authorize` (Any valid JWT) | Returns complete timeline of audit events for this evidence record from `audit_logs`. |
| **Media** | `GET` | `/api/media/{*storagePath}` | Path: relative storage path or 64-char hex hash | Binary File Stream | Anonymous | Serves file from `Uploaded Media/` with path traversal protection and HTTP byte-range processing (`Accept-Ranges: bytes`) for mobile video playback. |
| **Media** | `GET` | `/api/media/hash/{hash}` | Path: 64-char SHA-256 | Binary File Stream | Anonymous | Looks up `evidence_media` by `file_hash` and streams matching physical file. |
| **Media** | `GET` | `/api/media/id/{mediaId:guid}` | Path: Media GUID | Binary File Stream | Anonymous | Looks up `evidence_media` by `media_id` and streams matching physical file. |
| **Notifications** | `GET` | `/api/notifications` | None | `List<NotificationDto>` | `Authorize` (Any valid JWT) | Lists all notifications addressed to the caller's `userId`. |
| **Notifications** | `GET` | `/api/notifications/unread-count` | None | `int` | `Authorize` (Any valid JWT) | Returns count of notifications where `is_read = false` for the caller. |
| **Notifications** | `PATCH` | `/api/notifications/{id:guid}/read` | None | `bool` | `Authorize` (Any valid JWT) | Marks specified notification as read (`is_read = true`, `read_at = CURRENT_TIMESTAMP`). |
| **Notifications** | `PATCH` | `/api/notifications/read-all` | None | `bool` | `Authorize` (Any valid JWT) | Marks all notifications for caller as read. |
| **Admin** | `GET` | `/api/admin/users` | None | `IEnumerable<UserDto>` | `RequireAdmin`<br>(Admin only) | Lists all registered users, roles, and `isActive` approval statuses. |
| **Admin** | `PATCH` | `/api/admin/users/{id:guid}/status` | `UpdateUserStatusDto`<br>`{ isActive }` | `UserDto` | `RequireAdmin`<br>(Admin only) | Approves (activates) or deactivates user account. Logs `action = 'UserStatusUpdated'`. |
| **Admin** | `GET` | `/api/admin/audit` | Query: `limit` (default 100) | `IEnumerable<AdminAuditLogDto>` | `RequireAdmin`<br>(Admin only) | Reads system-wide audit logs with username and email of performers. |
| **Health** | `GET` | `/health` | None | `{ status, database, port, db }` | Anonymous | Tests PostgreSQL connectivity via `db.Database.CanConnectAsync()`. Returns 200 OK or 503 Service Unavailable. |

---

## 3. Blockchain Adapter Microservice Endpoints (Port 5050)

The companion Node.js blockchain microservice (`blockchain/src/server.ts`) runs on port 5050:

| Method | Endpoint | Request Payload | Response Payload | Description |
| :---: | :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | `{ isConnected: boolean, details: { network, channel, chaincode, adapterMode } }` | Checks gateway / mock stub readiness. |
| `POST` | `/api/blockchain/anchor` | `{ evidenceId, assetId, evidenceHash, timestamp, signerReference }` | `{ transactionId, status, proofReference, anchoredAt, error }` | Commits evidence proof to Hyperledger Fabric state. |
| `POST` | `/api/blockchain/verify` | `{ evidenceId, calculatedHash }` | `{ evidenceId, calculatedHash, trustedHash, isValid, status, transactionId, anchoredAt, error }` | Compares calculated hash with on-ledger proof state. |
| `GET` | `/api/blockchain/proof/:id` | None | `EvidenceProof` object | Retrieves raw on-ledger proof by `evidenceId`. |

---

## 4. DB Preview Diagnostic Endpoints (Port 3002)

The read-only database preview server (`tools/db-preview/server.js`) runs strictly on `127.0.0.1:3002`:

| Method | Endpoint | Description | Security |
| :---: | :--- | :--- | :--- |
| `GET` | `/` | Web UI dashboard displaying PostgreSQL tables and record counts. | Localhost only. |
| `GET` | `/api/status` | Returns `{ status: "ok", port: 5433, db: "iec_db", tables: [...] }`. | Localhost only. |
| `GET` | `/api/tables` | Lists all public PostgreSQL tables with row counts. | Localhost only. |
| `GET` | `/api/table/:name` | Paginated query of table rows. Redacts `password_hash`, `token_hash`, `tokens`. | Read-only. Redacted columns. |

