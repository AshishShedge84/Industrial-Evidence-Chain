import { Plus, Camera, Search, Shield, QrCode } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';

interface QuickActionsProps {
  onCreateAsset?: () => void;
  onCaptureEvidence?: () => void;
  onSearchAssets?: () => void;
  onVerifyEvidence?: () => void;
  onScanQR?: () => void;
  onManageUsers?: () => void;
  onSystemSettings?: () => void;
  className?: string;
}

export function QuickActions({
  onCreateAsset,
  onCaptureEvidence,
  onSearchAssets,
  onVerifyEvidence,
  onScanQR,
  onManageUsers,
  onSystemSettings,
  className = '',
}: QuickActionsProps) {
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const actions = [
    {
      label: 'Capture Evidence',
      description: 'Upload photos or videos securely.',
      icon: Camera,
      onClick: onCaptureEvidence,
      permission: 'evidence:create',
      primary: true,
    },
    {
      label: 'Verify Evidence',
      description: 'Check blockchain integrity seals.',
      icon: Shield,
      onClick: onVerifyEvidence,
      permission: 'evidence:verify',
    },
    {
      label: 'Scan QR Code',
      description: 'Quickly find an asset via camera.',
      icon: QrCode,
      onClick: onScanQR,
      permission: 'qr:scan',
    },
    {
      label: 'Search Assets',
      description: 'Browse the industrial asset catalog.',
      icon: Search,
      onClick: onSearchAssets,
      permission: 'assets:read',
    },
    {
      label: 'Create Asset',
      description: 'Register a new equipment profile.',
      icon: Plus,
      onClick: onCreateAsset,
      permission: 'assets:write',
    },
    {
      label: 'Manage Users',
      description: 'Approve or suspend accounts.',
      icon: Shield,
      onClick: onManageUsers,
      permission: 'admin:users',
      forceShow: isAdmin && onManageUsers,
    },
    {
      label: 'System Settings',
      description: 'Configure platform parameters.',
      icon: Plus,
      onClick: onSystemSettings,
      permission: 'admin:settings',
      forceShow: isAdmin && onSystemSettings,
    },
  ].filter((action) => action.onClick && (action.forceShow || hasPermission(action.permission as any)));

  if (actions.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-base sm:text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight mb-3.5 sm:mb-6 px-1">Quick Actions</h3>
      <div className="flex flex-col gap-2.5 sm:gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`w-full group flex items-center p-3.5 sm:p-5 rounded-2xl sm:rounded-[24px] transition-all duration-300 text-left border relative overflow-hidden ${
              action.primary 
                ? 'bg-gray-900 border-gray-900 hover:bg-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] hover:-translate-y-0.5' 
                : 'bg-white/70 dark:bg-[#0F1218]/70 backdrop-blur-xl border-t border-l border-white/40 dark:border-white/10 border-r border-b border-black/5 dark:border-black/20 hover:border-white dark:hover:border-white/20 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5'
            }`}
          >
            {!action.primary && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl sm:rounded-[24px]" />}
            <div className={`h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl sm:rounded-[18px] flex items-center justify-center mr-3 sm:mr-4 transition-colors ${
              action.primary 
                ? 'bg-white/10 text-white' 
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-white/20 group-hover:shadow-sm dark:group-hover:shadow-none'
            }`}>
              <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm sm:text-[15px] font-semibold tracking-tight ${action.primary ? 'text-white' : 'text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white'}`}>
                {action.label}
              </p>
              <p className={`text-xs sm:text-[13px] mt-0.5 font-medium ${action.primary ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}