// api-src/_lib/driveOAuth.ts
import crypto from "crypto";

// api-src/_lib/driveConfig.ts
var DRIVE_CONFIG = {
  // Configured Google Drive Folder IDs
  DEFAULT_ROOT_FOLDER_ID: "1M7uMS4jEqcZcHqAcFo4xFKMw4Zq3U8OR",
  DEFAULT_PHOTO_FOLDER_ID: "1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9",
  DEFAULT_VIDEO_FOLDER_ID: "1xLTaHhSU1iaCmpTXMPK6EXqFY13QLR-V",
  // Least-privilege OAuth scopes
  SCOPES: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  // Google OAuth Endpoints
  AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_URL: "https://oauth2.googleapis.com/token",
  USERINFO_URL: "https://www.googleapis.com/oauth2/v2/userinfo",
  DRIVE_API_BASE: "https://www.googleapis.com/drive/v3",
  DRIVE_UPLOAD_BASE: "https://www.googleapis.com/upload/drive/v3"
};
function getDriveEnv() {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  const defaultRedirect = isProd ? "https://iec-firebase-deployment.vercel.app/api/integrations/google-drive/oauth/callback" : "http://localhost:5173/api/integrations/google-drive/oauth/callback";
  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || defaultRedirect,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DRIVE_CONFIG.DEFAULT_ROOT_FOLDER_ID,
    photoFolderId: process.env.GOOGLE_DRIVE_PHOTO_FOLDER_ID || DRIVE_CONFIG.DEFAULT_PHOTO_FOLDER_ID,
    videoFolderId: process.env.GOOGLE_DRIVE_VIDEO_FOLDER_ID || DRIVE_CONFIG.DEFAULT_VIDEO_FOLDER_ID,
    stateSecret: process.env.GOOGLE_DRIVE_STATE_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || "iec-drive-secure-oauth-state-secret-default",
    configuredRefreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "",
    firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "electronics-gadget-review-sys"
  };
}

// api-src/_lib/driveOAuth.ts
function generateOAuthState(returnTo = "/settings") {
  const env = getDriveEnv();
  const payload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    timestamp: Date.now(),
    returnTo
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", env.stateSecret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}
function buildAuthorizationUrl(state) {
  const env = getDriveEnv();
  if (!env.clientId) {
    throw new Error("GOOGLE_DRIVE_CLIENT_ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: DRIVE_CONFIG.SCOPES.join(" "),
    access_type: "offline",
    // Mandatory for refresh token
    prompt: "consent",
    // Guarantees refresh token on every authorization
    include_granted_scopes: "true",
    state
  });
  return `${DRIVE_CONFIG.AUTH_URL}?${params.toString()}`;
}

// api-src/_lib/authMiddleware.ts
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// api-src/integrations/google-drive/oauth/start.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    const env = getDriveEnv();
    if (!env.clientId) {
      return sendJson(res, 400, {
        error: "GOOGLE_DRIVE_CLIENT_ID is not configured.",
        instruction: "Please configure GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in your Vercel Environment Variables."
      });
    }
    const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const returnTo = parsedUrl.searchParams.get("returnTo") || "/settings";
    const wantJson = parsedUrl.searchParams.get("json") === "true";
    const state = generateOAuthState(returnTo);
    const authUrl = buildAuthorizationUrl(state);
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    const cookieFlags = [
      `iec_drive_oauth_state=${state.split(".")[0]}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=900",
      // 15 minutes
      isProd ? "Secure" : ""
    ].filter(Boolean).join("; ");
    res.setHeader("Set-Cookie", cookieFlags);
    if (wantJson) {
      return sendJson(res, 200, {
        success: true,
        authorizationUrl: authUrl,
        state
      });
    }
    res.statusCode = 302;
    res.setHeader("Location", authUrl);
    res.end();
  } catch (err) {
    return sendJson(res, 500, {
      error: err.message || "Failed to initialize Google Drive OAuth flow"
    });
  }
}
export {
  handler as default
};
