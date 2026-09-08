import type { HTMLAttributes } from 'react';
import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@components/ui';
import { Select } from '@components/ui';
import { Search, Filter, X } from 'lucide-react';
import type { AssetCategory, AssetStatus } from '@type-defs/asset';

interface AssetSearchProps extends HTMLAttributes<HTMLDivElement> {
  onSearch: (params: AssetSearchParams) => void;
  initialParams?: AssetSearchParams;
  categories?: AssetCategory[];
  statuses?: AssetStatus[];
}

export interface AssetSearchParams {
  query?: string;
  category?: AssetCategory;
  status?: AssetStatus;
}

export const AssetSearch = forwardRef<HTMLDivElement, AssetSearchProps>(
  ({ className = '', onSearch, initialParams, categories, statuses, ...props }, ref) => {
    const [query, setQuery] = useState(initialParams?.query ?? '');
    const [category, setCategory] = useState<AssetCategory | ''>(initialParams?.category ?? '');
    const [status, setStatus] = useState<AssetStatus | ''>(initialParams?.status ?? '');
    const [showFilters, setShowFilters] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
      onSearch({ query: debouncedQuery, category: category || undefined, status: status || undefined });
    }, [debouncedQuery, category, status, onSearch]);

    const handleClear = () => {
      setQuery('');
      setCategory('');
      setStatus('');
      onSearch({});
    };

    const hasActiveFilters = category || status;

    return (
      <div ref={ref} className={`space-y-4 ${className}`} {...props}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-11 pr-10 py-3.5 bg-white/40 dark:bg-black/10 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[16px] text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-primary-500/50 focus:bg-white/60 dark:focus:bg-black/20 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.01)] hover:bg-white/50 dark:hover:bg-black/15"
              aria-label="Search assets"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white/50 dark:bg-black/20 rounded-full border border-black/5 dark:border-white/5 shadow-sm transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors uppercase tracking-wider"
            aria-expanded={showFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex items-center justify-center h-4 w-4 text-[10px] font-bold text-white bg-primary-600 rounded-full">
                {Number(!!category) + Number(!!status)}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 animate-slide-in-top p-4 bg-white/40 dark:bg-black/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 shadow-inner">
            <Select
              label="Category"
              placeholder="All categories"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              options={[
                { value: '', label: 'All categories' },
                ...(categories ?? [
                  'Machinery',
                  'Equipment',
                  'Vehicle',
                  'Tool',
                  'Instrument',
                  'Facility',
                  'Other',
                ]).map((c) => ({ value: c, label: c })),
              ]}
            />
            <Select
              label="Status"
              placeholder="All statuses"
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus)}
              options={[
                { value: '', label: 'All statuses' },
                ...(statuses ?? ['Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Decommissioned']).map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-[13px] text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }
);

AssetSearch.displayName = 'AssetSearch';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}