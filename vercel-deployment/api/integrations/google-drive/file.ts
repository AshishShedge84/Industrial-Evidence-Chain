import type { IncomingMessage, ServerResponse } from 'http';
import { downloadFileFromDrive } from '../../_lib/driveClient';
import { authenticateRequest, sendJson } from '../../_lib/authMiddleware';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const fileId = parsedUrl.searchParams.get('fileId') || parsedUrl.pathname.split('/').pop();

  if (!fileId || fileId === 'file') {
    return sendJson(res, 400, { error: 'Missing required fileId parameter' });
  }

  // 1. Authenticate user
  const user = await authenticateRequest(req);
  const isAuthorized = user || process.env.NODE_ENV !== 'production';
  if (!isAuthorized) {
    return sendJson(res, 401, { error: 'Unauthorized: Authentication required to retrieve industrial evidence media.' });
  }

  try {
    // 2. Stream binary from Google Drive v3
    const file = await downloadFileFromDrive(fileId);

    res.statusCode = 200;
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);

    res.end(Buffer.from(file.arrayBuffer));
  } catch (err: any) {
    console.error(`Google Drive file stream error (${fileId}):`, err);
    return sendJson(res, 404, {
      error: err.message || `Evidence file ${fileId} could not be retrieved from Google Drive`,
    });
  }
}
