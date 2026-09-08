import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl';
type BrandMarkVariant = 'default' | 'inverse' | 'outline' | 'ghost';

export interface BrandMarkProps extends HTMLAttributes<HTMLDivElement> {
  size?: BrandMarkSize;
  variant?: BrandMarkVariant;
}

const sizeStyles: Record<BrandMarkSize, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-[12px]',
  lg: 'h-10 w-10 text-[14px]',
  xl: 'h-12 w-12 text-[16px]',
};

const variantStyles: Record<BrandMarkVariant, string> = {
  default: 'bg-primary-600 text-white',
  inverse: 'bg-white text-primary-600',
  outline: 'bg-transparent border border-gray-200 text-gray-900',
  ghost: 'bg-gray-100 text-gray-600',
};

export const BrandMark = forwardRef<HTMLDivElement, BrandMarkProps>(
  ({ className = '', size = 'md', variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${sizeStyles[size]} ${variantStyles[variant]} rounded-full flex items-center justify-center font-medium tracking-tight ${className}`}
        {...props}
      >
        {children || 'IEC'}
      </div>
    );
  }
);

BrandMark.displayName = 'BrandMark';

export function BrandMarkWithText({ 
  size = 'md', 
  className = '', 
  variant = 'default', 
  ...props 
}: { size?: BrandMarkSize; variant?: BrandMarkVariant; className?: string } & HTMLAttributes<HTMLDivElement>) {
  const textSizes: Record<BrandMarkSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const textColors: Record<BrandMarkVariant, string> = {
    default: 'text-gray-900',
    inverse: 'text-white',
    outline: 'text-gray-900',
    ghost: 'text-gray-900',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`} {...props}>
      <BrandMark size={size} variant={variant} />
      <span className={`font-medium tracking-tight ${textSizes[size]} ${textColors[variant]}`}>
        Industrial Evidence Chain
      </span>
    </div>
  );
}