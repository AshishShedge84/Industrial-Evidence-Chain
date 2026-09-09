import { useState, useMemo } from 'react';
import type { User } from '@type-defs/auth';
import { useAuth } from '@hooks/useAuth';
import { useAssistant } from '@hooks/useAssistant';
import { Button } from '@components/ui';
import { UserAvatar } from '@components/ui/UserAvatar';
import { notificationService } from '@services/notification/notificationService';

interface MessageComposerProps {
  initialRecipientId?: string;
  initialMessage?: string;
  onComplete: () => void;
}

export function MessageComposer({ initialRecipientId, initialMessage, onComplete }: MessageComposerProps) {
  const { user: currentUser } = useAuth();
  const { addMessage } = useAssistant();
  const users = useMemo(() => [] as User[], [currentUser?.id]);
  
  const [recipientId, setRecipientId] = useState<string>(initialRecipientId || '');
  const [message, setMessage] = useState(initialMessage || '');
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const selectedUser = useMemo(() => users.find(u => u.id === recipientId), [users, recipientId]);

  const handleSend = () => {
    if (!currentUser || !recipientId || !message.trim()) return;
    
    setIsSending(true);
    
    setTimeout(() => {
      notificationService.sendNotification({
        recipientId,
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        title: 'New Message',
        message: message.trim(),
        type: 'message'
      });
      
      addMessage({ role: 'system', text: `Message sent to ${selectedUser?.firstName} successfully.`, emotion: 'success' });
      setIsSending(false);
      setIsComplete(true);
      if (onComplete) onComplete();
    }, 800);
  };

  const handleCancel = () => {
    addMessage({ role: 'system', text: 'Message cancelled.', emotion: 'idle' });
    setIsComplete(true);
    if (onComplete) onComplete();
  };

  const handleClear = () => {
    setRecipientId('');
    setMessage('');
  };

  if (isComplete) return null;

  return (
    <div className="flex flex-col bg-white dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-2xl rounded-tl-sm p-4 shadow-sm w-full max-w-[85%] mt-2 space-y-3">
      <div className="flex flex-col space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
        <div className="relative">
          <select 
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none"
          >
            <option value="" disabled>Select recipient...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {selectedUser ? (
              <UserAvatar user={selectedUser} size="xs" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none min-h-[70px]"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={isSending} className="text-xs h-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Clear
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSending} className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/30">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSend} disabled={isSending || !recipientId || !message.trim()} className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
          {isSending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
