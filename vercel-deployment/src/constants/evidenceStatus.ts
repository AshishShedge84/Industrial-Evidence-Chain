import type { EvidenceStatus } from '@type-defs/evidence';

export const EVIDENCE_STATUSES: EvidenceStatus[] = [
  'Draft',
  'Submitted',
  'Anchored',
  'Verified',
  'IntegrityMismatch',
  'Failed',
];

export const EVIDENCE_STATUS_ORDER: Record<EvidenceStatus, number> = {
  Draft: 0,
  Submitted: 1,
  Anchored: 2,
  Verified: 3,
  IntegrityMismatch: 4,
  Failed: 5,
};

export const TERMINAL_STATUSES: EvidenceStatus[] = [
  'Verified',
  'IntegrityMismatch',
  'Failed',
];

export const ACTIVE_STATUSES: EvidenceStatus[] = [
  'Draft',
  'Submitted',
  'Anchored',
];

export const EVIDENCE_STATUS_COLORS: Record<EvidenceStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  Anchored: 'bg-purple-100 text-purple-700',
  Verified: 'bg-green-100 text-green-700',
  IntegrityMismatch: 'bg-amber-100 text-amber-700',
  Failed: 'bg-red-100 text-red-700',
};

export function isTerminalStatus(status: EvidenceStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActiveStatus(status: EvidenceStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function canTransitionFrom(currentStatus: EvidenceStatus, newStatus: EvidenceStatus): boolean {
  return EVIDENCE_STATUS_ORDER[newStatus] > EVIDENCE_STATUS_ORDER[currentStatus];
}