import type { ApiResponse } from '@type-defs/api';
import { auth } from '@/config/firebase';

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
}

export interface UploadSessionResponse {
  sessionUrl: string;
  folderId: string;
  fileName: string;
  fileType: 'photo' | 'video';
}

class GoogleDriveService {
  /**
   * Helper to retrieve a valid Firebase ID token for authenticated server calls
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches current Google Drive configuration and folder health status
   */
  async getStatus(): Promise<ApiResponse<GoogleDriveStatus>> {
    try {
      const res = await fetch('/api/integrations/google-drive/status');
      const data = (await res.json()) as any;
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DRIVE_STATUS_ERROR',
          message: err.message || 'Failed to fetch Google Drive status',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Initiates Google OAuth consent by redirecting to server endpoint
   */
  startOAuthFlow(returnTo?: string): void {
    const url = returnTo
      ? `/api/integrations/google-drive/oauth/start?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/integrations/google-drive/oauth/start';
    window.location.href = url;
  }

  /**
   * Disconnects Google Drive integration and clears stored credentials
   */
  async disconnect(): Promise<ApiResponse<{ disconnected: boolean }>> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/integrations/google-drive/disconnect', {
        method: 'POST',
        headers,
      });
      const data = (await res.json()) as any;
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
   * Initializes a Google Drive resumable upload session on the server.
   * Returns a unique Google upload session URL that allows the client to stream
   * files directly to Google Drive without passing large payloads through Vercel.
   */
  async createUploadSession(params: {
    fileName: string;
    fileType: 'photo' | 'video';
    fileSize: number;
    mimeType: string;
    evidenceId?: string;
    clientChecksum?: string;
  }): Promise<ApiResponse<UploadSessionResponse>> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/integrations/google-drive/create-upload-session', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'SESSION_INIT_FAILED',
            message: data.error?.message || `Failed to create Drive upload session (HTTP ${res.status})`,
            statusCode: res.status,
          },
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DRIVE_SESSION_NETWORK_ERROR',
          message: err.message || 'Network error preparing Google Drive upload session',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Streams a binary File or Blob directly to a Google Drive resumable session URL.
   * Uses XMLHttpRequest to capture genuine byte-level upload progress and enforce timeouts.
   */
  async uploadDirectResumable(
    sessionUrl: string,
    file: File | Blob,
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<{ id: string; name?: string; size?: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sessionUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      // 5-minute timeout for large video uploads
      xhr.timeout = 5 * 60 * 1000;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve({ id: 'uploaded-file' });
          }
        } else {
          reject(
            new Error(
              `Google Drive upload rejected with HTTP ${xhr.status}: ${xhr.statusText || xhr.responseText}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network connection interrupted while uploading media to Google Drive.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Google Drive media upload timed out. Connection speed may be too slow.'));
      };

      xhr.onabort = () => {
        reject(new Error('Media upload was aborted.'));
      };

      xhr.send(file);
    });
  }

  /**
   * Upload evidence media file directly to Google Drive.
   * Automatically uses direct resumable streaming so iPhone videos (up to 500MB)
   * upload with genuine byte progress without exceeding Vercel serverless body limits.
   */
  async uploadMedia(params: {
    file: File;
    evidenceId?: string;
    fileType?: 'photo' | 'video';
    clientChecksum?: string;
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void;
  }): Promise<ApiResponse<DriveUploadResponse>> {
    try {
      const fileType = params.fileType || (params.file.type.startsWith('video/') ? 'video' : 'photo');
      const sanitizedName = (params.file.name || `media_${Date.now()}`).replace(/\s+/g, '_');

      // 1. Initialize authorized resumable upload session on server
      const sessionRes = await this.createUploadSession({
        fileName: sanitizedName,
        fileType,
        fileSize: params.file.size,
        mimeType: params.file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'),
        evidenceId: params.evidenceId,
        clientChecksum: params.clientChecksum,
      });

      if (!sessionRes.success || !sessionRes.data?.sessionUrl) {
        return {
          success: false,
          error: sessionRes.error || {
            code: 'SESSION_CREATION_FAILED',
            message: 'Unable to initialize Google Drive upload session.',
            statusCode: 500,
          },
        };
      }

      // 2. Stream binary bytes directly to Google Drive
      const driveFile = await this.uploadDirectResumable(
        sessionRes.data.sessionUrl,
        params.file,
        params.onProgress
      );

      return {
        success: true,
        data: {
          fileId: driveFile.id,
          fileName: sanitizedName,
          folderId: sessionRes.data.folderId,
          size: params.file.size,
          checksum: params.clientChecksum || '',
          mimeType: params.file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'),
          uploadedAt: new Date().toISOString(),
        },
      };
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
