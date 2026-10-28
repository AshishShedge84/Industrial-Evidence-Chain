import type { InputHTMLAttributes, TextareaHTMLAttributes, ForwardRefExoticComponent, RefAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, id, rightElement, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-0.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-3.5 border rounded-2xl bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm ${
              error
                ? 'border-error-300 dark:border-error-500/50 focus:border-error-500 focus:ring-error-500/10'
                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-500/10'
            } ${rightElement ? 'pr-12' : ''} ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-2 text-sm text-error-600 dark:text-error-400 ml-0.5" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-2 text-sm text-gray-500 dark:text-gray-400 ml-0.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 ml-1 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-5 py-3.5 border rounded-3xl bg-gray-50/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 transition-all duration-200 resize-y min-h-[120px] ${
            error
              ? 'border-error-200 dark:border-error-500/50 focus:border-error-400 focus:ring-error-500/10 bg-error-50/50 dark:bg-error-900/20'
              : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/40 focus:bg-white dark:focus:bg-black/60 focus:border-primary-300 dark:focus:border-primary-500 focus:ring-primary-500/10'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-2 text-sm text-error-600 ml-1" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="mt-2 text-sm text-gray-500 ml-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';