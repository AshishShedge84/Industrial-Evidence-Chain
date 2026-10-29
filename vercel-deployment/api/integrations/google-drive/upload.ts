import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv } from '../../_lib/driveConfig';
import { uploadFileToDrive } from '../../_lib/driveClient';
import { authenticateRequest, sendJson } from '../../_lib/authMiddleware';

// Parse raw body helper
function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // 1. Authenticate user request
  const user = await authenticateRequest(req);
  // Allow authorized technician / manager / admin or dev preview
  const isAuthorized = user || process.env.NODE_ENV !== 'production';
  if (!isAuthorized) {
    return sendJson(res, 401, { error: 'Unauthorized: Authentication required to upload industrial evidence.' });
  }

  try {
    const env = getDriveEnv();
    const rawBody = await readRawBody(req);
    const contentType = req.headers['content-type'] || '';

    let fileName = 'evidence-asset';
    let mimeType = 'application/octet-stream';
    let fileType: 'photo' | 'video' = 'photo';
    let evidenceId: string | undefined;
    let clientChecksum: string | undefined;
    let fileBuffer: Buffer;

    if (contentType.includes('application/json')) {
      const json = JSON.parse(rawBody.toString('utf8'));
      if (!json.fileBase64) {
        return sendJson(res, 400, { error: 'Missing fileBase64 data in JSON payload' });
      }
      fileBuffer = Buffer.from(json.fileBase64, 'base64');
      fileName = json.fileName || `evidence-${Date.now()}`;
      mimeType = json.mimeType || (json.fileType === 'video' ? 'video/mp4' : 'image/jpeg');
      fileType = json.fileType === 'video' || mimeType.startsWith('video/') ? 'video' : 'photo';
      evidenceId = json.evidenceId;
      clientChecksum = json.clientChecksum;
    } else {
      // Direct binary stream with headers
      fileBuffer = rawBody;
      mimeType = contentType.split(';')[0] || 'application/octet-stream';
      fileName = (req.headers['x-file-name'] as string) || `evidence-${Date.now()}`;
      fileType = (req.headers['x-file-type'] as string) === 'video' || mimeType.startsWith('video/') ? 'video' : 'photo';
      evidenceId = req.headers['x-evidence-id'] as string;
      clientChecksum = req.headers['x-client-checksum'] as string;
    }

    if (fileBuffer.length === 0) {
      return sendJson(res, 400, { error: 'Empty file payload' });
    }

    // 2. Route to appropriate folder ID
    const targetFolderId = fileType === 'video' ? env.videoFolderId : env.photoFolderId;

    // 3. Upload to Google Drive and compute SHA-256
    const uploadResult = await uploadFileToDrive({
      folderId: targetFolderId,
      fileName,
      mimeType,
      fileBuffer,
      description: evidenceId ? `IEC Evidence for Record ID: ${evidenceId}` : undefined,
    });

    // 4. Validate client checksum if provided
    if (clientChecksum && clientChecksum.toLowerCase() !== uploadResult.checksum.toLowerCase()) {
      return sendJson(res, 400, {
        error: 'Integrity validation failed: Server-computed SHA-256 hash differs from client checksum.',
        computedChecksum: uploadResult.checksum,
        expectedChecksum: clientChecksum,
      });
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        ...uploadResult,
        evidenceId,
        fileType,
      },
    });
  } catch (err: any) {
    console.error('Google Drive upload error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Failed to upload evidence file to Google Drive',
    });
  }
}
