import type { Notification } from '@type-defs/notification';
import { apiClient } from '@services/api/apiClient';

let cachedNotifications: Notification[] = [];
let isSyncing = false;

function getStoredArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredArray(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

function getStoredReplies(userId: string): Notification[] {
  try {
    const raw = localStorage.getItem(`iec_user_replies_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredReply(userId: string, reply: Notification): void {
  try {
    const existing = getStoredReplies(userId);
    existing.push(reply);
    localStorage.setItem(`iec_user_replies_${userId}`, JSON.stringify(existing));
  } catch {
    // Ignore quota errors
  }
}

export const notificationService = {
  getNotifications(): Notification[] {
    return cachedNotifications;
  },

  getNotificationsForUser(userId: string, role?: string): Notification[] {
    const clearedIds = new Set(getStoredArray(`iec_cleared_notifications_${userId}`));
    const readIds = new Set(getStoredArray(`iec_read_notifications_${userId}`));

    const userReplies = getStoredReplies(userId);
    const combined = [...cachedNotifications, ...userReplies];

    // Deduplicate by ID
    const seen = new Set<string>();
    const filtered: Notification[] = [];

    for (const notif of combined) {
      if (seen.has(notif.id)) continue;
      seen.add(notif.id);

      if (clearedIds.has(notif.id)) continue;

      filtered.push({
        ...notif,
        read: notif.read || readIds.has(notif.id),
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getUnreadCount(userId: string, role?: string): number {
    return this.getNotificationsForUser(userId, role).filter((n) => !n.read).length;
  },

  async syncRealEvents(userId: string, role?: string): Promise<Notification[]> {
    if (isSyncing) return this.getNotificationsForUser(userId, role);
    isSyncing = true;

    try {
      const res = await apiClient.get<{ items: any[]; total: number }>('/evidence?pageSize=25');
      if (res.success && res.data?.items) {
        const events: Notification[] = [];

        for (const item of res.data.items) {
          const evidenceId = item.evidenceId;
          const assetName = item.assetName || 'Industrial Asset';
          const assetCode = item.assetCode ? ` (${item.assetCode})` : '';
          const techName = item.userName || 'Technician';

          if (item.verificationStatus === 'PENDING_VERIFICATION') {
            events.push({
              id: `notif-pending-${evidenceId}`,
              recipientId: 'all',
              senderId: item.userId,
              senderName: techName,
              title: 'Evidence Pending Verification',
              message: `${assetName}${assetCode} evidence submitted by ${techName}. Awaiting Manager cryptographic review.`,
              type: 'alert',
              read: false,
              createdAt: item.createdAt || item.timestamp,
              relatedEntity: 'evidence',
              relatedEntityId: evidenceId,
              actionUrl: `/evidence/${evidenceId}`,
            });
          } else if (item.verificationStatus === 'VERIFIED') {
            events.push({
              id: `notif-verified-${evidenceId}`,
              recipientId: 'all',
              senderId: 'manager',
              senderName: item.verifiedBy || 'Manager',
              title: 'Integrity Match Verified',
              message: `${assetName}${assetCode} passed cryptographic hash comparison against Hyperledger Fabric ledger anchor.`,
              type: 'success',
              read: false,
              createdAt: item.verifiedAt || item.createdAt,
              relatedEntity: 'evidence',
              relatedEntityId: evidenceId,
              actionUrl: `/evidence/${evidenceId}`,
            });
          } else if (item.verificationStatus === 'INTEGRITY_MISMATCH') {
            events.push({
              id: `notif-mismatch-${evidenceId}`,
              recipientId: 'all',
              senderId: 'system',
              senderName: 'Blockchain Sentinel',
              title: 'CRITICAL: Integrity Mismatch',
              message: `Cryptographic tampering or mismatch detected for ${assetName}${assetCode}. Anchor hash does not match live state.`,
              type: 'alert',
              read: false,
              createdAt: item.verifiedAt || item.createdAt,
              relatedEntity: 'evidence',
              relatedEntityId: evidenceId,
              actionUrl: `/evidence/${evidenceId}`,
            });
          }
        }

        cachedNotifications = events;
      }
    } catch {
      // Offline fallback: keep existing cached notifications
    } finally {
      isSyncing = false;
    }

    return this.getNotificationsForUser(userId, role);
  },

  sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const newNotification: Notification = {
      senderId: 'system',
      senderName: 'System',
      ...notification,
      id: `NOT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    cachedNotifications.unshift(newNotification);
    return newNotification;
  },

  markAsRead(id: string, userId?: string): void {
    if (userId) {
      const readKey = `iec_read_notifications_${userId}`;
      const existing = getStoredArray(readKey);
      if (!existing.includes(id)) {
        existing.push(id);
        setStoredArray(readKey, existing);
      }
    }

    const found = cachedNotifications.find((n) => n.id === id);
    if (found) {
      found.read = true;
    }
  },

  markAllAsRead(userId: string): void {
    const userNotifs = this.getNotificationsForUser(userId);
    const readKey = `iec_read_notifications_${userId}`;
    const existing = new Set(getStoredArray(readKey));

    userNotifs.forEach((n) => {
      existing.add(n.id);
      n.read = true;
    });

    setStoredArray(readKey, Array.from(existing));
  },

  clearAll(userId: string): void {
    const userNotifs = this.getNotificationsForUser(userId);
    const clearedKey = `iec_cleared_notifications_${userId}`;
    const existing = new Set(getStoredArray(clearedKey));

    userNotifs.forEach((n) => existing.add(n.id));
    setStoredArray(clearedKey, Array.from(existing));
  },

  sendReply(params: {
    notificationId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    message: string;
  }): Notification {
    const original = cachedNotifications.find((n) => n.id === params.notificationId);
    if (original) {
      original.replied = true;
      original.replyText = params.message;
      original.repliedAt = new Date().toISOString();
      original.read = true;
    }

    const replyNotification: Notification = {
      id: `NOT-REPLY-${Date.now()}`,
      recipientId: params.recipientId,
      senderId: params.senderId,
      senderName: params.senderName,
      title: `Reply from ${params.senderName}`,
      message: params.message,
      type: 'message',
      read: true,
      createdAt: new Date().toISOString(),
      relatedEntity: original?.relatedEntity,
      relatedEntityId: original?.relatedEntityId,
    };

    saveStoredReply(params.senderId, replyNotification);
    cachedNotifications.unshift(replyNotification);

    return replyNotification;
  },

  broadcastToHierarchy(notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'recipientId'>, minRole: string): void {
    this.sendNotification({
      ...notification,
      recipientId: 'all',
    });
  },
};
