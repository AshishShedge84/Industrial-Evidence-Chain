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
var memoryTokenStore = null;
async function refreshAccessToken(refreshToken) {
  const env = getDriveEnv();
  if (!env.clientId || !env.clientSecret) {
    throw new Error("Google Drive client credentials not configured");
  }
  const params = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  const res = await fetch(DRIVE_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to refresh Google Drive access token");
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in
  };
}
async function getStoredDriveIntegration() {
  const env = getDriveEnv();
  if (env.configuredRefreshToken) {
    return {
      refreshToken: env.configuredRefreshToken,
      accountEmail: "Configured via Vercel Environment",
      scope: DRIVE_CONFIG.SCOPES[0],
      connectedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (memoryTokenStore?.refreshToken) {
    return memoryTokenStore;
  }
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_integrations/google_drive`;
  try {
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};
      const refreshToken = fields.refreshToken?.stringValue;
      if (refreshToken) {
        memoryTokenStore = {
          refreshToken,
          accountEmail: fields.accountEmail?.stringValue || void 0,
          scope: fields.scope?.stringValue || DRIVE_CONFIG.SCOPES[0],
          connectedAt: fields.connectedAt?.stringValue || void 0
        };
        return memoryTokenStore;
      }
    }
  } catch {
  }
  return null;
}

// api-src/_lib/driveClient.ts
var cachedAccessToken = null;
async function getValidAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 6e4) {
    return cachedAccessToken.token;
  }
  const integration = await getStoredDriveIntegration();
  if (!integration || !integration.refreshToken) {
    throw new Error("Google Drive integration is not connected. Administrator must authenticate Google Drive first.");
  }
  const refreshed = await refreshAccessToken(integration.refreshToken);
  cachedAccessToken = {
    token: refreshed.accessToken,
    expiresAt: Date.now() + refreshed.expiresIn * 1e3
  };
  return cachedAccessToken.token;
}
async function downloadFileFromDrive(fileId) {
  const accessToken = await getValidAccessToken();
  const metaRes = await fetch(`${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!metaRes.ok) {
    throw new Error(`Failed to retrieve file metadata from Google Drive (HTTP ${metaRes.status})`);
  }
  const meta = await metaRes.json();
  const mediaRes = await fetch(`${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!mediaRes.ok) {
    throw new Error(`Failed to stream media from Google Drive (HTTP ${mediaRes.status})`);
  }
  const arrayBuffer = await mediaRes.arrayBuffer();
  return {
    arrayBuffer,
    name: meta.name || `evidence-${fileId}`,
    mimeType: meta.mimeType || "application/octet-stream",
    size: Number(meta.size) || arrayBuffer.byteLength
  };
}

// api-src/_lib/authMiddleware.ts
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token })
      });
      if (res.ok) {
        const data = await res.json();
        const userRecord = data.users?.[0];
        if (userRecord) {
          return {
            uid: userRecord.localId,
            email: userRecord.email,
            role: userRecord.customAttributes ? JSON.parse(userRecord.customAttributes).role : void 0
          };
        }
      }
    } catch {
    }
  }
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.user_id || payload.sub) {
        return {
          uid: payload.user_id || payload.sub,
          email: payload.email,
          role: payload.role
        };
      }
    }
  } catch {
  }
  return null;
}
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// api-src/integrations/google-drive/file.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const fileId = parsedUrl.searchParams.get("fileId") || parsedUrl.pathname.split("/").pop();
  if (!fileId || fileId === "file") {
    return sendJson(res, 400, { error: "Missing required fileId parameter" });
  }
  const user = await authenticateRequest(req);
  const isAuthorized = user || process.env.NODE_ENV !== "production";
  if (!isAuthorized) {
    return sendJson(res, 401, { error: "Unauthorized: Authentication required to retrieve industrial evidence media." });
  }
  try {
    const file = await downloadFileFromDrive(fileId);
    res.statusCode = 200;
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size.toString());
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
    res.end(Buffer.from(file.arrayBuffer));
  } catch (err) {
    console.error(`Google Drive file stream error (${fileId}):`, err);
    return sendJson(res, 404, {
      error: err.message || `Evidence file ${fileId} could not be retrieved from Google Drive`
    });
  }
}
export {
  handler as default
};
