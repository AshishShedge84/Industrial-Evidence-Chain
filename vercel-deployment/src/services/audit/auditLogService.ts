/**
 * Industrial Evidence Chain (IEC) - System Audit Log Service
 * 
 * Fetches authoritative, immutable system audit logs directly from Cloud Firestore,
 * resolves actor names and roles against the authorized user registry, generates safe
 * human-readable event descriptions, and extracts audit metrics dynamically.
 */

import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SEEDED_USERS } from '@/data/authoritativeSeed';
import type { ApiResponse } from '@type-defs/api';

export interface SystemAuditRecord {
  id: string;
  timestamp: string; // ISO 8601 string
  rawTimestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  referenceId: string;
  referenceType?: 'evidence' | 'asset' | 'user' | 'media' | 'system';
  userId?: string;
  actorName: string;
  actorRole: string;
  actorEmail?: string;
  ipAddress?: string;
  status: string;
  description: string;
  details: Record<string, any>;
}

export interface AuditSummaryMetrics {
  totalEvents: number;
  evidenceVerifications: number;
  userActivity: number;
  assetEvidenceOperations: number;
}

/**
 * Remove sensitive credentials from audit details
 */
function sanitizeDetails(details: any): Record<string, any> {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
    'accesstoken',
    'secret',
    'clientsecret',
    'privatekey',
    'credential',
    'authorization',
  ];

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      cleaned[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = sanitizeDetails(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Parse a raw timestamp from Firestore into a valid ISO string.
 * Supports strings like "2026-09-11 17:38:05.798851+05:30", Firestore Timestamps, and ISO strings.
 */
function parseTimestamp(raw: any): { iso: string; raw: string } {
  if (!raw) {
    const now = new Date().toISOString();
    return { iso: now, raw: now };
  }

  // Firestore Timestamp with toDate() or seconds
  if (typeof raw === 'object' && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return { iso: d.toISOString(), raw: d.toISOString() };
  }
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    const d = new Date(raw.seconds * 1000);
    return { iso: d.toISOString(), raw: d.toISOString() };
  }

  const rawStr = String(raw).trim();
  // Handle space between date and time: "2026-09-11 17:38:05.798851+05:30"
  const normalizedStr = rawStr.includes(' ') && !rawStr.includes('T')
    ? rawStr.replace(' ', 'T')
    : rawStr;

  const parsed = new Date(normalizedStr);
  if (!isNaN(parsed.getTime())) {
    return { iso: parsed.toISOString(), raw: rawStr };
  }

  return { iso: rawStr, raw: rawStr };
}

/**
 * Construct safe, human-readable description for an audit event
 */
function generateSafeDescription(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>
): string {
  const d = details || {};
  const evRef = d.evidenceId || (entityType === 'EvidenceRecord' ? entityId : '');
  const assetRef = d.assetId || (entityType === 'Asset' ? entityId : '');

  switch (action) {
    case 'EvidenceCreated':
      return `Evidence ${evRef ? evRef.slice(0, 8) + '...' : ''} recorded for asset ${assetRef ? assetRef.slice(0, 8) + '...' : 'N/A'}${
        d.activityType ? ` (${d.activityType})` : ''
      }`;

    case 'EvidenceVerified':
      return `Evidence ${evRef ? evRef.slice(0, 8) + '...' : ''} verified against blockchain ledger${
        d.transactionId ? ` (Tx: ${String(d.transactionId).slice(0, 10)}...)` : ''
      }`;

    case 'EvidenceSubmitted':
      return `Evidence ${evRef ? evRef.slice(0, 8) + '...' : ''} submitted for compliance review and ledger anchoring`;

    case 'MediaAttached':
      return `Media attachment ${d.fileName || d.fileType || ''} secured and hashed for evidence ${
        evRef ? evRef.slice(0, 8) + '...' : entityId.slice(0, 8) + '...'
      }`;

    case 'USER_PROFILE_UPDATED':
      return d.raw || `User profile updated for user ${entityId.slice(0, 8)}...`;

    case 'Updated':
      if (entityType === 'Asset') {
        if (d.previousStatus && d.newStatus) {
          return `Asset status changed from ${d.previousStatus} to ${d.newStatus}`;
        }
        return `Asset ${entityId.slice(0, 8)}... updated`;
      }
      return `${entityType} ${entityId.slice(0, 8)}... updated`;

    case 'Created':
      if (entityType === 'Asset') {
        return `Asset ${d.name || entityId.slice(0, 8) + '...'} registered in catalog`;
      }
      return `${entityType} ${entityId.slice(0, 8)}... created`;

    default:
      if (action.startsWith('OPERATIONAL_ACTION_')) {
        const op = action.replace('OPERATIONAL_ACTION_', '');
        return `Manager operation ${op} executed on ${entityType} ${entityId.slice(0, 8)}...`;
      }
      return `${action} event performed on ${entityType || 'record'} (${entityId ? entityId.slice(0, 8) + '...' : 'system'})`;
  }
}

/**
 * Determine the status/result string of an audit event
 */
function extractStatus(details: Record<string, any>, action: string): string {
  if (details.verificationStatus) {
    return String(details.verificationStatus);
  }
  if (details.status) {
    return String(details.status);
  }
  if (details.newStatus) {
    return String(details.newStatus);
  }
  if (details.isValid === true) {
    return 'Verified';
  }
  if (details.isValid === false) {
    return 'Failed';
  }
  if (action === 'EvidenceVerified') {
    return 'Verified';
  }
  if (action === 'EvidenceCreated' || action === 'EvidenceSubmitted') {
    return 'Pending';
  }
  return 'Success';
}

class AuditLogService {
  private userCache: Map<string, { name: string; role: string; email: string }> = new Map();
  private userCacheInitialized = false;

  /**
   * Preload authorized users from Firestore to resolve user IDs to human-readable names and roles
   */
  private async loadUserDirectory(): Promise<void> {
    if (this.userCacheInitialized) return;

    // Seeded fallbacks
    for (const u of SEEDED_USERS) {
      const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email;
      const role = u.role || 'User';
      const info = { name, role, email: u.email || '' };
      if (u.id) this.userCache.set(u.id, info);
      if (u.email) this.userCache.set(u.email, info);
    }

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((docSnap) => {
        const u = docSnap.data();
        const name =
          u.fullName ||
          (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null) ||
          u.displayName ||
          u.username ||
          u.email ||
          'Authorized User';

        const role = u.role || 'User';
        const info = { name, role, email: u.email || '' };

        this.userCache.set(docSnap.id, info);
        if (u.id) this.userCache.set(u.id, info);
        if (u.email) this.userCache.set(u.email, info);
        if (u.userId) this.userCache.set(u.userId, info);
      });
      this.userCacheInitialized = true;
    } catch (err) {
      console.warn('Could not load full user directory for audit log resolution:', err);
    }
  }

  /**
   * Fetch system audit records from Firestore
   */
  public async getSystemAuditRecords(options?: {
    limitCount?: number;
    forceRefresh?: boolean;
  }): Promise<ApiResponse<SystemAuditRecord[]>> {
    try {
      if (options?.forceRefresh) {
        this.userCacheInitialized = false;
      }
      await this.loadUserDirectory();

      const logsRef = collection(db, 'audit_logs');
      let snap;
      try {
        if (options?.limitCount) {
          snap = await getDocs(query(logsRef, firestoreLimit(options.limitCount)));
        } else {
          snap = await getDocs(logsRef);
        }
      } catch (err: any) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: err.message || 'Failed to retrieve system audit records from database.',
            statusCode: 500,
          },
        };
      }

      const records: SystemAuditRecord[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const id = data.id || data.audit_log_id || docSnap.id;
        const userId = data.userId || data.user_id || '';
        const rawTime = data.createdAt || data.created_at || data.performedAt || data.timestamp;
        const { iso: timestamp, raw: rawTimestamp } = parseTimestamp(rawTime);

        // Resolve actor name & role
        const cachedUser = userId ? this.userCache.get(userId) : undefined;
        let actorName: string;
        let actorRole: string;
        let actorEmail: string | undefined;

        if (cachedUser) {
          actorName = cachedUser.name;
          actorRole = cachedUser.role;
          actorEmail = cachedUser.email;
        } else if (data.performedBy && typeof data.performedBy === 'string' && !data.performedBy.includes('-')) {
          // performedBy is already a human string like "Sarah Connor (Manager)" or "Admin User"
          actorName = data.performedBy;
          if (data.performedBy.toLowerCase().includes('manager')) actorRole = 'Manager';
          else if (data.performedBy.toLowerCase().includes('admin')) actorRole = 'Admin';
          else if (data.performedBy.toLowerCase().includes('auditor')) actorRole = 'Auditor';
          else if (data.performedBy.toLowerCase().includes('technician')) actorRole = 'Technician';
          else actorRole = 'Authorized User';
        } else if (userId === 'system' || userId === 'System' || !userId) {
          actorName = 'System Automation';
          actorRole = 'System';
        } else {
          // Fallback with partial user ID
          actorName = `User ${userId.slice(0, 8)}...`;
          actorRole = 'User';
        }

        const action = data.action || data.actionType || 'UnknownAction';
        const entityType = data.entityType || data.entity_type || 'System';
        const entityId = data.entityId || data.entity_id || '';
        const details = sanitizeDetails(data.details);

        // Determine reference ID and type
        let referenceId = entityId;
        let referenceType: SystemAuditRecord['referenceType'] = 'system';
        if (entityType === 'EvidenceRecord' || details.evidenceId) {
          referenceId = details.evidenceId || entityId;
          referenceType = 'evidence';
        } else if (entityType === 'Asset' || details.assetId) {
          referenceId = details.assetId || entityId;
          referenceType = 'asset';
        } else if (entityType === 'EvidenceMedia' || details.mediaId) {
          referenceId = details.mediaId || details.evidenceId || entityId;
          referenceType = 'media';
        } else if (entityType === 'User') {
          referenceId = entityId;
          referenceType = 'user';
        }

        const ipAddress = data.ipAddress || data.ip_address || '127.0.0.1';
        const status = extractStatus(details, action);
        const description = generateSafeDescription(action, entityType, entityId, details);

        records.push({
          id,
          timestamp,
          rawTimestamp,
          action,
          entityType,
          entityId,
          referenceId,
          referenceType,
          userId,
          actorName,
          actorRole,
          actorEmail,
          ipAddress,
          status,
          description,
          details,
        });
      });

      // Sort descending: newest events first
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        success: true,
        data: records,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'AUDIT_SERVICE_ERROR',
          message: error.message || 'An error occurred while fetching system audit reports.',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Calculate summary metrics from audit records
   */
  public calculateSummaryMetrics(records: SystemAuditRecord[]): AuditSummaryMetrics {
    let verifications = 0;
    let userActivity = 0;
    let assetEvidenceOps = 0;

    for (const r of records) {
      const act = r.action.toLowerCase();
      const ent = r.entityType.toLowerCase();

      // Verification activity
      if (act.includes('verif') || act.includes('anchor')) {
        verifications++;
      }

      // User activity
      if (ent === 'user' || act.includes('user') || act.includes('profile') || act.includes('role')) {
        userActivity++;
      }

      // Asset & evidence operations
      if (
        ent === 'asset' ||
        ent === 'evidencerecord' ||
        ent === 'evidencemedia' ||
        act.includes('evidence') ||
        act.includes('asset') ||
        act.includes('media')
      ) {
        assetEvidenceOps++;
      }
    }

    return {
      totalEvents: records.length,
      evidenceVerifications: verifications,
      userActivity,
      assetEvidenceOperations: assetEvidenceOps,
    };
  }
}

export const auditLogService = new AuditLogService();
