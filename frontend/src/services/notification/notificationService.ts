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

      // STRICT USER ISOLATION: Never display another user's notifications
      if (notif.recipientId && notif.recipientId !== userId && notif.recipientId !== 'all') {
        continue;
      }

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

  clearCache(): void {
    cachedNotifications = [];
  },

  async syncRealEvents(userId: string, role?: string): Promise<Notification[]> {
    if (isSyncing) return this.getNotificationsForUser(userId, role);
    isSyncing = true;

    try {
      const res = await apiClient.get<any[]>('/notifications');
      if (res.success && res.data) {
        const events: Notification[] = res.data.map((item: any) => {
          let badgeType: 'alert' | 'success' | 'info' | 'message' = 'info';
          if (item.type === 'VerificationRequest') badgeType = 'alert';
          else if (item.type === 'EvidenceVerified') badgeType = 'success';
          else if (item.type === 'VerificationFailed') badgeType = 'alert';

          const isEvidence = item.type === 'VerificationRequest' || item.type === 'EvidenceVerified' || item.type === 'VerificationFailed';

          return {
            id: item.notificationId,
            recipientId: item.userId,
            title: item.title,
            message: item.message,
            type: badgeType,
            read: item.isRead,
            createdAt: item.createdAt,
            relatedEntity: isEvidence ? 'evidence' : 'asset',
            relatedEntityId: item.relatedEntityId,
            actionUrl: isEvidence
              ? `/evidence/${item.relatedEntityId}`
              : item.relatedEntityId ? `/assets/${item.relatedEntityId}` : undefined,
            senderName: item.type === 'VerificationRequest' ? 'Field Technician' : 'IEC Ledger Engine'
          };
        });
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

  async markAsRead(id: string, userId?: string): Promise<void> {
    const found = cachedNotifications.find((n) => n.id === id);
    if (found) {
      found.read = true;
    }
    if (userId) {
      const readKey = `iec_read_notifications_${userId}`;
      const existing = new Set(getStoredArray(readKey));
      existing.add(id);
      setStoredArray(readKey, Array.from(existing));
    }
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
    } catch {
      // Ignore
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    cachedNotifications.forEach((n) => {
      if (!n.recipientId || n.recipientId === userId || n.recipientId === 'all') {
        n.read = true;
      }
    });
    const userNotifs = this.getNotificationsForUser(userId);
    const readKey = `iec_read_notifications_${userId}`;
    const existing = new Set(getStoredArray(readKey));
    userNotifs.forEach((n) => existing.add(n.id));
    setStoredArray(readKey, Array.from(existing));

    try {
      await apiClient.patch(`/notifications/read-all`, {});
    } catch {
      // Ignore
    }
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
