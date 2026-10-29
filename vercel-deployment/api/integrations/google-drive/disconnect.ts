import type { IncomingMessage, ServerResponse } from 'http';
import { clearDriveIntegration } from '../../_lib/driveOAuth';
import { sendJson } from '../../_lib/authMiddleware';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    await clearDriveIntegration();
    return sendJson(res, 200, {
      success: true,
      message: 'Google Drive connection revoked and cleared from server storage.',
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Failed to disconnect Google Drive',
    });
  }
}
