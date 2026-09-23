import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className = '', title, value, change, changeLabel, icon, iconBg = 'bg-primary-100', trend = 'neutral', ...props }, ref) => {
    const trendIcons = {
      up: ArrowUpRight,
      down: ArrowDownRight,
      neutral: Minus,
    };

    const trendColors = {
      up: 'text-success-600',
      down: 'text-error-600',
      neutral: 'text-gray-400',
    };

    const TrendIcon = trendIcons[trend];

    return (
      <div
        ref={ref}
        className={`bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border-t border-l border-white/60 dark:border-white/15 border-r border-b border-black/5 dark:border-black/30 rounded-2xl sm:rounded-[28px] p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden transform-gpu min-h-[105px] sm:min-h-[135px] ${className}`}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl sm:rounded-[28px]" />
        <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-4">
          <p className="text-[11px] sm:text-xs lg:text-[13px] font-medium text-gray-500 dark:text-gray-400 tracking-wide line-clamp-2 leading-tight">{title}</p>
          {icon && (
            <div className={`h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-white/10 shadow-inner dark:shadow-none shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4`}>
              {icon}
            </div>
          )}
        </div>
        <div>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-1 sm:mb-2">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-md ${trend === 'up' ? 'bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-400' : trend === 'down' ? 'bg-error-50 text-error-700 dark:bg-error-950/40 dark:text-error-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}>
                <TrendIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-[10px] sm:text-xs text-gray-400 truncate">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';