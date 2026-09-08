import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Reply, Send, X, Trash2, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { UserAvatar } from '@components/ui/UserAvatar';
import { formatRelativeTime } from '@utils/date';
import { useNotifications } from '@hooks/useNotifications';
import { useApp } from '@context/AppContext';
import type { Notification } from '@type-defs/notification';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, sendReply } = useNotifications();
  const { addToast } = useApp();

  // Active inline reply state: notificationId -> boolean
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleClearAll = () => {
    clearAll();
    setActiveReplyId(null);
    setReplyText('');
    addToast({
      type: 'success',
      title: 'Notifications Cleared',
      message: 'All notifications have been removed.',
    });
  };

  const handleStartReply = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeReplyId === notifId) {
      setActiveReplyId(null);
      setReplyText('');
    } else {
      setActiveReplyId(notifId);
      setReplyText('');
      markAsRead(notifId);
    }
  };

  const handleSendReply = (notif: Notification, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = replyText.trim();
    if (!trimmed) {
      addToast({
        type: 'warning',
        title: 'Empty Reply',
        message: 'Please write a message before sending.',
      });
      return;
    }

    setIsSendingReply(true);
    const reply = sendReply(notif.id, trimmed);
    setIsSendingReply(false);

    if (reply) {
      addToast({
        type: 'success',
        title: 'Reply Sent',
        message: `Your reply to ${notif.senderName} has been delivered.`,
      });
      setActiveReplyId(null);
      setReplyText('');
    }
  };

  const getTypeBadge = (type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" /> Alert
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Update
          </span>
        );
      case 'message':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <Reply className="h-3 w-3" /> Message
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Info className="h-3 w-3" /> System
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute -right-2 sm:-right-16 top-full mt-3 w-[calc(100vw-32px)] sm:w-[400px] max-w-[420px] glass-panel-strong rounded-[24px] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden py-0 origin-top-right z-50 text-left pointer-events-auto"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/40 dark:bg-[#111622]/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  {notifications.length} total
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Mark read
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Body List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-black/5 dark:divide-white/5 overscroll-contain">
            {notifications.length === 0 ? (
              /* Polished Empty State */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 px-6"
              >
                <div className="h-12 w-12 rounded-full bg-primary-500/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Bell className="h-5 w-5 opacity-80" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  No notifications
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You're all caught up.
                </p>
              </motion.div>
            ) : (
              notifications.map((notif, index) => {
                const isReplyActive = activeReplyId === notif.id;
                const isMessage = notif.type === 'message';

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    className={`p-4 transition-colors cursor-pointer group ${
                      !notif.read
                        ? 'bg-primary-500/[0.05] dark:bg-primary-400/[0.07] hover:bg-primary-500/[0.08] dark:hover:bg-primary-400/[0.11]'
                        : 'hover:bg-black/[0.025] dark:hover:bg-white/[0.03]'
                    }`}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Sender Avatar */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <UserAvatar
                          senderId={notif.senderId}
                          senderName={notif.senderName}
                          size="md"
                          className="ring-1 ring-black/5 dark:ring-white/10"
                        />
                        {!notif.read && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-[#131720]" />
                        )}
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p
                            className={`text-[13px] leading-snug truncate ${
                              notif.read
                                ? 'font-medium text-gray-800 dark:text-gray-200'
                                : 'font-semibold text-gray-900 dark:text-white'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Sender Name + Type Badge */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[12px] font-semibold text-primary-600 dark:text-primary-400">
                            {notif.senderName}
                          </span>
                          {getTypeBadge(notif.type)}
                        </div>

                        {/* Message Preview */}
                        <p className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        {/* Previous Reply Display (if already replied) */}
                        {notif.replied && notif.replyText && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[11px]">
                            <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-semibold mb-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>You replied:</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 italic">
                              "{notif.replyText}"
                            </p>
                          </div>
                        )}

                        {/* Actions Row: Reply for Message notifications only */}
                        {isMessage && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleStartReply(notif.id, e)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                isReplyActive
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                              }`}
                            >
                              <Reply className="h-3.5 w-3.5" />
                              {isReplyActive ? 'Close Reply' : notif.replied ? 'Reply Again' : 'Reply'}
                            </button>
                          </div>
                        )}

                        {/* Inline Reply Composer */}
                        <AnimatePresence>
                          {isReplyActive && (
                            <motion.form
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              onSubmit={(e) => handleSendReply(notif, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 overflow-hidden"
                            >
                              <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                <span>Reply to {notif.senderName}</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveReplyId(null)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="relative">
                                <input
                                  type="text"
                                  autoFocus
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type a reply..."
                                  className="w-full bg-white dark:bg-[#161c28] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 pr-16 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-inner"
                                  disabled={isSendingReply}
                                />
                                <button
                                  type="submit"
                                  disabled={!replyText.trim() || isSendingReply}
                                  className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 text-white text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Send</span>
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
