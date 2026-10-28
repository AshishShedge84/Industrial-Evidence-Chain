import type { Notification } from '@type-defs/notification';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';

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
  } catch {}
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
  } catch {}
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
      const notifsRef = collection(db, 'notifications');
      const snap = await getDocs(notifsRef);

      if (!snap.empty) {
        const events: Notification[] = [];
        snap.forEach((d) => {
          const item = d.data();
          events.push({
            id: d.id,
            recipientId: item.recipientId || item.userId || 'all',
            senderId: item.senderId || 'system',
            senderName: item.senderName || 'IEC Ledger Engine',
            title: item.title || 'System Notification',
            message: item.message || '',
            type: item.type || 'info',
            read: !!item.read,
            createdAt: item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate().toISOString() : String(item.createdAt)) : new Date().toISOString(),
            relatedEntity: item.relatedEntity || 'evidence',
            relatedEntityId: item.relatedEntityId || item.entityId,
            actionUrl: item.actionUrl,
          });
        });
        cachedNotifications = events;
      }
    } catch {
      // Offline fallback: keep cached notifications
    } finally {
      isSyncing = false;
    }

    return this.getNotificationsForUser(userId, role);
  },

  async sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const id = `NOT-${Date.now()}`;
    const now = new Date().toISOString();
    const newNotification: Notification = {
      senderId: 'system',
      senderName: 'System',
      ...notification,
      id,
      createdAt: now,
      read: false,
    };

    cachedNotifications.unshift(newNotification);

    try {
      await setDoc(doc(db, 'notifications', id), newNotification);
    } catch {}

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
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {}
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
  },

  clearAll(userId: string): void {
    const userNotifs = this.getNotificationsForUser(userId);
    const clearedKey = `iec_cleared_notifications_${userId}`;
    const existing = new Set(getStoredArray(clearedKey));

    userNotifs.forEach((n) => existing.add(n.id));
    setStoredArray(clearedKey, Array.from(existing));
  },

  async sendReply(params: {
    notificationId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    message: string;
  }): Promise<Notification> {
    const original = cachedNotifications.find((n) => n.id === params.notificationId);
    if (original) {
      original.replied = true;
      original.replyText = params.message;
      original.repliedAt = new Date().toISOString();
      original.read = true;
    }

    const replyId = `NOT-REPLY-${Date.now()}`;
    const replyNotification: Notification = {
      id: replyId,
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

    try {
      await setDoc(doc(db, 'notifications', replyId), replyNotification);
    } catch {}

    return replyNotification;
  },

  broadcastToHierarchy(notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'recipientId'>, minRole: string): void {
    this.sendNotification({
      ...notification,
      recipientId: 'all',
    });
  },
};
