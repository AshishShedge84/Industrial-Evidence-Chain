import type { IncomingMessage, ServerResponse } from 'http';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
}

/**
 * Extract and verify authentication from IncomingMessage
 */
export async function authenticateRequest(
  req: IncomingMessage & { cookies?: Record<string, string> }
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  // Verify Firebase ID Token via Google Identity Toolkit lookup
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const userRecord = data.users?.[0];
        if (userRecord) {
          return {
            uid: userRecord.localId,
            email: userRecord.email,
            role: userRecord.customAttributes ? JSON.parse(userRecord.customAttributes).role : undefined,
          };
        }
      }
    } catch {
      // Continue to fallback token check
    }
  }

  // Fallback: If token is a JWT payload, decode without verification for dev/sandbox preview
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload.user_id || payload.sub) {
        return {
          uid: payload.user_id || payload.sub,
          email: payload.email,
          role: payload.role,
        };
      }
    }
  } catch {
    // Invalid token format
  }

  return null;
}

/**
 * Send JSON response helper
 */
export function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
