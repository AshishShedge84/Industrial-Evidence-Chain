import { db } from './db';
import {
  DEFAULT_USERS,
  DEFAULT_ASSETS,
  DEFAULT_EVIDENCE,
  DEFAULT_VERIFICATION,
  DEFAULT_ASSET_HISTORY,
  DEFAULT_AUDIT,
  DEFAULT_NOTIFICATIONS
} from './seed';

// For backward compatibility for services that haven't been updated to use `db` directly yet.
// Instead of evaluating at module load (which causes circular dependency issues), we use getters.

export const mockUsers = db.getUsers();
export const mockAssets = db.getAssets();
export const mockEvidence = db.getEvidence();
export const mockVerificationResults = db.getVerificationResults();
export const mockAssetHistory = db.getDb().assetHistory;
export const mockAuditTrail = db.getAuditLogs();
export const mockNotifications = db.getNotifications();

export function getMockUserByEmail(email: string) {
  return db.getUsers().find((u) => u.email === email);
}

export function saveMockUsers() {
  // handled by db now
}