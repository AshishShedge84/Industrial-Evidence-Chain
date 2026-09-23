import { useState, useEffect } from 'react';

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
    // Preload frames into memory
    MEMOJI_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Change expression smoothly every 3.5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MEMOJI_FRAMES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-[185px] h-[185px] xs:w-[205px] xs:h-[205px] sm:w-[290px] sm:h-[290px] flex items-center justify-center z-10">
      {/* Organic radial blur halo - smooth crossfade gradient field */}
      {HALO_COLORS.map((haloColor, idx) => (
        <div
          key={`halo-${idx}`}
          className={`absolute inset-0 rounded-full blur-[60px] sm:blur-[95px] ${haloColor} transition-opacity duration-1000 ease-in-out pointer-events-none ${
            idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        />
      ))}
      
      {/* Preloaded Seamless Memoji Crossfade */}
      <div className="relative w-full h-full flex items-center justify-center">
        {MEMOJI_FRAMES.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt="Memoji Expression"
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl transition-all duration-700 ease-in-out ${
              idx === currentIndex
                ? 'opacity-100 scale-100 translate-y-0 z-10'
                : 'opacity-0 scale-98 translate-y-1 z-0'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
