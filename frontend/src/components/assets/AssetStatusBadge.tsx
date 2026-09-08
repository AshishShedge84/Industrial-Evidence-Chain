import { Badge } from '@components/ui';
import type { AssetStatus } from '@type-defs/asset';

const statusConfig: Record<AssetStatus, { variant: BadgeProps['variant']; dot: boolean }> = {
  Active: { variant: 'success', dot: true },
  Inactive: { variant: 'neutral', dot: false },
  Maintenance: { variant: 'warning', dot: true },
  Retired: { variant: 'error', dot: false },
  Lost: { variant: 'error', dot: true },
  Decommissioned: { variant: 'neutral', dot: false },
};

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export function AssetStatusBadge({ status, size = 'md', className = '' }: { status: AssetStatus; size?: BadgeProps['size']; className?: string }) {
  const config = statusConfig[status] ?? { variant: 'neutral', dot: false };

  return <Badge variant={config.variant} size={size} dot={config.dot} className={className}>{status}</Badge>;
}