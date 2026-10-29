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
async function createResumableUploadSession(params) {
  const accessToken = await getValidAccessToken();
  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
    description: `IEC industrial evidence media for evidence ${params.evidenceId || "unassigned"} (SHA-256: ${params.clientChecksum || "pending"})`,
    properties: {
      iecEvidenceId: params.evidenceId || "",
      iecChecksum: params.clientChecksum || "",
      iecInitiatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  const initUrl = `${DRIVE_CONFIG.DRIVE_UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": params.mimeType
  };
  if (params.fileSize && params.fileSize > 0) {
    headers["X-Upload-Content-Length"] = params.fileSize.toString();
  }
  const response = await fetch(initUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(metadata)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive failed to create upload session (HTTP ${response.status}): ${errorText}`);
  }
  const sessionUrl = response.headers.get("Location") || response.headers.get("location");
  if (!sessionUrl) {
    throw new Error("Google Drive did not return a valid resumable upload Location header.");
  }
  return {
    sessionUrl,
    folderId: params.folderId,
    fileName: params.fileName
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

// api-src/integrations/google-drive/create-upload-session.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const user = await authenticateRequest(req);
  if (!user) {
    return sendJson(res, 401, {
      error: "Unauthorized: Authentication required to initialize evidence upload session."
    });
  }
  try {
    const env = getDriveEnv();
    const integration = await getStoredDriveIntegration();
    if (!integration || !integration.refreshToken) {
      return sendJson(res, 400, {
        success: false,
        error: {
          code: "DRIVE_NOT_CONNECTED",
          message: "Google Drive Enterprise Storage is not connected. An administrator must connect Google Drive in Settings before evidence can be sealed into the vault.",
          configured: Boolean(env.clientId && env.clientSecret),
          instruction: "Navigate to Settings > Google Drive Enterprise Storage to connect."
        }
      });
    }
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const {
      evidenceId,
      fileName,
      fileType = "photo",
      fileSize = 0,
      mimeType = "application/octet-stream",
      clientChecksum
    } = payload;
    if (!fileName) {
      return sendJson(res, 400, {
        error: "Missing required field: fileName"
      });
    }
    const targetFolderId = fileType === "video" ? env.videoFolderId : env.photoFolderId;
    const session = await createResumableUploadSession({
      folderId: targetFolderId,
      fileName: fileName.replace(/\s+/g, "_"),
      mimeType,
      fileSize: Number(fileSize) || 0,
      evidenceId,
      clientChecksum
    });
    return sendJson(res, 200, {
      success: true,
      data: {
        sessionUrl: session.sessionUrl,
        folderId: session.folderId,
        fileName: session.fileName,
        fileType
      }
    });
  } catch (err) {
    console.error("Failed to create resumable upload session:", err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: "DRIVE_SESSION_ERROR",
        message: err.message || "Failed to create Google Drive upload session"
      }
    });
  }
}
export {
  handler as default
};
