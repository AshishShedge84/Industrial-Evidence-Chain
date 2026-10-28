import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
      success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
      warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300',
      error: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300',
      info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
      neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-xs gap-1.5',
      lg: 'px-3 py-1 text-sm gap-2',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';