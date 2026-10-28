import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { notificationService } from '@services/notification/notificationService';
import type { Notification } from '@type-defs/notification';

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (userId && userRole) {
      try {
        const notifs = await notificationService.syncRealEvents(userId, userRole);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      } catch {
        const local = notificationService.getNotificationsForUser(userId, userRole);
        setNotifications(local);
        setUnreadCount(local.filter((n) => !n.read).length);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId, userRole]);

  useEffect(() => {
    refresh();

    if (userId) {
      const unsub = notificationService.subscribe(userId, userRole, (notifs) => {
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      });
      return () => unsub();
    }
  }, [userId, userRole, refresh]);

  const markAsRead = useCallback(
    (id: string) => {
      if (userId && userRole) {
        notificationService.markAsRead(id, userId);
        const updated = notificationService.getNotificationsForUser(userId, userRole);
        setNotifications(updated);
        setUnreadCount(updated.filter((n) => !n.read).length);
      }
    },
    [userId, userRole]
  );

  const markAllAsRead = useCallback(() => {
    if (user) {
      notificationService.markAllAsRead(user.id);
      const updated = notificationService.getNotificationsForUser(user.id, user.role);
      setNotifications(updated);
      setUnreadCount(0);
    }
  }, [user]);

  const clearAll = useCallback(() => {
    if (user) {
      notificationService.clearAll(user.id);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  const sendReply = useCallback(
    (notificationId: string, message: string) => {
      if (!user) return null;
      const notif = notifications.find((n) => n.id === notificationId);
      if (!notif) return null;

      const reply = notificationService.sendReply({
        notificationId,
        senderId: user.id,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        recipientId: notif.senderId || 'system',
        message,
      });

      const updated = notificationService.getNotificationsForUser(user.id, user.role);
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.read).length);
      return reply;
    },
    [user, notifications]
  );

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    sendReply,
    refresh,
  };
}
