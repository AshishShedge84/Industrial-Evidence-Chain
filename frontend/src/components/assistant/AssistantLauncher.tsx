import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantMemoji } from './AssistantMemoji';
import { useAssistant } from '@hooks/useAssistant';

export function AssistantLauncher() {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleAssistant, emotion, isOpen } = useAssistant();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-40 w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] lg:w-[72px] lg:h-[72px] rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-2xl border border-white/20 dark:border-white/10 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary-500/50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          onClick={toggleAssistant}
          aria-label="Open IEC Assistant"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500/10 to-transparent pointer-events-none" />

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute bottom-full mb-3 right-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-[13px] font-medium bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-lg text-gray-800 dark:text-gray-200 pointer-events-none"
              >
                Chat with me for assistance
              </motion.div>
            )}
          </AnimatePresence>

          {/* The overflow-hidden wrapper ensures the enlarged image doesn't spill out of the circle! */}
          <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
            <AssistantMemoji
              emotion={emotion}
              isHovered={isHovered}
              className="w-full h-full scale-[2] translate-y-1.5"
            />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
