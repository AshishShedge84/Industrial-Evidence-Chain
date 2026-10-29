/**
 * Industrial Evidence Chain (IEC) - Effective Google Drive Folder Storage
 * 
 * Manages the resolution and persistence of verified Google Drive folder IDs across:
 * 1. Cloud Firestore (system_settings/google_drive)
 * 2. Encrypted HttpOnly session cookie (iec_drive_folders)
 * 3. In-memory serverless container cache
 * 4. Environment variable defaults
 */

import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import { getDriveEnv, DRIVE_CONFIG } from './driveConfig.js';

export interface EffectiveFolderConfig {
  rootFolderId: string;
  photoFolderId: string;
  videoFolderId: string;
  rootFolderName?: string;
  photoFolderName?: string;
  videoFolderName?: string;
  foldersVerified?: boolean;
  verifiedAt?: string;
  source?: 'firestore' | 'cookie' | 'memory' | 'environment';
}

// In-memory cache across serverless warm invocations
let memoryFolderStore: EffectiveFolderConfig | null = null;

/**
 * Encrypt folder config string using AES-256-GCM
 */
function encryptConfig(text: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

/**
 * Decrypt folder config string
 */
function decryptConfig(encryptedString: string, secret: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = encryptedString.split('.');
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Read effective folder configuration with fallback cascade
 */
export async function getEffectiveFolderConfig(req?: IncomingMessage): Promise<EffectiveFolderConfig> {
  const env = getDriveEnv();

  // 1. In-memory container store (fastest)
  if (memoryFolderStore && memoryFolderStore.foldersVerified) {
    return { ...memoryFolderStore, source: 'memory' };
  }

  // 2. Encrypted cookie from request
  if (req?.headers?.cookie) {
    const cookies = req.headers.cookie.split(';').map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith('iec_drive_folders='));
    if (cookie) {
      const encryptedValue = cookie.replace('iec_drive_folders=', '');
      const decrypted = decryptConfig(encryptedValue, env.stateSecret);
      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          if (parsed.photoFolderId && parsed.videoFolderId) {
            const config: EffectiveFolderConfig = { ...parsed, source: 'cookie' };
            memoryFolderStore = config;
            return config;
          }
        } catch {
          // Continue to Firestore
        }
      }
    }
  }

  // 3. Firestore REST document (system_settings/google_drive)
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_settings/google_drive`;
  try {
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const doc = (await res.json()) as any;
      const fields = doc.fields || {};
      const rootFolderId = fields.rootFolderId?.stringValue;
      const photoFolderId = fields.photoFolderId?.stringValue;
      const videoFolderId = fields.videoFolderId?.stringValue;

      if (photoFolderId && videoFolderId) {
        const config: EffectiveFolderConfig = {
          rootFolderId: rootFolderId || env.rootFolderId,
          photoFolderId,
          videoFolderId,
          rootFolderName: fields.rootFolderName?.stringValue,
          photoFolderName: fields.photoFolderName?.stringValue,
          videoFolderName: fields.videoFolderName?.stringValue,
          foldersVerified: fields.foldersVerified?.booleanValue ?? true,
          verifiedAt: fields.verifiedAt?.stringValue,
          source: 'firestore',
        };
        memoryFolderStore = config;
        return config;
      }
    }
  } catch {
    // Continue to environment fallback
  }

  // 4. Environment variables fallback
  return {
    rootFolderId: env.rootFolderId,
    photoFolderId: env.photoFolderId,
    videoFolderId: env.videoFolderId,
    foldersVerified: false,
    source: 'environment',
  };
}

/**
 * Persist verified folder IDs to in-memory store and Firestore system_settings
 */
export async function saveEffectiveFolderConfig(
  config: Partial<EffectiveFolderConfig>
): Promise<EffectiveFolderConfig> {
  const env = getDriveEnv();
  const current = await getEffectiveFolderConfig();

  const updated: EffectiveFolderConfig = {
    rootFolderId: config.rootFolderId || current.rootFolderId || env.rootFolderId,
    photoFolderId: config.photoFolderId || current.photoFolderId || env.photoFolderId,
    videoFolderId: config.videoFolderId || current.videoFolderId || env.videoFolderId,
    rootFolderName: config.rootFolderName ?? current.rootFolderName,
    photoFolderName: config.photoFolderName ?? current.photoFolderName,
    videoFolderName: config.videoFolderName ?? current.videoFolderName,
    foldersVerified: config.foldersVerified ?? true,
    verifiedAt: config.verifiedAt || new Date().toISOString(),
    source: 'firestore',
  };

  memoryFolderStore = updated;

  // Persist to Firestore system_settings/google_drive
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.firebaseProjectId}/databases/(default)/documents/system_settings/google_drive`;
  try {
    const fields: Record<string, any> = {
      rootFolderId: { stringValue: updated.rootFolderId },
      photoFolderId: { stringValue: updated.photoFolderId },
      videoFolderId: { stringValue: updated.videoFolderId },
      foldersVerified: { booleanValue: updated.foldersVerified },
      updatedAt: { stringValue: new Date().toISOString() },
    };

    if (updated.rootFolderName) fields.rootFolderName = { stringValue: updated.rootFolderName };
    if (updated.photoFolderName) fields.photoFolderName = { stringValue: updated.photoFolderName };
    if (updated.videoFolderName) fields.videoFolderName = { stringValue: updated.videoFolderName };
    if (updated.verifiedAt) fields.verifiedAt = { stringValue: updated.verifiedAt };

    await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch (err) {
    console.warn('Could not persist folder config to Firestore system_settings (memory store active):', err);
  }

  return updated;
}

/**
 * Create a Set-Cookie header value for effective folders
 */
export function buildFolderCookie(config: EffectiveFolderConfig): string {
  const env = getDriveEnv();
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const encrypted = encryptConfig(JSON.stringify(config), env.stateSecret);

  return [
    `iec_drive_folders=${encrypted}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=31536000', // 1 year
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}
