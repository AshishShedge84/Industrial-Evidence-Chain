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

// api-src/_lib/driveClient.ts
import crypto2 from "crypto";

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
async function uploadFileToDrive(params, req) {
  const accessToken = await getValidAccessToken(req);
  const hash = crypto2.createHash("sha256").update(params.fileBuffer).digest("hex");
  const boundary = `-------iec_drive_${Date.now()}_${crypto2.randomBytes(8).toString("hex")}`;
  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
    description: params.description || `IEC Evidence Asset notarized with SHA-256: ${hash}`,
    properties: {
      iecChecksum: hash,
      iecTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  const metadataPart = Buffer.from(
    `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${JSON.stringify(metadata)}\r
`
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r
Content-Type: ${params.mimeType}\r
Content-Transfer-Encoding: binary\r
\r
`
  );
  const closingPart = Buffer.from(`\r
--${boundary}--\r
`);
  const multipartBody = Buffer.concat([metadataPart, mediaHeader, params.fileBuffer, closingPart]);
  const uploadUrl = `${DRIVE_CONFIG.DRIVE_UPLOAD_BASE}/files?uploadType=multipart&supportsAllDrives=true`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": multipartBody.length.toString()
    },
    body: multipartBody
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Google Drive upload failed with status ${response.status}`);
  }
  return {
    fileId: data.id,
    fileName: data.name || params.fileName,
    folderId: params.folderId,
    size: params.fileBuffer.length,
    checksum: hash,
    mimeType: params.mimeType,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
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

// api-src/integrations/google-drive/upload.ts
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const user = await authenticateRequest(req);
  const isAuthorized = user || process.env.NODE_ENV !== "production";
  if (!isAuthorized) {
    return sendJson(res, 401, { error: "Unauthorized: Authentication required to upload industrial evidence." });
  }
  try {
    const env = getDriveEnv();
    const rawBody = await readRawBody(req);
    const contentType = req.headers["content-type"] || "";
    let fileName = "evidence-asset";
    let mimeType = "application/octet-stream";
    let fileType = "photo";
    let evidenceId;
    let clientChecksum;
    let fileBuffer;
    if (contentType.includes("application/json")) {
      const json = JSON.parse(rawBody.toString("utf8"));
      if (!json.fileBase64) {
        return sendJson(res, 400, { error: "Missing fileBase64 data in JSON payload" });
      }
      fileBuffer = Buffer.from(json.fileBase64, "base64");
      fileName = json.fileName || `evidence-${Date.now()}`;
      mimeType = json.mimeType || (json.fileType === "video" ? "video/mp4" : "image/jpeg");
      fileType = json.fileType === "video" || mimeType.startsWith("video/") ? "video" : "photo";
      evidenceId = json.evidenceId;
      clientChecksum = json.clientChecksum;
    } else {
      fileBuffer = rawBody;
      mimeType = contentType.split(";")[0] || "application/octet-stream";
      fileName = req.headers["x-file-name"] || `evidence-${Date.now()}`;
      fileType = req.headers["x-file-type"] === "video" || mimeType.startsWith("video/") ? "video" : "photo";
      evidenceId = req.headers["x-evidence-id"];
      clientChecksum = req.headers["x-client-checksum"];
    }
    if (fileBuffer.length === 0) {
      return sendJson(res, 400, { error: "Empty file payload" });
    }
    const targetFolderId = fileType === "video" ? env.videoFolderId : env.photoFolderId;
    const uploadResult = await uploadFileToDrive(
      {
        folderId: targetFolderId,
        fileName,
        mimeType,
        fileBuffer,
        description: evidenceId ? `IEC Evidence for Record ID: ${evidenceId}` : void 0
      },
      req
    );
    if (clientChecksum && clientChecksum.toLowerCase() !== uploadResult.checksum.toLowerCase()) {
      return sendJson(res, 400, {
        error: "Integrity validation failed: Server-computed SHA-256 hash differs from client checksum.",
        computedChecksum: uploadResult.checksum,
        expectedChecksum: clientChecksum
      });
    }
    return sendJson(res, 200, {
      success: true,
      data: {
        ...uploadResult,
        evidenceId,
        fileType
      }
    });
  } catch (err) {
    console.error("Google Drive upload error:", err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || "Failed to upload evidence file to Google Drive"
    });
  }
}
export {
  handler as default
};
