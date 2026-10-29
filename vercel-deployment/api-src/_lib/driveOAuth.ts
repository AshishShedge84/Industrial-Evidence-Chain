import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import { DRIVE_CONFIG, getDriveEnv } from './driveConfig.js';

interface OAuthStatePayload {
  nonce: string;
  timestamp: number;
  returnTo?: string;
}

// In-memory token fallback for the serverless container instance
let memoryTokenStore: {
  refreshToken: string;
  accountEmail?: string;
  connectedAt?: string;
  scope?: string;
} | null = null;

/**
 * Generate a cryptographically signed CSRF state parameter
 */
export function generateOAuthState(returnTo = '/settings'): string {
  const env = getDriveEnv();
  const payload: OAuthStatePayload = {
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
    returnTo,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.stateSecret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify CSRF OAuth state parameter and expiration (15 min)
 */
export function verifyOAuthState(stateString: string): { valid: boolean; returnTo?: string; error?: string } {
  if (!stateString || typeof stateString !== 'string') {
    return { valid: false, error: 'Missing OAuth state parameter' };
  }

  const parts = stateString.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed OAuth state format' };
  }

  const [payloadB64, signature] = parts;
  const env = getDriveEnv();

  const expectedSig = crypto
    .createHmac('sha256', env.stateSecret)
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid OAuth state signature (CSRF mismatch)' };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: OAuthStatePayload = JSON.parse(payloadJson);

    // State is valid for 15 minutes (900,000 ms)
    const MAX_AGE = 15 * 60 * 1000;
    if (Date.now() - payload.timestamp > MAX_AGE) {
      return { valid: false, error: 'OAuth state has expired. Please try connecting again.' };
    }

    return { valid: true, returnTo: payload.returnTo };
  } catch {
    return { valid: false, error: 'Failed to decode OAuth state payload' };
  }
}

/**
 * Build Google OAuth 2.0 Web Server Authorization URL
 */
export function buildAuthorizationUrl(state: string): string {
  const env = getDriveEnv();
  if (!env.clientId) {
    throw new Error('GOOGLE_DRIVE_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    scope: DRIVE_CONFIG.SCOPES.join(' '),
    access_type: 'offline', // Mandatory for refresh token
    prompt: 'consent',     // Guarantees refresh token on every authorization
    include_granted_scopes: 'true',
    state,
  });

  return `${DRIVE_CONFIG.AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
  accountEmail?: string;
}> {
  const env = getDriveEnv();
  if (!env.clientId || !env.clientSecret) {
    throw new Error('Google Drive OAuth credentials (client ID or secret) are not configured');
  }

  const params = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(DRIVE_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await response.json()) as any;

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code for Google tokens');
  }

  let accountEmail: string | undefined;
  if (data.access_token) {
    try {
      const userRes = await fetch(DRIVE_CONFIG.USERINFO_URL, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as any;
        accountEmail = userData.email;
      }
    } catch {
      // Safe email probe
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    accountEmail,
  };
}

/**
 * Refresh an access token using a stored refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const env = getDriveEnv();
  if (!env.clientId || !env.clientSecret) {
    throw new Error('Google Drive client credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(DRIVE_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as any;
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google Drive access token');
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Save Google Drive integration state securely server-side
 */
export async function saveDriveIntegration(data: {
  refreshToken: string;
  accountEmail?: string;
  scope?: string;
}): Promise<void> {
  memoryTokenStore = {
    refreshToken: data.refreshToken,
    accountEmail: data.accountEmail,
    scope: data.scope,
    connectedAt: new Date().toISOString(),
  };

  // Persist to Firestore server-side collection 'system_integrations/google_drive' via Firestore REST API
  const env = getDriveEnv();
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_integrations/google_drive`;

  try {
    const fields = {
      refreshToken: { stringValue: data.refreshToken },
      accountEmail: { stringValue: data.accountEmail || '' },
      scope: { stringValue: data.scope || DRIVE_CONFIG.SCOPES[0] },
      status: { stringValue: 'connected' },
      connectedAt: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() },
    };

    await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch (err) {
    // Memory store remains active as container cache
    console.error('Note: Firestore server-side persistence fallback to memory store', err);
  }
}

/**
 * Encrypt a sensitive token using AES-256-GCM and the server secret
 */
export function encryptToken(token: string): string {
  const env = getDriveEnv();
  const key = crypto.createHash('sha256').update(env.stateSecret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

/**
 * Decrypt a token previously encrypted with encryptToken
 */
export function decryptToken(encryptedString: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = encryptedString.split('.');
    if (!ivHex || !tagHex || !dataHex) return null;
    const env = getDriveEnv();
    const key = crypto.createHash('sha256').update(env.stateSecret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Retrieve the server-side stored refresh token
 */
export async function getStoredDriveIntegration(req?: IncomingMessage): Promise<{
  refreshToken?: string;
  accountEmail?: string;
  scope?: string;
  connectedAt?: string;
} | null> {
  const env = getDriveEnv();

  // 1. Direct environment variable configuration (preferred for 12-factor / Vercel secrets)
  if (env.configuredRefreshToken) {
    return {
      refreshToken: env.configuredRefreshToken,
      accountEmail: 'Configured via Vercel Environment',
      scope: DRIVE_CONFIG.SCOPES[0],
      connectedAt: new Date().toISOString(),
    };
  }

  // 2. Encrypted HttpOnly cookie in the incoming request (survives cold starts and container recycles)
  if (req?.headers?.cookie) {
    const cookies = req.headers.cookie.split(';').map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith('iec_drive_refresh_token='));
    if (tokenCookie) {
      const encryptedValue = tokenCookie.replace('iec_drive_refresh_token=', '');
      const decryptedToken = decryptToken(encryptedValue);
      if (decryptedToken) {
        return {
          refreshToken: decryptedToken,
          accountEmail: 'Authorized via Secure Session Cookie',
          scope: DRIVE_CONFIG.SCOPES[0],
          connectedAt: new Date().toISOString(),
        };
      }
    }
  }

  // 3. In-memory session store
  if (memoryTokenStore?.refreshToken) {
    return memoryTokenStore;
  }

  // 4. Firestore REST document read
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_integrations/google_drive`;
  try {
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const doc = (await res.json()) as any;
      const fields = doc.fields || {};
      const refreshToken = fields.refreshToken?.stringValue;
      if (refreshToken) {
        memoryTokenStore = {
          refreshToken,
          accountEmail: fields.accountEmail?.stringValue || undefined,
          scope: fields.scope?.stringValue || DRIVE_CONFIG.SCOPES[0],
          connectedAt: fields.connectedAt?.stringValue || undefined,
        };
        return memoryTokenStore;
      }
    }
  } catch {
    // Firestore integration record not found
  }

  return null;
}

/**
 * Remove stored integration credentials server-side
 */
export async function clearDriveIntegration(): Promise<void> {
  memoryTokenStore = null;
  const env = getDriveEnv();
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_integrations/google_drive`;
  try {
    await fetch(firestoreUrl, { method: 'DELETE' });
  } catch {
    // Best effort cleanup
  }
}
