import crypto from 'crypto';
import { DRIVE_CONFIG, getDriveEnv } from './driveConfig.js';
import { getStoredDriveIntegration, refreshAccessToken } from './driveOAuth.js';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid access token for Google Drive API calls
 */
export async function getValidAccessToken(): Promise<string> {
  // Check cached token (with 60-second buffer)
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  const integration = await getStoredDriveIntegration();
  if (!integration || !integration.refreshToken) {
    throw new Error('Google Drive integration is not connected. Administrator must authenticate Google Drive first.');
  }

  const refreshed = await refreshAccessToken(integration.refreshToken);
  cachedAccessToken = {
    token: refreshed.accessToken,
    expiresAt: Date.now() + refreshed.expiresIn * 1000,
  };

  return cachedAccessToken.token;
}

export interface FolderCheckResult {
  id: string;
  name?: string;
  accessible: boolean;
  error?: string;
  scopeNotice?: string;
}

/**
 * Check whether a configured folder is accessible under the drive.file scope
 */
export async function checkFolderAccess(folderId: string): Promise<FolderCheckResult> {
  try {
    const accessToken = await getValidAccessToken();
    const url = `${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed,capabilities&supportsAllDrives=true`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.trashed) {
        return {
          id: folderId,
          name: data.name,
          accessible: false,
          error: 'Folder exists in Google Drive but is located in the Trash.',
        };
      }
      return {
        id: folderId,
        name: data.name,
        accessible: true,
      };
    }

    if (res.status === 404 || res.status === 403) {
      return {
        id: folderId,
        accessible: false,
        error: `Folder returned HTTP ${res.status}. Under the least-privilege 'drive.file' scope, Google Drive only permits access to folders created by this app or opened/selected via Google Picker.`,
        scopeNotice: 'To authorize an existing pre-created folder under drive.file, ensure the folder was created by or shared with the authenticated account, or authorize it via Google Picker.',
      };
    }

    const errData = ((await res.json().catch(() => ({})))) as any;
    return {
      id: folderId,
      accessible: false,
      error: errData.error?.message || `HTTP ${res.status} error accessing folder`,
    };
  } catch (err: any) {
    return {
      id: folderId,
      accessible: false,
      error: err.message || 'Failed to communicate with Google Drive API',
    };
  }
}

export interface CreateResumableSessionParams {
  folderId: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  evidenceId?: string;
  clientChecksum?: string;
}

export interface ResumableSessionResult {
  sessionUrl: string;
  folderId: string;
  fileName: string;
}

/**
 * Initializes an authorized Google Drive resumable upload session.
 * The client can transfer bytes directly to Google Drive via PUT without passing through Vercel.
 */
export async function createResumableUploadSession(
  params: CreateResumableSessionParams
): Promise<ResumableSessionResult> {
  const accessToken = await getValidAccessToken();

  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
    description: `IEC industrial evidence media for evidence ${params.evidenceId || 'unassigned'} (SHA-256: ${params.clientChecksum || 'pending'})`,
    properties: {
      iecEvidenceId: params.evidenceId || '',
      iecChecksum: params.clientChecksum || '',
      iecInitiatedAt: new Date().toISOString(),
    },
  };

  const initUrl = `${DRIVE_CONFIG.DRIVE_UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': params.mimeType,
  };

  if (params.fileSize && params.fileSize > 0) {
    headers['X-Upload-Content-Length'] = params.fileSize.toString();
  }

  const response = await fetch(initUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive failed to create upload session (HTTP ${response.status}): ${errorText}`);
  }

  const sessionUrl = response.headers.get('Location') || response.headers.get('location');
  if (!sessionUrl) {
    throw new Error('Google Drive did not return a valid resumable upload Location header.');
  }

  return {
    sessionUrl,
    folderId: params.folderId,
    fileName: params.fileName,
  };
}

export interface DriveUploadParams {
  folderId: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  description?: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  folderId: string;
  size: number;
  checksum: string; // SHA-256
  mimeType: string;
  uploadedAt: string;
}

/**
 * Upload binary file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(params: DriveUploadParams): Promise<DriveUploadResult> {
  const accessToken = await getValidAccessToken();

  // 1. Calculate deterministic SHA-256 checksum of the incoming file buffer
  const hash = crypto.createHash('sha256').update(params.fileBuffer).digest('hex');

  // 2. Prepare multipart body
  const boundary = `-------iec_drive_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
    description: params.description || `IEC Evidence Asset notarized with SHA-256: ${hash}`,
    properties: {
      iecChecksum: hash,
      iecTimestamp: new Date().toISOString(),
    },
  };

  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${params.mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const closingPart = Buffer.from(`\r\n--${boundary}--\r\n`);

  const multipartBody = Buffer.concat([metadataPart, mediaHeader, params.fileBuffer, closingPart]);

  const uploadUrl = `${DRIVE_CONFIG.DRIVE_UPLOAD_BASE}/files?uploadType=multipart&supportsAllDrives=true`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': multipartBody.length.toString(),
    },
    body: multipartBody,
  });

  const data = (await response.json()) as any;

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Google Drive upload failed with status ${response.status}`);
  }

  return {
    fileId: data.id,
    fileName: data.name || params.fileName,
    folderId: params.folderId,
    size: params.fileBuffer.length,
    checksum: hash,
    mimeType: params.mimeType,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Fetch binary media file from Google Drive for authorized streaming
 */
export async function downloadFileFromDrive(fileId: string): Promise<{
  arrayBuffer: ArrayBuffer;
  name: string;
  mimeType: string;
  size: number;
}> {
  const accessToken = await getValidAccessToken();

  // Get file metadata first
  const metaRes = await fetch(`${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to retrieve file metadata from Google Drive (HTTP ${metaRes.status})`);
  }

  const meta = (await metaRes.json()) as any;

  // Download media binary
  const mediaRes = await fetch(`${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaRes.ok) {
    throw new Error(`Failed to stream media from Google Drive (HTTP ${mediaRes.status})`);
  }

  const arrayBuffer = await mediaRes.arrayBuffer();

  return {
    arrayBuffer,
    name: meta.name || `evidence-${fileId}`,
    mimeType: meta.mimeType || 'application/octet-stream',
    size: Number(meta.size) || arrayBuffer.byteLength,
  };
}
