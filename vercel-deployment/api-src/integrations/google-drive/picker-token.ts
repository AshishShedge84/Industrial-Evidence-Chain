import type { IncomingMessage, ServerResponse } from 'http';
import { getDriveEnv } from '../../_lib/driveConfig.js';
import { getValidAccessToken } from '../../_lib/driveClient.js';
import { authenticateRequest, sendJson } from '../../_lib/authMiddleware.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // Authenticate Admin or user with valid session
  const user = await authenticateRequest(req);
  if (!user) {
    return sendJson(res, 401, {
      error: 'Unauthorized: Authentication required to initialize Google Picker session.',
    });
  }

  try {
    const env = getDriveEnv();
    const accessToken = await getValidAccessToken(req);

    // Provide short-lived access token specifically for Google Picker dialog
    return sendJson(res, 200, {
      success: true,
      data: {
        accessToken,
        clientId: env.clientId,
        developerKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
        appId: env.clientId.split('-')[0],
      },
    });
  } catch (err: any) {
    console.error('Failed to generate Picker token:', err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: 'PICKER_TOKEN_ERROR',
        message: err.message || 'Google Drive integration is not connected. Connect Drive first.',
      },
    });
  }
}

