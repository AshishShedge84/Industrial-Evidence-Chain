import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { notificationService } from '@services/notification/notificationService';
import type { Notification } from '@type-defs/notification';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    if (user) {
      const userNotifications = notificationService.getNotificationsForUser(user.id);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    
    // Simulate real-time updates for the mock DB by polling every 5s
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
    refresh();
  }, [refresh]);

  const markAllAsRead = useCallback(() => {
    if (user) {
      notificationService.markAllAsRead(user.id);
      refresh();
    }
  }, [user, refresh]);

  const clearAll = useCallback(() => {
    if (user) {
      notificationService.clearAll(user.id);
      refresh();
    }
  }, [user, refresh]);

  const sendReply = useCallback((notificationId: string, message: string) => {
    if (!user) return null;
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return null;

    const reply = notificationService.sendReply({
      notificationId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      recipientId: notif.senderId || '1',
      message,
    });
    refresh();
    return reply;
  }, [user, notifications, refresh]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    sendReply,
    refresh
  };
}
