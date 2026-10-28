import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Badge, SecurityIconBox } from '@components/ui';
import { Box, MapPin, Tag, MoreVertical, Edit, Trash2, ArrowRight } from 'lucide-react';
import type { Asset, AssetStatus } from '@type-defs/asset';

const statusColors: Record<AssetStatus, string> = {
  Active: 'bg-success-50 text-success-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Maintenance: 'bg-amber-50 text-amber-700',
  Retired: 'bg-error-50 text-error-700',
  Lost: 'bg-error-50 text-error-700',
  Decommissioned: 'bg-gray-100 text-gray-600',
};

interface AssetCardProps extends HTMLAttributes<HTMLDivElement> {
  asset: Asset;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const AssetCard = forwardRef<HTMLDivElement, AssetCardProps>(
  ({ className = '', asset, onView, onEdit, onDelete, showActions = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`group relative bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl rounded-[28px] p-6 lg:p-7 transition-all duration-300 shadow-sm border border-black/5 dark:border-white/10 hover:shadow-md hover:border-black/10 dark:hover:border-white/20 flex flex-col h-full ${className}`}
        {...props}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <SecurityIconBox
              icon={Box}
              variant="primary"
              size="md"
            />
            <div>
              <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 tracking-wide">{asset.category}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[13px] font-mono text-gray-600 dark:text-gray-300 font-medium bg-gray-100/80 dark:bg-white/10 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">{asset.assetTag}</span>
              </div>
            </div>
          </div>
          <Badge variant="neutral" className={statusColors[asset.status]}>
            {asset.status}
          </Badge>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight leading-tight mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
            {asset.name}
          </h3>
          {asset.description && (
            <p className="text-[14px] text-gray-500 line-clamp-2 leading-relaxed">{asset.description}</p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[13px] text-gray-500">
            {asset.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate max-w-[120px]">
                  {asset.location.building || asset.location.site}
                </span>
              </span>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-black/5 rounded-lg transition-colors"
                  aria-label="Edit asset"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                  aria-label="Delete asset"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); if(onView) onView(); }}
                className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 font-medium text-[13px]"
                aria-label="View asset details"
              >
                View
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Full card clickable area if onView is provided, ensuring buttons on top intercept clicks */}
        {onView && (
          <button 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" 
            onClick={onView}
            aria-label={`View ${asset.name}`}
          />
        )}
      </div>
    );
  }
);

AssetCard.displayName = 'AssetCard';