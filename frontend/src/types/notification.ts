export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  title: string;
  message: string;
  type: 'info' | 'message' | 'alert' | 'success';
  read: boolean;
  createdAt: string;
  relatedEntity?: 'asset' | 'evidence' | 'verification' | 'user';
  relatedEntityId?: string;
  actionUrl?: string;
  replied?: boolean;
  replyText?: string;
  repliedAt?: string;
  clearedBy?: string[];
}
