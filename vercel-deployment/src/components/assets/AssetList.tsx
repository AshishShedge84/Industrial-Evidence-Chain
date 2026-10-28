import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { AssetCard } from './AssetCard';
import { EmptyState } from '@components/ui';
import type { Asset } from '@type-defs/asset';

interface AssetListProps extends HTMLAttributes<HTMLDivElement> {
  assets: Asset[];
  isLoading?: boolean;
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
}

export const AssetList = forwardRef<HTMLDivElement, AssetListProps>(
  ({ className = '', assets, isLoading, onView, onEdit, onDelete, emptyTitle, emptyDescription, emptyAction, ...props }, ref) => {
    if (isLoading) {
      return (
        <div ref={ref} className={`responsive-asset-grid ${className}`} {...props} role="status" aria-label="Loading assets">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 flex flex-col h-full animate-pulse">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100" />
                  <div>
                    <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-gray-100 rounded mb-3" />
                <div className="h-3 w-full bg-gray-50 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-50 rounded" />
              </div>
              <div className="mt-6 pt-6 border-t border-black/5 flex justify-between">
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (assets.length === 0) {
      return (
        <div ref={ref} className={className} {...props}>
          <EmptyState
            illustration="folder"
            title={emptyTitle ?? 'No assets found'}
            description={emptyDescription ?? 'Get started by creating your first asset.'}
            action={emptyAction}
          />
        </div>
      );
    }

    return (
      <div ref={ref} className={`responsive-asset-grid ${className}`} {...props} role="list">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onView={() => onView?.(asset)}
            onEdit={() => onEdit?.(asset)}
            onDelete={() => onDelete?.(asset)}
            role="listitem"
          />
        ))}
      </div>
    );
  }
);

AssetList.displayName = 'AssetList';