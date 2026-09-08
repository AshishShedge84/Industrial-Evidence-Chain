import type { User } from '@type-defs/auth';
import type { Asset, AssetHistoryEntry } from '@type-defs/asset';
import type { Evidence } from '@type-defs/evidence';
import type { VerificationResult, AuditTrailEntry } from '@type-defs/verification';
import type { Notification } from '@type-defs/notification';
import {
  DEFAULT_USERS,
  DEFAULT_ASSETS,
  DEFAULT_EVIDENCE,
  DEFAULT_VERIFICATION,
  DEFAULT_ASSET_HISTORY,
  DEFAULT_AUDIT,
  DEFAULT_NOTIFICATIONS,
} from './seed';

interface DbSchema {
  users: User[];
  assets: Asset[];
  evidence: Evidence[];
  verification: VerificationResult[];
  assetHistory: AssetHistoryEntry[];
  auditLogs: AuditTrailEntry[];
  notifications: Notification[];
}

const DB_KEY = 'iec_temporary_db';

class TemporaryDatabase {
  getDb(): DbSchema {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DbSchema;
        let needsSave = false;

        if (!parsed.notifications) {
          parsed.notifications = DEFAULT_NOTIFICATIONS;
          needsSave = true;
        }

        // Ensure users have role-based defaults if missing
        if (parsed.users && parsed.users.length > 0) {
          parsed.users = parsed.users.map(u => {
            const defaultUser = DEFAULT_USERS.find(du => du.id === u.id);
            if (defaultUser) {
              if (!u.contactNumber && defaultUser.contactNumber) {
                u.contactNumber = defaultUser.contactNumber;
                needsSave = true;
              }
              if (!u.selectedMemoji && defaultUser.selectedMemoji) {
                u.selectedMemoji = defaultUser.selectedMemoji;
                needsSave = true;
              }
              if (!u.avatarType && defaultUser.avatarType) {
                u.avatarType = defaultUser.avatarType;
                needsSave = true;
              }
            }
            return u;
          });
        }

        if (needsSave) {
          this.saveDb(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse temporary database:', e);
    }
    
    // Seed DB if empty or invalid
    const initialDb: DbSchema = {
      users: DEFAULT_USERS,
      assets: DEFAULT_ASSETS,
      evidence: DEFAULT_EVIDENCE,
      verification: DEFAULT_VERIFICATION,
      assetHistory: DEFAULT_ASSET_HISTORY,
      auditLogs: DEFAULT_AUDIT,
      notifications: DEFAULT_NOTIFICATIONS,
    };
    
    localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
    return initialDb;
  }

  private saveDb(db: DbSchema) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // Users
  getUsers() { return this.getDb().users; }
  saveUser(user: User) {
    const db = this.getDb();
    const index = db.users.findIndex(u => u.id === user.id);
    if (index >= 0) db.users[index] = user;
    else db.users.push(user);
    this.saveDb(db);
  }

  // Assets
  getAssets() { return this.getDb().assets; }
  saveAsset(asset: Asset) {
    const db = this.getDb();
    const index = db.assets.findIndex(a => a.id === asset.id);
    if (index >= 0) db.assets[index] = asset;
    else db.assets.push(asset);
    this.saveDb(db);
  }
  deleteAsset(id: string) {
    const db = this.getDb();
    db.assets = db.assets.filter(a => a.id !== id);
    this.saveDb(db);
  }

  // Evidence
  getEvidence() { return this.getDb().evidence; }
  saveEvidence(evidence: Evidence) {
    const db = this.getDb();
    const index = db.evidence.findIndex(e => (e as any).id === (evidence as any).id);
    if (index >= 0) db.evidence[index] = evidence;
    else db.evidence.push(evidence);
    this.saveDb(db);
  }

  // Verification
  getVerificationResults() { return this.getDb().verification; }

  // Audit
  getAuditLogs() { return this.getDb().auditLogs; }
  saveAuditLog(log: AuditTrailEntry) {
    const db = this.getDb();
    db.auditLogs.unshift(log); // Add to beginning
    this.saveDb(db);
  }

  // Notifications
  getNotifications() { return this.getDb().notifications; }
  saveNotification(notification: Notification) {
    const db = this.getDb();
    const index = db.notifications.findIndex(n => n.id === notification.id);
    if (index >= 0) db.notifications[index] = notification;
    else db.notifications.unshift(notification);
    this.saveDb(db);
  }
  setNotifications(notifications: Notification[]) {
    const db = this.getDb();
    db.notifications = notifications;
    this.saveDb(db);
  }
  reset() {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  }
}

export const db = new TemporaryDatabase();
