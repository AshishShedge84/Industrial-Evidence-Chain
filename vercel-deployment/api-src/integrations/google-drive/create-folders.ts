import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv } from '../../_lib/driveConfig.js';
import { createDriveFolder, searchFolder, checkFolderAccess } from '../../_lib/driveClient.js';
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
      error: 'Unauthorized: Authentication required to provision Google Drive folders.',
    });
  }

  try {
    const env = getDriveEnv();

    // Parse optional body parameters
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
    }
    const body = rawBody ? JSON.parse(rawBody) : {};
    const requestedRootId = body.rootFolderId || env.rootFolderId;

    let rootFolder: { id: string; name: string };

    // 1. Check if the specified/configured root folder is accessible
    const rootCheck = await checkFolderAccess(requestedRootId, req);
    if (rootCheck.accessible) {
      rootFolder = { id: requestedRootId, name: rootCheck.name || 'Configured Evidence Root' };
    } else {
      // Search if IEC Industrial Evidence Vault already exists in My Drive
      const existingVault = await searchFolder('IEC Industrial Evidence Vault', undefined, req);
      if (existingVault) {
        rootFolder = existingVault;
      } else {
        // Create root evidence vault folder in My Drive
        rootFolder = await createDriveFolder('IEC Industrial Evidence Vault', undefined, req);
      }
    }

    // 2. Locate or create Photo Evidence subfolder inside root folder (prevents duplicates)
    let photoFolder = await searchFolder('Photo Evidence', rootFolder.id, req);
    if (!photoFolder) {
      photoFolder = await createDriveFolder('Photo Evidence', rootFolder.id, req);
    }

    // 3. Locate or create Video Evidence subfolder inside root folder (prevents duplicates)
    let videoFolder = await searchFolder('Video Evidence', rootFolder.id, req);
    if (!videoFolder) {
      videoFolder = await createDriveFolder('Video Evidence', rootFolder.id, req);
    }

    // 4. Persist effective folders across server storage layers
    const savedConfig = await saveEffectiveFolderConfig({
      rootFolderId: rootFolder.id,
      photoFolderId: photoFolder.id,
      videoFolderId: videoFolder.id,
      rootFolderName: rootFolder.name,
      photoFolderName: photoFolder.name,
      videoFolderName: videoFolder.name,
      foldersVerified: true,
      verifiedAt: new Date().toISOString(),
    });

    // 5. Issue encrypted cookie so browser session immediately recognizes verified folders
    res.setHeader('Set-Cookie', buildFolderCookie(savedConfig));

    return sendJson(res, 200, {
      success: true,
      message: 'Evidence folders provisioned and verified in Google Drive under drive.file scope.',
      data: {
        rootFolderId: rootFolder.id,
        rootFolderName: rootFolder.name,
        photoFolderId: photoFolder.id,
        photoFolderName: photoFolder.name,
        videoFolderId: videoFolder.id,
        videoFolderName: videoFolder.name,
        verified: true,
        instructions: {
          note: 'To preserve these folder destinations across all serverless deployments, add these environment variables to Vercel Production Settings:',
          envVars: {
            GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolder.id,
            GOOGLE_DRIVE_PHOTO_FOLDER_ID: photoFolder.id,
            GOOGLE_DRIVE_VIDEO_FOLDER_ID: videoFolder.id,
          },
        },
      },
    });
  } catch (err: any) {
    console.error('Failed to provision Drive folders:', err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: 'PROVISION_FOLDERS_ERROR',
        message: err.message || 'Failed to create folders in Google Drive',
      },
    });
  }
}
