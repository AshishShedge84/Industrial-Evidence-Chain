import type { ActivityType } from '@type-defs/evidence';
import {
  Search,
  Wrench,
  Hammer,
  Gauge,
  Shield,
  Award,
  ClipboardCheck,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  Archive,
  Rocket,
} from 'lucide-react';

export const ACTIVITY_TYPES: ActivityType[] = [
  'Maintenance',
  'Inspection',
  'Repair',
  'Calibration',
  'Safety',
  'Quality',
  'Audit',
  'Incident',
  'SparePart',
  'Transfer',
  'Decommissioning',
  'Commissioning',
];

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  Maintenance: Wrench,
  Inspection: Search,
  Repair: Hammer,
  Calibration: Gauge,
  Safety: Shield,
  Quality: Award,
  Audit: ClipboardCheck,
  Incident: AlertTriangle,
  SparePart: Package,
  Transfer: ArrowRightLeft,
  Decommissioning: Archive,
  Commissioning: Rocket,
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  Maintenance: 'Maintenance',
  Inspection: 'Inspection',
  Repair: 'Repair',
  Calibration: 'Calibration',
  Safety: 'Safety',
  Quality: 'Quality',
  Audit: 'Audit',
  Incident: 'Incident',
  SparePart: 'Spare Part',
  Transfer: 'Transfer',
  Decommissioning: 'Decommissioning',
  Commissioning: 'Commissioning',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  Maintenance: 'bg-green-100 text-green-700',
  Inspection: 'bg-blue-100 text-blue-700',
  Repair: 'bg-orange-100 text-orange-700',
  Calibration: 'bg-purple-100 text-purple-700',
  Safety: 'bg-emerald-100 text-emerald-700',
  Quality: 'bg-teal-100 text-teal-700',
  Audit: 'bg-pink-100 text-pink-700',
  Incident: 'bg-red-100 text-red-700',
  SparePart: 'bg-amber-100 text-amber-700',
  Transfer: 'bg-cyan-100 text-cyan-700',
  Decommissioning: 'bg-gray-100 text-gray-700',
  Commissioning: 'bg-indigo-100 text-indigo-700',
};

export const ACTIVITY_TYPE_DESCRIPTIONS: Record<ActivityType, string> = {
  Maintenance: 'Preventive or scheduled maintenance activities',
  Inspection: 'Routine or scheduled inspection of asset condition',
  Repair: 'Corrective repair of asset faults or failures',
  Calibration: 'Calibration and verification of measurement accuracy',
  Safety: 'Safety review and compliance check',
  Quality: 'Quality assurance and quality control inspection',
  Audit: 'Compliance or quality audit activity',
  Incident: 'Unplanned incident or failure investigation',
  SparePart: 'Replacement or installation of spare parts',
  Transfer: 'Relocation or transfer of asset custody',
  Decommissioning: 'Decommissioning and removal of asset from service',
  Commissioning: 'Initial commissioning and startup of new asset',
};