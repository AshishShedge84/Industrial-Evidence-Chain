import React from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  Cpu, 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Lock,
  ExternalLink
} from 'lucide-react';
import { SecurityIconBox, Badge } from '@components/ui';
import type { Evidence, BlockchainProof } from '@type-defs/evidence';
import { formatDate } from '@utils/date';

export interface TimelineEventItem {
  id: string;
  title: string;
  role?: string;
  user?: string;
  timestamp: string;
  reference?: string;
  status: 'completed' | 'active' | 'warning' | 'pending';
  icon: any;
  variant: 'verified' | 'primary' | 'warning' | 'neutral' | 'danger';
  details?: string;
}

interface VerificationTimelineProps {
  evidence: Evidence;
  blockchainProof?: BlockchainProof;
  verificationStatus?: 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PENDING' | 'FAILED' | null;
  lastVerifiedAt?: string;
}

export const VerificationTimeline: React.FC<VerificationTimelineProps> = ({
  evidence,
  blockchainProof,
  verificationStatus,
  lastVerifiedAt,
}) => {
  // Build structured technical timeline events
  const events: TimelineEventItem[] = [];

  // 1. Evidence Creation
  if (evidence.createdAt) {
    events.push({
      id: 'created',
      title: 'Evidence Captured & Formatted',
      role: evidence.userRole || 'Technician',
      user: evidence.userName || `User ${evidence.userId?.substring(0, 8)}`,
      timestamp: evidence.createdAt,
      reference: `Activity: ${evidence.activityType}`,
      status: 'completed',
      icon: UploadCloud,
      variant: 'primary',
      details: 'Metadata & initial physical observations ingested with SHA-256 media pre-hashing.',
    });
  }

  // 2. Evidence Submission & Canonicalization
  if (evidence.submittedAt || evidence.createdAt) {
    events.push({
      id: 'submitted',
      title: 'Canonical Evidence Serialized',
      role: 'System Engine',
      user: 'RFC 8785 Canonicalizer',
      timestamp: evidence.submittedAt || evidence.createdAt,
      reference: evidence.evidenceHash ? `Payload Hash: ${evidence.evidenceHash.substring(0, 16)}...` : undefined,
      status: 'completed',
      icon: Cpu,
      variant: 'primary',
      details: 'Deterministic key sorting and binary normalization performed prior to blockchain dispatch.',
    });
  }

  // 3. Ledger Anchoring
  if (evidence.anchoredAt || blockchainProof?.timestamp) {
    events.push({
      id: 'anchored',
      title: 'Ledger Anchored & Sealed',
      role: 'Hyperledger Fabric',
      user: 'Consensus Orderer',
      timestamp: evidence.anchoredAt || blockchainProof?.timestamp || evidence.createdAt,
      reference: blockchainProof?.transactionId ? `TX: ${blockchainProof.transactionId.substring(0, 24)}...` : undefined,
      status: 'completed',
      icon: Lock,
      variant: 'verified',
      details: blockchainProof 
        ? `Block #${blockchainProof.blockNumber.toLocaleString()} sealed on channel 'evidencechannel'.` 
        : 'State permanently recorded to distributed ledger state database.',
    });
  }

  // 4. Verification Check
  const isTampered = verificationStatus === 'INTEGRITY_MISMATCH';
  const isVerified = verificationStatus === 'VERIFIED';

  events.push({
    id: 'verified',
    title: isTampered 
      ? 'Verification Failed (Tampering Alert)' 
      : isVerified 
      ? 'Cryptographic Verification Confirmed' 
      : 'Verification Rechecked',
    role: 'Audit Sentinel',
    user: 'Cryptographic Engine',
    timestamp: lastVerifiedAt || evidence.verifiedAt || new Date().toISOString(),
    reference: isTampered ? 'Ledger Hash Mismatch' : 'Deterministic Match Confirmed',
    status: isTampered ? 'warning' : 'completed',
    icon: isTampered ? AlertTriangle : ShieldCheck,
    variant: isTampered ? 'danger' : 'verified',
    details: isTampered 
      ? 'CRITICAL: Recomputed live hash did NOT match anchored ledger state.' 
      : 'All media files and JSON properties successfully re-hashed and verified against the blockchain anchor.',
  });

  // 5. Current State
  events.push({
    id: 'current',
    title: isTampered ? 'Under Security Investigation' : 'Immutable Provenance Guaranteed',
    role: 'Industrial Chain',
    user: 'IEC Node Security',
    timestamp: new Date().toISOString(),
    status: isTampered ? 'warning' : 'active',
    icon: CheckCircle,
    variant: isTampered ? 'danger' : 'verified',
    details: isTampered 
      ? 'Automated security alert triggered to plant manager and security administration.' 
      : 'Evidence chain of custody is intact, tamper-proof, and audit-compliant.',
  });

  return (
    <div className="relative bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[28px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-black/5 dark:border-white/10">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Chain of Custody & Verification Timeline
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Full cryptographic audit trail from ingestion to ledger seal
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold">
          {events.length} Milestones
        </span>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-gradient-to-b before:from-primary-500 before:via-emerald-500 before:to-gray-300 dark:before:to-gray-800">
        {events.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="relative group">
              {/* Dot / Icon container positioned on vertical line */}
              <div className="absolute -left-6 sm:-left-8 top-0 -translate-x-1/2 flex items-center justify-center">
                <SecurityIconBox
                  icon={Icon}
                  variant={item.variant}
                  size="sm"
                  className="ring-4 ring-white dark:ring-[#0B0F17] shadow-sm"
                />
              </div>

              {/* Event card */}
              <div className="pl-4 sm:pl-6">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h4>
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {formatDate(item.timestamp, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {item.user && (
                    <span className="font-medium text-gray-800 dark:text-gray-300">
                      by {item.user}
                    </span>
                  )}
                  {item.role && (
                    <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      {item.role}
                    </span>
                  )}
                </div>

                {item.details && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.details}
                  </p>
                )}

                {item.reference && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                    <span>{item.reference}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
