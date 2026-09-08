import usersData from '../../Temporary databases/users.json';
import assetsData from '../../Temporary databases/assets.json';
import evidenceData from '../../Temporary databases/evidence.json';
import verificationData from '../../Temporary databases/verification.json';
import auditLogsData from '../../Temporary databases/auditLogs.json';
import notificationsData from '../../Temporary databases/notifications.json';

export const DEFAULT_USERS = usersData.users as any[];
export const DEFAULT_ASSETS = assetsData.assets as any[];
export const DEFAULT_EVIDENCE = evidenceData.evidence as any[];
export const DEFAULT_VERIFICATION = verificationData.verification as any[];
export const DEFAULT_ASSET_HISTORY = [] as any[]; // Optional, could have a file too
export const DEFAULT_AUDIT = auditLogsData.auditLogs as any[];
export const DEFAULT_NOTIFICATIONS = notificationsData.notifications as any[];
