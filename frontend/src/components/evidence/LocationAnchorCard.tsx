import React from 'react';
import { MapPin, Navigation, Compass, Globe, Radio } from 'lucide-react';
import { SecurityIconBox } from '@components/ui';
import type { EvidenceLocation } from '@type-defs/evidence';

interface LocationAnchorCardProps {
  location?: EvidenceLocation;
  siteName?: string;
  building?: string;
  zone?: string;
}

export const LocationAnchorCard: React.FC<LocationAnchorCardProps> = ({
  location,
  siteName,
  building,
  zone,
}) => {
  if (!location && !siteName) return null;

  const lat = location?.latitude != null ? Number(location.latitude).toFixed(6) : null;
  const lng = location?.longitude != null ? Number(location.longitude).toFixed(6) : null;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <SecurityIconBox
            icon={MapPin}
            variant="primary"
            size="md"
          />
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Geographic Anchor
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hardware GPS telemetry anchored at ingestion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Locked</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Plant Site & Zone hierarchy */}
        {(siteName || location?.address || building || zone) && (
          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
              Industrial Facility
            </span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {location?.address || siteName || 'Industrial Site'}
            </p>
            {(building || zone) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {[building, zone].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* GPS Coordinates */}
        {lat && lng && (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">LATITUDE</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{lat}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">LONGITUDE</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{lng}</span>
            </div>
          </div>
        )}

        {location?.accuracy != null && (
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1">
            <span>Precision Radius: ±{location.accuracy}m</span>
            <span>WGS-84 Standard</span>
          </div>
        )}
      </div>
    </div>
  );
};
