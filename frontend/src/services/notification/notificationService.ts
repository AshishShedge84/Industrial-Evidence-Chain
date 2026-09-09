let localDb: Notification[] = [];
import type { Notification } from '@type-defs/notification';

export const notificationService = {
  getNotifications(): Notification[] {
    return localDb;
  },

  getNotificationsForUser(userId: string): Notification[] {
    return this.getNotifications().filter(n => 
      (n.recipientId === userId || n.recipientId === 'all') &&
      (!n.clearedBy || !n.clearedBy.includes(userId))
    );
  },

  getUnreadCount(userId: string): number {
    return this.getNotificationsForUser(userId).filter(n => !n.read).length;
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
    localDb.push(newNotification);

    return newNotification;
  },

  markAsRead(id: string): void {
    const notification = this.getNotifications().find(n => n.id === id);
    if (notification) {
      notification.read = true;
      // localDb is already updated by reference
    }
  },
  
  markAllAsRead(userId: string): void {
    this.getNotificationsForUser(userId).forEach(n => {
      n.read = true;
      // updated by ref
    });
  },

  clearAll(userId: string): void {
    const all = this.getNotifications();
    const updated = all.filter(n => n.recipientId !== userId).map(n => {
      if (n.recipientId === 'all') {
        return { ...n, clearedBy: [...(n.clearedBy || []), userId] };
      }
      return n;
    });
    localDb = updated;
  },

  sendReply(params: {
    notificationId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    message: string;
  }): Notification {
    const original = this.getNotifications().find(n => n.id === params.notificationId);
    if (original) {
      original.replied = true;
      original.replyText = params.message;
      original.repliedAt = new Date().toISOString();
      original.read = true;
      // updated by ref
    }

    const replyNotification: Notification = {
      id: `NOT-REPLY-${Date.now()}`,
      recipientId: params.recipientId,
      senderId: params.senderId,
      senderName: params.senderName,
      title: `Reply from ${params.senderName}`,
      message: params.message,
      type: 'message',
      read: false,
      createdAt: new Date().toISOString(),
      relatedEntity: original?.relatedEntity,
      relatedEntityId: original?.relatedEntityId,
    };
    localDb.push(replyNotification);

    return replyNotification;
  },

  broadcastToHierarchy(notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'recipientId'>, minRole: string): void {
    const users: any[] = [];
    const roleHierarchy = ['Technician', 'Manager', 'Auditor', 'Admin'];
    const minRoleIndex = roleHierarchy.indexOf(minRole);
    
    if (minRoleIndex === -1) return;
    
    const targetRoles = roleHierarchy.slice(minRoleIndex);
    
    users.forEach(user => {
      if (targetRoles.includes(user.role)) {
        this.sendNotification({
          ...notification,
          recipientId: user.id
        });
      }
    });
  }
};
