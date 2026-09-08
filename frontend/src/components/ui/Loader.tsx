import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  color?: 'primary' | 'white' | 'gray';
}

export const Loader = forwardRef<HTMLDivElement, LoaderProps>(
  ({ className = '', size = 'md', variant = 'spinner', color = 'primary', ...props }, ref) => {
    const sizeStyles = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
    };

    const colorStyles = {
      primary: 'border-primary-500 border-t-transparent',
      white: 'border-white border-t-transparent',
      gray: 'border-gray-500 border-t-transparent',
    };

    const dotSizes = {
      sm: 'h-1.5 w-1.5',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    };

    if (variant === 'spinner') {
      return (
        <div
          ref={ref}
          className={`animate-spin rounded-full border-2 ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
          role="status"
          aria-label="Loading"
          {...props}
        >
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    if (variant === 'dots') {
      return (
        <div ref={ref} className={`flex items-center gap-1 ${className}`} role="status" aria-label="Loading" {...props}>
          <span className={`${dotSizes[size]} rounded-full bg-current animate-bounce`} style={{ animationDelay: '0ms' }} />
          <span className={`${dotSizes[size]} rounded-full bg-current animate-bounce`} style={{ animationDelay: '150ms' }} />
          <span className={`${dotSizes[size]} rounded-full bg-current animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          className={`rounded-full ${sizeStyles[size]} bg-current animate-pulse ${className}`}
          role="status"
          aria-label="Loading"
          {...props}
        />
      );
    }

    return null;
  }
);

Loader.displayName = 'Loader';

export interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <Loader size="lg" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

export function ButtonLoader() {
  return <Loader size="sm" color="white" />;
}