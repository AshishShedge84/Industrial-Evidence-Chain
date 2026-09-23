import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className = '', title, description, breadcrumbs, actions, children, ...props }, ref) => {
    return (
      <div ref={ref} className={`w-full ${className}`} {...props}>
        {(title || breadcrumbs || actions) && (
          <div className="mb-5 sm:mb-8 lg:mb-10">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-400 mb-3 sm:mb-6" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.label} className="flex items-center gap-2">
                      {index > 0 && (
                        <ChevronRight className="h-3 w-3 text-gray-300" />
                      )}
                      {crumb.href ? (
                        <Link to={crumb.href} className="font-medium hover:text-gray-900 dark:hover:text-white transition-colors">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="font-semibold text-gray-900 dark:text-white" aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
              <div className="max-w-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-white/20 dark:border-white/10 shadow-sm w-full min-w-0">
                {title && <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug drop-shadow-sm break-words">{title}</h1>}
                {description && <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed drop-shadow-sm break-words">{description}</p>}
              </div>
              {actions && <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 w-full sm:w-auto">{actions}</div>}
            </div>
          </div>
        )}
        <div className="w-full">{children}</div>
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';