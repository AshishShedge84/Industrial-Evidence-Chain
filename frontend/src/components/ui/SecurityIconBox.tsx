import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type SecurityIconVariant = 
  | 'verified' 
  | 'danger' 
  | 'warning' 
  | 'primary' 
  | 'neutral' 
  | 'accent';

export type SecurityIconSize = 'sm' | 'md' | 'lg' | 'xl';

interface SecurityIconBoxProps {
  icon: LucideIcon;
  variant?: SecurityIconVariant;
  size?: SecurityIconSize;
  className?: string;
  iconClassName?: string;
  pulse?: boolean;
}

const sizeMap: Record<SecurityIconSize, { box: string; icon: string }> = {
  sm: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6' },
  xl: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
};

const variantStyles: Record<SecurityIconVariant, {
  container: string;
  icon: string;
}> = {
  verified: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-sm shadow-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  danger: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-sm shadow-rose-500/10 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm shadow-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  primary: {
    container: 'bg-primary-50 text-primary-700 border-primary-200/80 shadow-sm shadow-primary-500/10 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800/60',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  accent: {
    container: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  neutral: {
    container: 'bg-gray-100 text-gray-700 border-black/5 dark:bg-white/10 dark:text-gray-300 dark:border-white/10',
    icon: 'text-gray-600 dark:text-gray-400',
  },
};

export const SecurityIconBox: React.FC<SecurityIconBoxProps> = ({
  icon: Icon,
  variant = 'neutral',
  size = 'md',
  className = '',
  iconClassName = '',
  pulse = false,
}) => {
  const { box, icon: iconSize } = sizeMap[size];
  const { container, icon: iconColor } = variantStyles[variant];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 aspect-square border transition-all duration-300 ${box} ${container} ${className}`}
      style={{ minWidth: undefined, minHeight: undefined }}
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current pointer-events-none"
          aria-hidden="true"
        />
      )}
      <Icon className={`${iconSize} ${iconColor} ${iconClassName} stroke-[2] shrink-0`} />
    </div>
  );
};
