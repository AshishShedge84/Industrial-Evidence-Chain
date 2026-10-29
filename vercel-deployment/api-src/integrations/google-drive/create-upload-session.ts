import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv } from '../../_lib/driveConfig.js';
import { getStoredDriveIntegration } from '../../_lib/driveOAuth.js';
import { createResumableUploadSession } from '../../_lib/driveClient.js';
import { getEffectiveFolderConfig } from '../../_lib/folderStore.js';
import { authenticateRequest, sendJson } from '../../_lib/authMiddleware.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // 1. Authenticate user
  const user = await authenticateRequest(req);
  if (!user) {
    return sendJson(res, 401, {
      error: 'Unauthorized: Authentication required to initialize evidence upload session.',
    });
  }

  try {
    const env = getDriveEnv();

    // 2. Verify Google Drive integration status
    const integration = await getStoredDriveIntegration(req);
    if (!integration || !integration.refreshToken) {
      return sendJson(res, 400, {
        success: false,
        error: {
          code: 'DRIVE_NOT_CONNECTED',
          message: 'Google Drive Enterprise Storage is not connected. An administrator must connect Google Drive in Settings before evidence can be sealed into the vault.',
          configured: Boolean(env.clientId && env.clientSecret),
          instruction: 'Navigate to Settings > Google Drive Enterprise Storage to connect.',
        },
      });
    }

    // 3. Parse JSON payload
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const {
      evidenceId,
      fileName,
      fileType = 'photo',
      fileSize = 0,
      mimeType = 'application/octet-stream',
      clientChecksum,
    } = payload;

    if (!fileName) {
      return sendJson(res, 400, {
        error: 'Missing required field: fileName',
      });
    }

    // 4. Resolve effective authorized folder IDs (reads verified folders from storage cascade)
    const effectiveFolders = await getEffectiveFolderConfig(req);
    const targetFolderId =
      fileType === 'video'
        ? effectiveFolders.videoFolderId
        : effectiveFolders.photoFolderId;

    // 5. Generate secure, authorized resumable upload session directly on Google Drive
    try {
      const session = await createResumableUploadSession(
        {
          folderId: targetFolderId,
          fileName: fileName.replace(/\s+/g, '_'),
          mimeType,
          fileSize: Number(fileSize) || 0,
          evidenceId,
          clientChecksum,
        },
        req
      );

      return sendJson(res, 200, {
        success: true,
        data: {
          sessionUrl: session.sessionUrl,
          folderId: session.folderId,
          fileName: session.fileName,
          fileType,
          folderSource: effectiveFolders.source,
        },
      });
    } catch (sessionErr: any) {
      const errMsg = sessionErr.message || '';
      if (errMsg.includes('404') || errMsg.includes('File not found')) {
        return sendJson(res, 404, {
          success: false,
          error: {
            code: 'DRIVE_FOLDER_NOT_FOUND',
            message: `Google Drive destination folder '${targetFolderId}' returned HTTP 404. Under the least-privilege 'drive.file' OAuth scope, folders created outside this application must be authorized via Google Picker or auto-provisioned in Settings > Google Drive Storage.`,
            folderId: targetFolderId,
            fileType,
            help: 'Go to Settings > Google Drive Storage > Authorise Evidence Folders or Auto-Provision to resolve.',
          },
        });
      }
      throw sessionErr;
    }
  } catch (err: any) {
    console.error('Failed to create resumable upload session:', err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: 'DRIVE_SESSION_ERROR',
        message: err.message || 'Failed to create Google Drive upload session',
      },
    });
  }
}

