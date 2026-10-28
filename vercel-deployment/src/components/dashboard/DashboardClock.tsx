import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function DashboardClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const timeZoneShort = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="inline-flex items-center gap-3 sm:gap-3.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_-3px_rgba(0,0,0,0.4)] max-w-full">
      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">
            {timeString}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:inline">
            {timeZoneShort.split('/').pop()?.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-[11px] sm:text-[12px] font-medium text-gray-500 dark:text-gray-400 leading-tight truncate">
          {dateString}
        </span>
      </div>
    </div>
  );
}
