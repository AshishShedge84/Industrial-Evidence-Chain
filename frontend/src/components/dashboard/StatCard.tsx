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
        className={`bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border-t border-l border-white/40 dark:border-white/10 border-r border-b border-black/5 dark:border-black/20 rounded-[28px] p-6 lg:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden ${className}`}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-[28px]" />
        <div className="flex items-start justify-between mb-8">
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 tracking-wide">{title}</p>
          {icon && (
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 shadow-inner dark:shadow-none`}>
              {icon}
            </div>
          )}
        </div>
        <div>
          <p className="text-4xl lg:text-5xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none mb-4">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[13px] font-medium px-2 py-0.5 rounded-lg ${trend === 'up' ? 'bg-success-50 text-success-700' : trend === 'down' ? 'bg-error-50 text-error-700' : 'bg-gray-100 text-gray-600'}`}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-[13px] text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';