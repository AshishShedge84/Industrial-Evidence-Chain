// api/_lib/driveOAuth.ts
import crypto from "crypto";

// api/_lib/driveConfig.ts
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

// api/_lib/driveOAuth.ts
var memoryTokenStore = null;
function verifyOAuthState(stateString) {
  if (!stateString || typeof stateString !== "string") {
    return { valid: false, error: "Missing OAuth state parameter" };
  }
  const parts = stateString.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed OAuth state format" };
  }
  const [payloadB64, signature] = parts;
  const env = getDriveEnv();
  const expectedSig = crypto.createHmac("sha256", env.stateSecret).update(payloadB64).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Invalid OAuth state signature (CSRF mismatch)" };
  }
  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    const MAX_AGE = 15 * 60 * 1e3;
    if (Date.now() - payload.timestamp > MAX_AGE) {
      return { valid: false, error: "OAuth state has expired. Please try connecting again." };
    }
    return { valid: true, returnTo: payload.returnTo };
  } catch {
    return { valid: false, error: "Failed to decode OAuth state payload" };
  }
}
async function exchangeCodeForTokens(code) {
  const env = getDriveEnv();
  if (!env.clientId || !env.clientSecret) {
    throw new Error("Google Drive OAuth credentials (client ID or secret) are not configured");
  }
  const params = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code"
  });
  const response = await fetch(DRIVE_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to exchange authorization code for Google tokens");
  }
  let accountEmail;
  if (data.access_token) {
    try {
      const userRes = await fetch(DRIVE_CONFIG.USERINFO_URL, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        accountEmail = userData.email;
      }
    } catch {
    }
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    accountEmail
  };
}
async function saveDriveIntegration(data) {
  memoryTokenStore = {
    refreshToken: data.refreshToken,
    accountEmail: data.accountEmail,
    scope: data.scope,
    connectedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const env = getDriveEnv();
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_integrations/google_drive`;
  try {
    const fields = {
      refreshToken: { stringValue: data.refreshToken },
      accountEmail: { stringValue: data.accountEmail || "" },
      scope: { stringValue: data.scope || DRIVE_CONFIG.SCOPES[0] },
      status: { stringValue: "connected" },
      connectedAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() },
      updatedAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
    };
    await fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
  } catch (err) {
    console.error("Note: Firestore server-side persistence fallback to memory store", err);
  }
}

// api/_lib/authMiddleware.ts
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// api/integrations/google-drive/oauth/callback.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const code = parsedUrl.searchParams.get("code");
  const state = parsedUrl.searchParams.get("state");
  const googleError = parsedUrl.searchParams.get("error");
  if (googleError) {
    const errorDesc = parsedUrl.searchParams.get("error_description") || googleError;
    res.statusCode = 302;
    res.setHeader("Location", `/settings?drive_error=${encodeURIComponent(errorDesc)}`);
    return res.end();
  }
  if (!code || !state) {
    res.statusCode = 302;
    res.setHeader("Location", `/settings?drive_error=${encodeURIComponent("Missing authorization code or state from Google")}`);
    return res.end();
  }
  const stateResult = verifyOAuthState(state);
  const returnTo = stateResult.returnTo || "/settings";
  if (!stateResult.valid) {
    res.statusCode = 302;
    res.setHeader("Location", `${returnTo}?drive_error=${encodeURIComponent(stateResult.error || "Invalid or expired OAuth state")}`);
    return res.end();
  }
  try {
    const tokenResult = await exchangeCodeForTokens(code);
    if (!tokenResult.refreshToken) {
      console.warn("Warning: Google did not return a refresh_token. Ensure prompt=consent is enforced.");
    }
    if (tokenResult.refreshToken) {
      await saveDriveIntegration({
        refreshToken: tokenResult.refreshToken,
        accountEmail: tokenResult.accountEmail,
        scope: tokenResult.scope
      });
    }
    res.setHeader("Set-Cookie", "iec_drive_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    const successUrl = new URL(returnTo, `http://${req.headers.host || "localhost"}`);
    successUrl.searchParams.set("drive_connected", "success");
    if (tokenResult.accountEmail) {
      successUrl.searchParams.set("drive_account", tokenResult.accountEmail);
    }
    res.statusCode = 302;
    res.setHeader("Location", successUrl.pathname + successUrl.search);
    res.end();
  } catch (err) {
    console.error("OAuth token exchange error:", err);
    res.statusCode = 302;
    res.setHeader(
      "Location",
      `${returnTo}?drive_error=${encodeURIComponent(err.message || "Failed to complete Google Drive authentication")}`
    );
    res.end();
  }
}
export {
  handler as default
};
