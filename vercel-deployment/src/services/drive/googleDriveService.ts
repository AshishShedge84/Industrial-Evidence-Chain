import type { ApiResponse } from '@type-defs/api';

export interface DriveFolderStatus {
  id: string;
  name?: string;
  accessible: boolean;
  error?: string;
  scopeNotice?: string;
}

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  scope: string;
  accountEmail?: string;
  connectedAt?: string;
  folders: {
    root: DriveFolderStatus;
    photos: DriveFolderStatus;
    videos: DriveFolderStatus;
  };
  requiredFolders: {
    rootFolderId: string;
    photoFolderId: string;
    videoFolderId: string;
  };
  setupStatus: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasRefreshToken: boolean;
    redirectUri: string;
  };
}

export interface DriveUploadResponse {
  fileId: string;
  fileName: string;
  folderId: string;
  size: number;
  checksum: string;
  mimeType: string;
  uploadedAt: string;
  evidenceId?: string;
  fileType: 'photo' | 'video';
}

class GoogleDriveService {
  /**
   * Fetch current Google Drive integration and folder accessibility status
   */
  async getStatus(): Promise<ApiResponse<GoogleDriveStatus>> {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/integrations/google-drive/status', { headers });
      if (!res.ok) {
        throw new Error(`Failed to check Drive status (HTTP ${res.status})`);
      }
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DRIVE_STATUS_ERROR',
          message: err.message || 'Unable to communicate with Drive status endpoint',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Initiate Google OAuth flow by redirecting to server-side start endpoint
   */
  startOAuthFlow(returnTo = '/settings') {
    const targetUrl = `/api/integrations/google-drive/oauth/start?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = targetUrl;
  }

  /**
   * Disconnect Google Drive integration server-side
   */
  async disconnect(): Promise<ApiResponse<{ message: string }>> {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/integrations/google-drive/disconnect', {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DRIVE_DISCONNECT_ERROR',
          message: err.message || 'Failed to disconnect Drive',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Upload evidence media file directly to Google Drive via server endpoint
   */
  async uploadMedia(params: {
    file: File;
    evidenceId?: string;
    fileType?: 'photo' | 'video';
    clientChecksum?: string;
  }): Promise<ApiResponse<DriveUploadResponse>> {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Convert file to Base64 payload for reliable serverless delivery
      const arrayBuffer = await params.file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const payload = {
        evidenceId: params.evidenceId,
        fileName: params.file.name,
        fileType: params.fileType || (params.file.type.startsWith('video/') ? 'video' : 'photo'),
        mimeType: params.file.type || 'application/octet-stream',
        fileBase64: base64,
        clientChecksum: params.clientChecksum,
      };

      headers['Content-Type'] = 'application/json';

      const res = await fetch('/api/integrations/google-drive/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DRIVE_UPLOAD_ERROR',
          message: err.message || 'Failed to upload media to Google Drive',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Formats an authorized proxy URL for an uploaded Google Drive evidence file
   */
  getFileProxyUrl(fileId: string): string {
    return `/api/integrations/google-drive/file?fileId=${encodeURIComponent(fileId)}`;
  }
}

export const googleDriveService = new GoogleDriveService();

