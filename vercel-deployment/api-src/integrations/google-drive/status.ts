import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv, DRIVE_CONFIG } from '../../_lib/driveConfig.js';
import { getStoredDriveIntegration } from '../../_lib/driveOAuth.js';
import { checkFolderAccess, type FolderCheckResult } from '../../_lib/driveClient.js';
import { getEffectiveFolderConfig } from '../../_lib/folderStore.js';
import { sendJson } from '../../_lib/authMiddleware.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const env = getDriveEnv();
    const isConfigured = Boolean(env.clientId && env.clientSecret);
    const integration = await getStoredDriveIntegration(req);
    const isConnected = Boolean(integration?.refreshToken);

    const effectiveFolders = await getEffectiveFolderConfig(req);

    let folderStatus: {
      root: FolderCheckResult;
      photos: FolderCheckResult;
      videos: FolderCheckResult;
    } = {
      root: { id: effectiveFolders.rootFolderId, accessible: false, error: isConnected ? undefined : 'Drive not connected' },
      photos: { id: effectiveFolders.photoFolderId, accessible: false, error: isConnected ? undefined : 'Drive not connected' },
      videos: { id: effectiveFolders.videoFolderId, accessible: false, error: isConnected ? undefined : 'Drive not connected' },
    };

    if (isConnected) {
      // Test folder access in parallel
      const [rootCheck, photoCheck, videoCheck] = await Promise.all([
        checkFolderAccess(effectiveFolders.rootFolderId, req),
        checkFolderAccess(effectiveFolders.photoFolderId, req),
        checkFolderAccess(effectiveFolders.videoFolderId, req),
      ]);

      folderStatus = {
        root: rootCheck,
        photos: photoCheck,
        videos: videoCheck,
      };
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        configured: isConfigured,
        connected: isConnected,
        scope: DRIVE_CONFIG.SCOPES[0],
        accountEmail: integration?.accountEmail,
        connectedAt: integration?.connectedAt,
        folders: folderStatus,
        requiredFolders: {
          rootFolderId: env.rootFolderId,
          photoFolderId: env.photoFolderId,
          videoFolderId: env.videoFolderId,
        },
        effectiveFolders: {
          rootFolderId: effectiveFolders.rootFolderId,
          photoFolderId: effectiveFolders.photoFolderId,
          videoFolderId: effectiveFolders.videoFolderId,
          source: effectiveFolders.source,
          foldersVerified: effectiveFolders.foldersVerified,
          verifiedAt: effectiveFolders.verifiedAt,
        },
        setupStatus: {
          hasClientId: Boolean(env.clientId),
          hasClientSecret: Boolean(env.clientSecret),
          hasRefreshToken: isConnected,
          redirectUri: env.redirectUri,
        },
      },
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Failed to determine Google Drive connection status',
    });
  }
}
