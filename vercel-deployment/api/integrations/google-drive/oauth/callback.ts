import type { IncomingMessage, ServerResponse } from 'http';
import { verifyOAuthState, exchangeCodeForTokens, saveDriveIntegration } from '../../../_lib/driveOAuth.js';
import { sendJson } from '../../../_lib/authMiddleware.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const code = parsedUrl.searchParams.get('code');
  const state = parsedUrl.searchParams.get('state');
  const googleError = parsedUrl.searchParams.get('error');

  // Handle Google OAuth error response
  if (googleError) {
    const errorDesc = parsedUrl.searchParams.get('error_description') || googleError;
    res.statusCode = 302;
    res.setHeader('Location', `/settings?drive_error=${encodeURIComponent(errorDesc)}`);
    return res.end();
  }

  if (!code || !state) {
    res.statusCode = 302;
    res.setHeader('Location', `/settings?drive_error=${encodeURIComponent('Missing authorization code or state from Google')}`);
    return res.end();
  }

  // 1. Verify CSRF State Parameter
  const stateResult = verifyOAuthState(state);
  const returnTo = stateResult.returnTo || '/settings';

  if (!stateResult.valid) {
    res.statusCode = 302;
    res.setHeader('Location', `${returnTo}?drive_error=${encodeURIComponent(stateResult.error || 'Invalid or expired OAuth state')}`);
    return res.end();
  }

  try {
    // 2. Exchange authorization code with Google Token endpoint
    const tokenResult = await exchangeCodeForTokens(code);

    if (!tokenResult.refreshToken) {
      // If user had previously authorized the app, Google might not return a refresh token unless prompt=consent was used
      console.warn('Warning: Google did not return a refresh_token. Ensure prompt=consent is enforced.');
    }

    // 3. Save refresh token securely server-side
    if (tokenResult.refreshToken) {
      await saveDriveIntegration({
        refreshToken: tokenResult.refreshToken,
        accountEmail: tokenResult.accountEmail,
        scope: tokenResult.scope,
      });
    }

    // 4. Clear the state cookie
    res.setHeader('Set-Cookie', 'iec_drive_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');

    // 5. Redirect back to application with success indicators (NEVER exposing tokens to URL or client)
    const successUrl = new URL(returnTo, `http://${req.headers.host || 'localhost'}`);
    successUrl.searchParams.set('drive_connected', 'success');
    if (tokenResult.accountEmail) {
      successUrl.searchParams.set('drive_account', tokenResult.accountEmail);
    }

    res.statusCode = 302;
    res.setHeader('Location', successUrl.pathname + successUrl.search);
    res.end();
  } catch (err: any) {
    console.error('OAuth token exchange error:', err);
    res.statusCode = 302;
    res.setHeader(
      'Location',
      `${returnTo}?drive_error=${encodeURIComponent(err.message || 'Failed to complete Google Drive authentication')}`
    );
    res.end();
  }
}

