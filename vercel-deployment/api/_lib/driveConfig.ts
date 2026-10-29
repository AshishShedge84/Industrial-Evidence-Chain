/**
 * Google Drive Enterprise Integration Configuration
 * Authoritative constants and environment variable bindings.
 */

export const DRIVE_CONFIG = {
  // Configured Google Drive Folder IDs
  DEFAULT_ROOT_FOLDER_ID: '1M7uMS4jEqcZcHqAcFo4xFKMw4Zq3U8OR',
  DEFAULT_PHOTO_FOLDER_ID: '1IAAhox8zZx1uCUwumiBtg0ZTKHvMfOM9',
  DEFAULT_VIDEO_FOLDER_ID: '1xLTaHhSU1iaCmpTXMPK6EXqFY13QLR-V',

  // Least-privilege OAuth scopes
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ],

  // Google OAuth Endpoints
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  USERINFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
  DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
  DRIVE_UPLOAD_BASE: 'https://www.googleapis.com/upload/drive/v3',
};

export function getDriveEnv() {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const defaultRedirect = isProd
    ? 'https://iec-firebase-deployment.vercel.app/api/integrations/google-drive/oauth/callback'
    : 'http://localhost:5173/api/integrations/google-drive/oauth/callback';

  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || defaultRedirect,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DRIVE_CONFIG.DEFAULT_ROOT_FOLDER_ID,
    photoFolderId: process.env.GOOGLE_DRIVE_PHOTO_FOLDER_ID || DRIVE_CONFIG.DEFAULT_PHOTO_FOLDER_ID,
    videoFolderId: process.env.GOOGLE_DRIVE_VIDEO_FOLDER_ID || DRIVE_CONFIG.DEFAULT_VIDEO_FOLDER_ID,
    stateSecret: process.env.GOOGLE_DRIVE_STATE_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'iec-drive-secure-oauth-state-secret-default',
    configuredRefreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
    firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'electronics-gadget-review-sys',
  };
}
