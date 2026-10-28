import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAssistant } from '@hooks/useAssistant';
import { AssistantSuggestions } from './AssistantSuggestions';
import { MessageComposer } from './MessageComposer';
import { Button } from '@components/ui';

export function AssistantMessages() {
  const { messages, isThinking, handleAction } = useAssistant();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
      {messages.length === 0 && !isThinking && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            How can I help you today?
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.text && (
              <div
                className={`px-4 py-2.5 rounded-2xl text-[15px] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'max-w-[75%] bg-primary-600 text-white rounded-tr-sm'
                    : msg.role === 'system'
                    ? 'max-w-[85%] bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs rounded-lg italic mx-auto'
                    : 'max-w-[82%] bg-white dark:bg-[#222] border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            )}
            
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {msg.actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant={action.action === 'CANCEL' ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      if (action.action === 'NAVIGATE' && action.payload) {
                        navigate(action.payload);
                      } else {
                        handleAction(action);
                      }
                    }}
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            {msg.isComposer && (
              <MessageComposer 
                initialRecipientId={msg.composerPayload?.recipientId}
                initialMessage={msg.composerPayload?.message}
                onComplete={() => {}} 
              />
            )}
          </motion.div>
        ))}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-start"
          >
            <div className="bg-white dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[14px] text-gray-500 dark:text-gray-400 font-medium">
                <span>Chat bot is thinking</span>
                <div className="flex space-x-1 mt-1.5">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AssistantSuggestions />
    </div>
  );
}
