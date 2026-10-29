import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv } from '../../_lib/driveConfig.js';
import { createDriveFolder } from '../../_lib/driveClient.js';
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

    // 1. Create root evidence vault folder
    const rootFolder = await createDriveFolder('IEC Industrial Evidence Vault', undefined, req);

    // 2. Create photo and video subfolders inside the root folder
    const photoFolder = await createDriveFolder('Photo Evidence', rootFolder.id, req);
    const videoFolder = await createDriveFolder('Video Evidence', rootFolder.id, req);

    return sendJson(res, 200, {
      success: true,
      message: 'Evidence folders provisioned successfully in your Google Drive under drive.file scope.',
      data: {
        rootFolderId: rootFolder.id,
        photoFolderId: photoFolder.id,
        videoFolderId: videoFolder.id,
        instructions:
          'To make these the permanent folders, optionally add GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_DRIVE_PHOTO_FOLDER_ID, and GOOGLE_DRIVE_VIDEO_FOLDER_ID to your Vercel Environment Variables.',
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

