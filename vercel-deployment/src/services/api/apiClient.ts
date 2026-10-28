import type { ApiResponse } from '@type-defs/api';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import { verificationService } from '@services/verification/verificationService';
import { authService } from '@services/auth/authService';
import { adminService } from '@services/admin/adminService';
import { notificationService } from '@services/notification/notificationService';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

class FirebaseApiClient {
  private authToken: string | null = null;
  private refreshTokenVal: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('access_token');
      this.refreshTokenVal = localStorage.getItem('refresh_token');
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.authToken = accessToken;
    this.refreshTokenVal = refreshToken;
  }

  clearTokens(): void {
    this.authToken = null;
    this.refreshTokenVal = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  async refreshAccessToken(): Promise<void> {
    await authService.refreshToken();
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    const params = new URLSearchParams(queryString);

    // 1. Auth routes
    if (cleanUrl === '/auth/me') {
      return (await authService.getCurrentUser()) as unknown as ApiResponse<T>;
    }

    // 2. Admin routes
    if (cleanUrl === '/admin/users') {
      const res = await adminService.getUsers();
      if (res.success && res.data) {
        return {
          success: true,
          data: { items: res.data, total: res.data.length } as unknown as T,
        };
      }
      return res as unknown as ApiResponse<T>;
    }
    if (cleanUrl === '/admin/audit') {
      const limitVal = Number(params.get('limit')) || 100;
      return (await adminService.getAuditLogs(limitVal)) as unknown as ApiResponse<T>;
    }

    // 3. Asset routes
    if (cleanUrl === '/assets') {
      const searchParams = {
        search: params.get('search') || undefined,
        category: (params.get('category') as any) || undefined,
        status: (params.get('status') as any) || undefined,
        page: Number(params.get('page')) || 1,
        pageSize: Number(params.get('pageSize')) || 50,
      };
      return (await assetService.getAssets(searchParams)) as unknown as ApiResponse<T>;
    }
    const assetHistoryMatch = cleanUrl.match(/^\/assets\/([^/]+)\/history$/);
    if (assetHistoryMatch) {
      return (await assetService.getAssetHistory(assetHistoryMatch[1])) as unknown as ApiResponse<T>;
    }
    const assetDetailMatch = cleanUrl.match(/^\/assets\/([^/]+)$/);
    if (assetDetailMatch) {
      return (await assetService.getAsset(assetDetailMatch[1])) as unknown as ApiResponse<T>;
    }

    // 4. Evidence routes
    if (cleanUrl === '/evidence') {
      const searchParams = {
        search: params.get('search') || undefined,
        assetId: params.get('assetId') || undefined,
        status: (params.get('status') as any) || undefined,
        userId: params.get('userId') || undefined,
        activityType: (params.get('activityType') as any) || undefined,
        page: Number(params.get('page')) || 1,
        pageSize: Number(params.get('pageSize')) || 100,
      };
      return (await evidenceService.getEvidenceList(searchParams)) as unknown as ApiResponse<T>;
    }
    const evMediaMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/media$/);
    if (evMediaMatch) {
      const evRes = await evidenceService.getEvidence(evMediaMatch[1]);
      if (evRes.success && evRes.data) {
        return {
          success: true,
          data: evRes.data.mediaReferences as unknown as T,
        };
      }
      return { success: true, data: [] as unknown as T };
    }
    const evAuditMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/audit-trail$/);
    if (evAuditMatch) {
      return (await verificationService.getAuditTrail(evAuditMatch[1])) as unknown as ApiResponse<T>;
    }
    const evVerificationMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/verification$/);
    if (evVerificationMatch) {
      return (await verificationService.verifyEvidence(evVerificationMatch[1])) as unknown as ApiResponse<T>;
    }
    const evStatusMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/verification-status$/);
    if (evStatusMatch) {
      return (await verificationService.getVerificationStatus(evStatusMatch[1])) as unknown as ApiResponse<T>;
    }
    const evProofMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/proof$/);
    if (evProofMatch) {
      return (await verificationService.getBlockchainProof(evProofMatch[1])) as unknown as ApiResponse<T>;
    }
    const evDetailMatch = cleanUrl.match(/^\/evidence\/([^/]+)$/);
    if (evDetailMatch) {
      return (await evidenceService.getEvidence(evDetailMatch[1])) as unknown as ApiResponse<T>;
    }

    // 5. Notifications
    if (cleanUrl === '/notifications') {
      const storedUser = localStorage.getItem('user');
      const userId = storedUser ? JSON.parse(storedUser).id : 'all';
      const notifs = await notificationService.syncRealEvents(userId);
      return { success: true, data: notifs as unknown as T };
    }

    return {
      success: true,
      data: {} as T,
    };
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];

    // Auth
    if (cleanUrl === '/auth/login') {
      return (await authService.login(data)) as unknown as ApiResponse<T>;
    }
    if (cleanUrl === '/auth/register') {
      return (await authService.register(data)) as unknown as ApiResponse<T>;
    }
    if (cleanUrl === '/auth/logout') {
      await authService.logout();
      return { success: true, data: { message: 'Logged out' } as unknown as T };
    }

    // Evidence
    if (cleanUrl === '/evidence') {
      return (await evidenceService.createEvidence(data)) as unknown as ApiResponse<T>;
    }
    const evSubmitMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/submit$/);
    if (evSubmitMatch) {
      return (await evidenceService.submitEvidence(evSubmitMatch[1])) as unknown as ApiResponse<T>;
    }
    const evAnchorMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/anchor$/);
    if (evAnchorMatch) {
      return (await evidenceService.anchorEvidence(evAnchorMatch[1])) as unknown as ApiResponse<T>;
    }
    const evVerifyMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/verify$/);
    if (evVerifyMatch) {
      return (await evidenceService.verifyEvidence(evVerifyMatch[1])) as unknown as ApiResponse<T>;
    }
    const evActionMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/action$/);
    if (evActionMatch) {
      const evId = evActionMatch[1];
      const rawAction = String(data?.action || '').toUpperCase();
      const reason = data?.reason || data?.notes || `Operational action ${rawAction} recorded by Manager`;
      const now = new Date().toISOString();

      let storedUser: any = null;
      try {
        const raw = localStorage.getItem('user');
        if (raw) storedUser = JSON.parse(raw);
      } catch {}

      try {
        let newStatus = 'Verified';
        let newVerifStatus = 'Approved';

        if (rawAction === 'ESCALATE') {
          newStatus = 'Escalated';
          newVerifStatus = 'ESCALATED';
        } else if (rawAction === 'REQUEST_RECAPTURE') {
          newStatus = 'Recapture_Requested';
          newVerifStatus = 'RECAPTURE_REQUESTED';
        } else if (rawAction === 'ACKNOWLEDGE_MISMATCH') {
          newStatus = 'Mismatch_Acknowledged';
          newVerifStatus = 'ACKNOWLEDGED';
        } else if (rawAction === 'FLAG_STORAGE_ISSUE') {
          newStatus = 'Storage_Flagged';
          newVerifStatus = 'STORAGE_FLAGGED';
        } else if (rawAction === 'REJECT') {
          newStatus = 'Failed';
          newVerifStatus = 'Rejected';
        }

        await updateDoc(doc(db, 'evidence', evId), {
          verificationStatus: newVerifStatus,
          status: newStatus,
          verifiedAt: now,
          verifiedBy: storedUser?.fullName || storedUser?.username || 'Facility Manager',
          decisionNotes: reason,
          updatedAt: now,
        });

        // 1. Create real Audit Trail log in Firestore
        const auditLogId = crypto.randomUUID();
        await setDoc(doc(db, 'audit_logs', auditLogId), {
          id: auditLogId,
          audit_log_id: auditLogId,
          userId: storedUser?.id || 'system',
          action: `OPERATIONAL_ACTION_${rawAction}`,
          entityType: 'evidence',
          entityId: evId,
          details: { action: rawAction, reason, actor: storedUser?.fullName || 'Manager' },
          ipAddress: '127.0.0.1',
          createdAt: now,
        });

        // 2. Dispatch real Notification in Firestore
        await notificationService.sendNotification({
          recipientId: 'all',
          senderId: storedUser?.id || 'manager',
          senderName: storedUser?.fullName || 'Facility Manager',
          title: `Evidence ${rawAction.replace(/_/g, ' ')}`,
          message: `Record ${evId.slice(0, 8)}: ${reason}`,
          type: rawAction === 'ESCALATE' ? 'alert' : rawAction === 'REQUEST_RECAPTURE' ? 'message' : 'info',
          relatedEntity: 'evidence',
          relatedEntityId: evId,
          actionUrl: `/evidence/${evId}`,
        });

        return { success: true, data: { success: true } as unknown as T };
      } catch (err: any) {
        return { success: false, error: { code: 'ACTION_FAILED', message: err.message, statusCode: 500 } };
      }
    }
    if (cleanUrl === '/evidence/batch-verify') {
      return (await verificationService.batchVerify(data)) as unknown as ApiResponse<T>;
    }

    // Assets
    if (cleanUrl === '/assets') {
      return (await assetService.createAsset(data)) as unknown as ApiResponse<T>;
    }

    // Admin
    if (cleanUrl === '/admin/users') {
      return (await adminService.addUser(data)) as unknown as ApiResponse<T>;
    }

    return {
      success: true,
      data: {} as T,
    };
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];
    const assetMatch = cleanUrl.match(/^\/assets\/([^/]+)$/);
    if (assetMatch) {
      return (await assetService.updateAsset(assetMatch[1], data)) as unknown as ApiResponse<T>;
    }
    return { success: true, data: {} as T };
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];

    const notifReadMatch = cleanUrl.match(/^\/notifications\/([^/]+)\/read$/);
    if (notifReadMatch) {
      await notificationService.markAsRead(notifReadMatch[1]);
      return { success: true, data: {} as T };
    }
    if (cleanUrl === '/notifications/read-all') {
      const storedUser = localStorage.getItem('user');
      const userId = storedUser ? JSON.parse(storedUser).id : '';
      await notificationService.markAllAsRead(userId);
      return { success: true, data: {} as T };
    }

    const adminStatusMatch = cleanUrl.match(/^\/admin\/users\/([^/]+)\/status$/);
    if (adminStatusMatch) {
      return (await adminService.updateUserStatus(adminStatusMatch[1], data.status)) as unknown as ApiResponse<T>;
    }
    const adminUserMatch = cleanUrl.match(/^\/admin\/users\/([^/]+)$/);
    if (adminUserMatch) {
      return (await adminService.updateUser(adminUserMatch[1], data)) as unknown as ApiResponse<T>;
    }

    return { success: true, data: {} as T };
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];
    const assetMatch = cleanUrl.match(/^\/assets\/([^/]+)$/);
    if (assetMatch) {
      return (await assetService.deleteAsset(assetMatch[1])) as unknown as ApiResponse<T>;
    }
    return { success: true, data: {} as T };
  }

  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const cleanUrl = url.split('?')[0];
    const evMediaMatch = cleanUrl.match(/^\/evidence\/([^/]+)\/media$/);
    if (evMediaMatch) {
      const files: File[] = [];
      const fileEntry = formData.get('file');
      if (fileEntry instanceof File) {
        files.push(fileEntry);
      }
      return (await evidenceService.uploadMedia(evMediaMatch[1], files, onProgress)) as unknown as ApiResponse<T>;
    }
    return { success: true, data: {} as T };
  }
}

export const apiClient = new FirebaseApiClient();

export function isMockMode(): boolean {
  return false;
}
