import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MEMOJI_FRAMES = [
  '/memoji/models/memoji-neutral.png',
  '/memoji/models/memoji-focused.png',
  '/memoji/models/memoji-smile.png',
  '/memoji/models/memoji-confident.png',
];

const HALO_COLORS = [
  'bg-blue-400/20 dark:bg-blue-500/20', // Neutral (cool)
  'bg-indigo-400/20 dark:bg-indigo-500/20', // Focused (deeper)
  'bg-amber-400/15 dark:bg-amber-500/15', // Smile (warmer)
  'bg-sky-400/20 dark:bg-sky-400/25', // Confident (brighter)
];

export function MemojiAvatar() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Change expression every 3.5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MEMOJI_FRAMES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] flex items-center justify-center z-10">
      {/* Organic radial blur halo - no ring, soft gradient field */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`halo-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className={`absolute inset-0 rounded-full blur-[90px] sm:blur-[110px] ${HALO_COLORS[currentIndex]}`}
        />
      </AnimatePresence>
      
      {/* Memoji Crossfade */}
      <AnimatePresence mode="wait">
        <motion.img
          key={`memoji-${currentIndex}`}
          src={MEMOJI_FRAMES[currentIndex]}
          alt="Memoji Expression"
          initial={{ opacity: 0, scale: 0.98, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -2 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-2xl"
        />
      </AnimatePresence>
    </div>
  );
}
