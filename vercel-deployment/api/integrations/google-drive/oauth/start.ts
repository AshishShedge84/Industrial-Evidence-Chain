import type { IncomingMessage, ServerResponse } from 'http';
import { generateOAuthState, buildAuthorizationUrl } from '../../../_lib/driveOAuth';
import { getDriveEnv } from '../../../_lib/driveConfig';
import { sendJson } from '../../../_lib/authMiddleware';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const env = getDriveEnv();
    if (!env.clientId) {
      return sendJson(res, 400, {
        error: 'GOOGLE_DRIVE_CLIENT_ID is not configured.',
        instruction: 'Please configure GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in your Vercel Environment Variables.',
      });
    }

    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const returnTo = parsedUrl.searchParams.get('returnTo') || '/settings';
    const wantJson = parsedUrl.searchParams.get('json') === 'true';

    // Generate tamper-proof signed CSRF state
    const state = generateOAuthState(returnTo);
    const authUrl = buildAuthorizationUrl(state);

    // Set secure cookie with the state nonce for dual-validation CSRF defense
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    const cookieFlags = [
      `iec_drive_oauth_state=${state.split('.')[0]}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=900', // 15 minutes
      isProd ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieFlags);

    if (wantJson) {
      return sendJson(res, 200, {
        success: true,
        authorizationUrl: authUrl,
        state,
      });
    }

    // Redirect user to Google OAuth consent screen
    res.statusCode = 302;
    res.setHeader('Location', authUrl);
    res.end();
  } catch (err: any) {
    return sendJson(res, 500, {
      error: err.message || 'Failed to initialize Google Drive OAuth flow',
    });
  }
}
