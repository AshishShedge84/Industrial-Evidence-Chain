import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssistant } from '@hooks/useAssistant';
import { AssistantHeader } from './AssistantHeader';
import { AssistantMessages } from './AssistantMessages';
import { AssistantInput } from './AssistantInput';
import { useAuth } from '@hooks/useAuth';

export function AssistantWindow() {
  const { isOpen, setIsOpen } = useAssistant();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Don't render window if user isn't logged in
  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[600px] max-h-[calc(100dvh-5rem)] glass-panel-strong rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <AssistantHeader />
          <AssistantMessages />
          <AssistantInput />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
