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
import crypto from "crypto";
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
function decryptToken(encryptedString) {
  try {
    const [ivHex, tagHex, dataHex] = encryptedString.split(".");
    if (!ivHex || !tagHex || !dataHex) return null;
    const env = getDriveEnv();
    const key = crypto.createHash("sha256").update(env.stateSecret).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
async function getStoredDriveIntegration(req) {
  const env = getDriveEnv();
  if (env.configuredRefreshToken) {
    return {
      refreshToken: env.configuredRefreshToken,
      accountEmail: "Configured via Vercel Environment",
      scope: DRIVE_CONFIG.SCOPES[0],
      connectedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (req?.headers?.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("iec_drive_refresh_token="));
    if (tokenCookie) {
      const encryptedValue = tokenCookie.replace("iec_drive_refresh_token=", "");
      const decryptedToken = decryptToken(encryptedValue);
      if (decryptedToken) {
        return {
          refreshToken: decryptedToken,
          accountEmail: "Authorized via Secure Session Cookie",
          scope: DRIVE_CONFIG.SCOPES[0],
          connectedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
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
async function getValidAccessToken(req) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 6e4) {
    return cachedAccessToken.token;
  }
  const integration = await getStoredDriveIntegration(req);
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
async function checkFolderAccess(folderId, req) {
  try {
    const accessToken = await getValidAccessToken(req);
    const url = `${DRIVE_CONFIG.DRIVE_API_BASE}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed,capabilities&supportsAllDrives=true`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.trashed) {
        return {
          id: folderId,
          name: data.name,
          accessible: false,
          error: "Folder exists in Google Drive but is located in the Trash."
        };
      }
      return {
        id: folderId,
        name: data.name,
        accessible: true
      };
    }
    if (res.status === 404 || res.status === 403) {
      return {
        id: folderId,
        accessible: false,
        error: `Folder returned HTTP ${res.status}. Under the least-privilege 'drive.file' scope, Google Drive only permits access to folders created by this app or opened/selected via Google Picker.`,
        scopeNotice: "To authorize an existing pre-created folder under drive.file, ensure the folder was created by or shared with the authenticated account, or authorize it via Google Picker."
      };
    }
    const errData = await res.json().catch(() => ({}));
    return {
      id: folderId,
      accessible: false,
      error: errData.error?.message || `HTTP ${res.status} error accessing folder`
    };
  } catch (err) {
    return {
      id: folderId,
      accessible: false,
      error: err.message || "Failed to communicate with Google Drive API"
    };
  }
}

// api-src/_lib/folderStore.ts
import crypto2 from "crypto";
var memoryFolderStore = null;
function decryptConfig(encryptedString, secret) {
  try {
    const [ivHex, tagHex, dataHex] = encryptedString.split(".");
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = crypto2.createHash("sha256").update(secret).digest();
    const decipher = crypto2.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
async function getEffectiveFolderConfig(req) {
  const env = getDriveEnv();
  if (memoryFolderStore && memoryFolderStore.foldersVerified) {
    return { ...memoryFolderStore, source: "memory" };
  }
  if (req?.headers?.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith("iec_drive_folders="));
    if (cookie) {
      const encryptedValue = cookie.replace("iec_drive_folders=", "");
      const decrypted = decryptConfig(encryptedValue, env.stateSecret);
      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          if (parsed.photoFolderId && parsed.videoFolderId) {
            const config = { ...parsed, source: "cookie" };
            memoryFolderStore = config;
            return config;
          }
        } catch {
        }
      }
    }
  }
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_settings/google_drive`;
  try {
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};
      const rootFolderId = fields.rootFolderId?.stringValue;
      const photoFolderId = fields.photoFolderId?.stringValue;
      const videoFolderId = fields.videoFolderId?.stringValue;
      if (photoFolderId && videoFolderId) {
        const config = {
          rootFolderId: rootFolderId || env.rootFolderId,
          photoFolderId,
          videoFolderId,
          rootFolderName: fields.rootFolderName?.stringValue,
          photoFolderName: fields.photoFolderName?.stringValue,
          videoFolderName: fields.videoFolderName?.stringValue,
          foldersVerified: fields.foldersVerified?.booleanValue ?? true,
          verifiedAt: fields.verifiedAt?.stringValue,
          source: "firestore"
        };
        memoryFolderStore = config;
        return config;
      }
    }
  } catch {
  }
  return {
    rootFolderId: env.rootFolderId,
    photoFolderId: env.photoFolderId,
    videoFolderId: env.videoFolderId,
    foldersVerified: false,
    source: "environment"
  };
}

// api-src/_lib/authMiddleware.ts
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// api-src/integrations/google-drive/status.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  try {
    const env = getDriveEnv();
    const isConfigured = Boolean(env.clientId && env.clientSecret);
    const integration = await getStoredDriveIntegration(req);
    const isConnected = Boolean(integration?.refreshToken);
    const effectiveFolders = await getEffectiveFolderConfig(req);
    let folderStatus = {
      root: { id: effectiveFolders.rootFolderId, accessible: false, error: isConnected ? void 0 : "Drive not connected" },
      photos: { id: effectiveFolders.photoFolderId, accessible: false, error: isConnected ? void 0 : "Drive not connected" },
      videos: { id: effectiveFolders.videoFolderId, accessible: false, error: isConnected ? void 0 : "Drive not connected" }
    };
    if (isConnected) {
      const [rootCheck, photoCheck, videoCheck] = await Promise.all([
        checkFolderAccess(effectiveFolders.rootFolderId, req),
        checkFolderAccess(effectiveFolders.photoFolderId, req),
        checkFolderAccess(effectiveFolders.videoFolderId, req)
      ]);
      folderStatus = {
        root: rootCheck,
        photos: photoCheck,
        videos: videoCheck
      };
    }
    return sendJson(res, 200, {
      success: true,
      data: {
        configured: isConfigured,
        connected: isConnected,
        scope: DRIVE_CONFIG.SCOPES[0],
        accountEmail: integration?.accountEmail,
        connectedAt: integration?.connectedAt,
        folders: folderStatus,
        requiredFolders: {
          rootFolderId: env.rootFolderId,
          photoFolderId: env.photoFolderId,
          videoFolderId: env.videoFolderId
        },
        effectiveFolders: {
          rootFolderId: effectiveFolders.rootFolderId,
          photoFolderId: effectiveFolders.photoFolderId,
          videoFolderId: effectiveFolders.videoFolderId,
          source: effectiveFolders.source,
          foldersVerified: effectiveFolders.foldersVerified,
          verifiedAt: effectiveFolders.verifiedAt
        },
        setupStatus: {
          hasClientId: Boolean(env.clientId),
          hasClientSecret: Boolean(env.clientSecret),
          hasRefreshToken: isConnected,
          redirectUri: env.redirectUri
        }
      }
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      error: err.message || "Failed to determine Google Drive connection status"
    });
  }
}
export {
  handler as default
};
