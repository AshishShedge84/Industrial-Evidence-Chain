import { Badge } from '@components/ui';
import { Clock, Package, Camera, Shield, FileText, ArrowRight } from 'lucide-react';
import type { EvidenceStatus, ActivityType } from '@type-defs/evidence';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import { formatRelativeTime } from '@utils/date';

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: 'evidence_created' | 'evidence_submitted' | 'evidence_verified' | 'asset_created' | 'asset_updated';
    title: string;
    description?: string;
    timestamp: string;
    assetTag?: string;
    assetId?: string;
    evidenceId?: string;
    status?: EvidenceStatus;
    activityType?: ActivityType;
  }>;
  onViewAsset?: (assetId: string) => void;
  onViewEvidence?: (evidenceId: string) => void;
  limit?: number;
}

export function RecentActivity({ activities, onViewAsset, onViewEvidence, limit = 5 }: RecentActivityProps) {
  const displayActivities = activities.slice(0, limit);

  const getActivityIcon = (type: string, activityType?: ActivityType) => {
    switch (type) {
      case 'evidence_created':
      case 'evidence_submitted':
        return activityType ? ACTIVITY_TYPE_ICONS[activityType] : Camera;
      case 'evidence_verified':
        return Shield;
      case 'asset_created':
      case 'asset_updated':
        return Package;
      default:
        return FileText;
    }
  };

    const getActivityColor = (type: string) => {
      switch (type) {
        case 'evidence_created':
          return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
        case 'evidence_submitted':
          return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';
        case 'evidence_verified':
          return 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400';
        case 'asset_created':
          return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
        case 'asset_updated':
          return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
        default:
          return 'bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400';
      }
    };

  if (displayActivities.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
        <div className="text-center py-12 border border-black/5 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5">
          <Clock className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-3.5 sm:mb-6 px-1">
        <h3 className="text-base sm:text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight">Recent Activity</h3>
        <button className="text-xs sm:text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 group transition-colors">
          View all
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      
      <div className="bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl rounded-2xl sm:rounded-[28px] border-t border-l border-white/40 dark:border-white/10 border-r border-b border-black/5 dark:border-black/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden relative transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {displayActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type, activity.activityType);
            const colorClass = getActivityColor(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-5 lg:p-6 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner dark:shadow-none ${colorClass}`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <p className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight truncate">{activity.title}</p>
                    <span className="text-xs sm:text-[13px] font-medium text-gray-400 flex-shrink-0">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-xs sm:text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate tracking-wide">{activity.description}</p>
                  )}
                  <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-[13px] text-gray-400">
                    {activity.assetTag && (
                      <span className="font-mono bg-gray-100/80 dark:bg-white/10 px-1.5 sm:px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-medium">{activity.assetTag}</span>
                    )}
                    {activity.status && (
                      <Badge className={EVIDENCE_STATUS_COLORS[activity.status]}>
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-1 sm:pt-2">
                  {activity.assetId && onViewAsset && (
                    <button
                      onClick={() => onViewAsset(activity.assetId!)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-900 rounded-lg sm:rounded-xl hover:bg-black/5 transition-colors"
                      title="View Asset"
                    >
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  )}
                  {activity.evidenceId && onViewEvidence && (
                    <button
                      onClick={() => onViewEvidence(activity.evidenceId!)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-900 rounded-lg sm:rounded-xl hover:bg-black/5 transition-colors"
                      title="View Evidence"
                    >
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}