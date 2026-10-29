import type { IncomingMessage, ServerResponse } from 'http';
import { getFolderMetadata } from '../../_lib/driveClient.js';
import { saveEffectiveFolderConfig, buildFolderCookie } from '../../_lib/folderStore.js';
import { authenticateRequest, sendJson } from '../../_lib/authMiddleware.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const user = await authenticateRequest(req);
  if (!user) {
    return sendJson(res, 401, {
      error: 'Unauthorized: Authentication required to verify Google Drive folders.',
    });
  }

  try {
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const { folderId, folderType, folderName } = payload;

    if (!folderId || typeof folderId !== 'string') {
      return sendJson(res, 400, {
        error: 'Missing required field: folderId',
      });
    }

    // 1. Perform server-side metadata and access verification with Google Drive API
    const meta = await getFolderMetadata(folderId.trim(), req);

    if (!meta.accessible) {
      return sendJson(res, 200, {
        success: false,
        data: {
          id: folderId,
          name: meta.name,
          accessible: false,
          error: meta.error || `Folder returned HTTP 404/403. Under 'drive.file' scope, folders must be selected via Google Picker or created by the application.`,
        },
      });
    }

    // 2. Validate MIME type
    if (meta.mimeType !== 'application/vnd.google-apps.folder') {
      return sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_MIME_TYPE',
          message: `Selected item is not a folder (MIME type: ${meta.mimeType}). Please select a valid Google Drive folder.`,
        },
      });
    }

    // 3. If a folder role is specified, persist this folder ID into effective configuration
    let savedConfig;
    if (folderType === 'root') {
      savedConfig = await saveEffectiveFolderConfig({
        rootFolderId: meta.id,
        rootFolderName: meta.name || folderName,
        foldersVerified: true,
      });
    } else if (folderType === 'photos') {
      savedConfig = await saveEffectiveFolderConfig({
        photoFolderId: meta.id,
        photoFolderName: meta.name || folderName,
        foldersVerified: true,
      });
    } else if (folderType === 'videos') {
      savedConfig = await saveEffectiveFolderConfig({
        videoFolderId: meta.id,
        videoFolderName: meta.name || folderName,
        foldersVerified: true,
      });
    }

    if (savedConfig) {
      res.setHeader('Set-Cookie', buildFolderCookie(savedConfig));
    }

    return sendJson(res, 200, {
      success: true,
      message: `Folder '${meta.name}' (${meta.id}) verified successfully with full write capability.`,
      data: {
        id: meta.id,
        name: meta.name,
        mimeType: meta.mimeType,
        accessible: true,
        canAddChildren: meta.canAddChildren,
        parents: meta.parents,
        folderType,
        verified: true,
      },
    });
  } catch (err: any) {
    console.error('Failed to verify folder:', err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: 'FOLDER_VERIFY_ERROR',
        message: err.message || 'Failed to verify folder with Google Drive API',
      },
    });
  }
}

