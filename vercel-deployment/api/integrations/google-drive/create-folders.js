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
async function createDriveFolder(name, parentFolderId, req) {
  const accessToken = await getValidAccessToken(req);
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.folder"
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }
  const res = await fetch(`${DRIVE_CONFIG.DRIVE_API_BASE}/files?fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create folder in Google Drive (HTTP ${res.status}): ${errText}`);
  }
  const data = await res.json();
  return { id: data.id, name: data.name };
}
async function searchFolder(name, parentFolderId, req) {
  const accessToken = await getValidAccessToken(req);
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }
  const url = `${DRIVE_CONFIG.DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,capabilities)&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, name: data.files[0].name };
  }
  return null;
}

// api-src/_lib/folderStore.ts
import crypto2 from "crypto";
var memoryFolderStore = null;
function encryptConfig(text, secret) {
  const key = crypto2.createHash("sha256").update(secret).digest();
  const iv = crypto2.randomBytes(12);
  const cipher = crypto2.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}
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
async function saveEffectiveFolderConfig(config) {
  const env = getDriveEnv();
  const current = await getEffectiveFolderConfig();
  const updated = {
    rootFolderId: config.rootFolderId || current.rootFolderId || env.rootFolderId,
    photoFolderId: config.photoFolderId || current.photoFolderId || env.photoFolderId,
    videoFolderId: config.videoFolderId || current.videoFolderId || env.videoFolderId,
    rootFolderName: config.rootFolderName ?? current.rootFolderName,
    photoFolderName: config.photoFolderName ?? current.photoFolderName,
    videoFolderName: config.videoFolderName ?? current.videoFolderName,
    foldersVerified: config.foldersVerified ?? true,
    verifiedAt: config.verifiedAt || (/* @__PURE__ */ new Date()).toISOString(),
    source: "firestore"
  };
  memoryFolderStore = updated;
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_settings/google_drive`;
  try {
    const fields = {
      rootFolderId: { stringValue: updated.rootFolderId },
      photoFolderId: { stringValue: updated.photoFolderId },
      videoFolderId: { stringValue: updated.videoFolderId },
      foldersVerified: { booleanValue: updated.foldersVerified },
      updatedAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
    };
    if (updated.rootFolderName) fields.rootFolderName = { stringValue: updated.rootFolderName };
    if (updated.photoFolderName) fields.photoFolderName = { stringValue: updated.photoFolderName };
    if (updated.videoFolderName) fields.videoFolderName = { stringValue: updated.videoFolderName };
    if (updated.verifiedAt) fields.verifiedAt = { stringValue: updated.verifiedAt };
    await fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
  } catch (err) {
    console.warn("Could not persist folder config to Firestore system_settings (memory store active):", err);
  }
  return updated;
}
function buildFolderCookie(config) {
  const env = getDriveEnv();
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  const encrypted = encryptConfig(JSON.stringify(config), env.stateSecret);
  return [
    `iec_drive_folders=${encrypted}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=31536000",
    // 1 year
    isProd ? "Secure" : ""
  ].filter(Boolean).join("; ");
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

// api-src/integrations/google-drive/create-folders.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const user = await authenticateRequest(req);
  if (!user) {
    return sendJson(res, 401, {
      error: "Unauthorized: Authentication required to provision Google Drive folders."
    });
  }
  try {
    const env = getDriveEnv();
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }
    const body = rawBody ? JSON.parse(rawBody) : {};
    const requestedRootId = body.rootFolderId || env.rootFolderId;
    let rootFolder;
    const rootCheck = await checkFolderAccess(requestedRootId, req);
    if (rootCheck.accessible) {
      rootFolder = { id: requestedRootId, name: rootCheck.name || "Configured Evidence Root" };
    } else {
      const existingVault = await searchFolder("IEC Industrial Evidence Vault", void 0, req);
      if (existingVault) {
        rootFolder = existingVault;
      } else {
        rootFolder = await createDriveFolder("IEC Industrial Evidence Vault", void 0, req);
      }
    }
    let photoFolder = await searchFolder("Photo Evidence", rootFolder.id, req);
    if (!photoFolder) {
      photoFolder = await createDriveFolder("Photo Evidence", rootFolder.id, req);
    }
    let videoFolder = await searchFolder("Video Evidence", rootFolder.id, req);
    if (!videoFolder) {
      videoFolder = await createDriveFolder("Video Evidence", rootFolder.id, req);
    }
    const savedConfig = await saveEffectiveFolderConfig({
      rootFolderId: rootFolder.id,
      photoFolderId: photoFolder.id,
      videoFolderId: videoFolder.id,
      rootFolderName: rootFolder.name,
      photoFolderName: photoFolder.name,
      videoFolderName: videoFolder.name,
      foldersVerified: true,
      verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.setHeader("Set-Cookie", buildFolderCookie(savedConfig));
    return sendJson(res, 200, {
      success: true,
      message: "Evidence folders provisioned and verified in Google Drive under drive.file scope.",
      data: {
        rootFolderId: rootFolder.id,
        rootFolderName: rootFolder.name,
        photoFolderId: photoFolder.id,
        photoFolderName: photoFolder.name,
        videoFolderId: videoFolder.id,
        videoFolderName: videoFolder.name,
        verified: true,
        instructions: {
          note: "To preserve these folder destinations across all serverless deployments, add these environment variables to Vercel Production Settings:",
          envVars: {
            GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolder.id,
            GOOGLE_DRIVE_PHOTO_FOLDER_ID: photoFolder.id,
            GOOGLE_DRIVE_VIDEO_FOLDER_ID: videoFolder.id
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to provision Drive folders:", err);
    return sendJson(res, 500, {
      success: false,
      error: {
        code: "PROVISION_FOLDERS_ERROR",
        message: err.message || "Failed to create folders in Google Drive"
      }
    });
  }
}
export {
  handler as default
};
