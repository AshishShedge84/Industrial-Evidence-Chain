import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md dark:hover:shadow-black/50 focus:ring-primary-500/20 active:scale-[0.98]',
      secondary: 'bg-gray-100/80 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 focus:ring-gray-500/10 active:scale-[0.98]',
      outline: 'border border-gray-200 dark:border-white/20 bg-transparent text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 focus:ring-gray-500/10 active:scale-[0.98]',
      ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/10 focus:ring-gray-500/10',
      destructive: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500/20 active:scale-[0.98]',
    };

    const sizeStyles = {
      sm: 'px-4 py-1.5 text-xs gap-1.5',
      md: 'px-5 py-2 text-sm gap-2',
      lg: 'px-8 py-3.5 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';