import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Tag, 
  Box, 
  User as UserIcon, 
  QrCode, 
  FileText, 
  Copy, 
  Check, 
  Calendar,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Badge, Button, SecurityIconBox } from '@components/ui';
import type { Evidence, EvidenceStatus } from '@type-defs/evidence';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import { formatDate } from '@utils/date';
import { UserDisplayName } from '@services/user/userLookupService';

interface EvidenceHeroProps {
  evidence: Evidence;
  assetName: string;
  assetCode?: string;
  onVerify: () => void;
  onOpenAudit: () => void;
  onOpenQR: () => void;
  isVerifying: boolean;
  verificationStatus?: 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PENDING' | 'FAILED' | null;
  canVerify?: boolean;
}

export const EvidenceHero: React.FC<EvidenceHeroProps> = ({
  evidence,
  assetName,
  assetCode,
  onVerify,
  onOpenAudit,
  onOpenQR,
  isVerifying,
  verificationStatus,
  canVerify = true,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Determine top security badge & icon
  const isVerified = verificationStatus === 'VERIFIED';
  const isTampered = verificationStatus === 'INTEGRITY_MISMATCH';

  return (
    <div className="relative bg-white/80 dark:bg-[#0B0F17]/90 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
      {/* Background ambient accents */}
      <div 
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 opacity-20 dark:opacity-25 ${
          isTampered 
            ? 'bg-rose-500' 
            : isVerified 
            ? 'bg-emerald-500' 
            : 'bg-primary-500'
        }`} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none rounded-[32px]" />

      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        
        {/* Left column: Hierarchy of machine identity & technical metadata */}
        <div className="flex-1 min-w-0 space-y-4">
          
          {/* 1. Status & Integrity Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <SecurityIconBox
              icon={isTampered ? ShieldAlert : isVerified ? ShieldCheck : Shield}
              variant={isTampered ? 'danger' : isVerified ? 'verified' : 'primary'}
              size="sm"
              pulse={isTampered || isVerified}
            />
            <Badge 
              className={`${
                isTampered 
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                  : isVerified 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              } px-3 py-1 text-[11px] font-bold tracking-widest uppercase rounded-lg`}
            >
              {isTampered ? 'Integrity Mismatch' : isVerified ? 'Verified' : 'Waiting for Verification'}
            </Badge>

            {evidence.blockchainProof && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-md bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ledger Anchored
              </span>
            )}
          </div>

          {/* 2. Visual Hero: Real Machine/Asset Name */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              {assetName}
            </h1>
            {evidence.description && (
              <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
                {evidence.description}
              </p>
            )}
          </div>

          {/* 3. Secondary Technical Metadata Row */}
          <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-2 text-[13px] text-gray-600 dark:text-gray-400">
            {/* Activity Type */}
            <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-200">
              <Tag className="w-4 h-4 text-primary-500 shrink-0" />
              <span>{ACTIVITY_TYPE_LABELS[evidence.activityType] || evidence.activityType}</span>
            </div>

            {/* Asset Identifier */}
            <div className="flex items-center gap-1.5 font-mono">
              <Box className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 dark:text-gray-400">Asset:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {assetCode || 'ASSET'}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(evidence.assetId, 'asset')}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title={`Copy Asset UUID: ${evidence.assetId}`}
              >
                {copiedId === 'asset' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Evidence ID (Secondary technical metadata) */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-gray-500 dark:text-gray-400">Evidence ID:</span>
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[140px] sm:max-w-[180px]">
                {evidence.evidenceId}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(evidence.evidenceId, 'evidence')}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Copy Evidence UUID"
              >
                {copiedId === 'evidence' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Captured By */}
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 dark:text-gray-400">Captured:</span>
              <span className="font-medium text-gray-900 dark:text-gray-200">
                <UserDisplayName userId={evidence.userId} fallback={evidence.userName || 'Unknown technician'} />
              </span>
              {evidence.userRole && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                  {evidence.userRole}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{formatDate(evidence.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          </div>
        </div>

        {/* Right column: Action Group */}
        <div className="flex flex-col sm:flex-row lg:flex-col shrink-0 gap-3">
          {/* Primary Action: Verify Authenticity (Authorized roles only) */}
          {canVerify && (
            <button
              type="button"
              onClick={onVerify}
              disabled={isVerifying}
              className="inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-2xl font-semibold text-[13px] tracking-wide text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-600/25 border border-primary-500/30 disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Proof...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verify Authenticity</span>
                </>
              )}
            </button>
          )}

          {/* Secondary Action: Audit Trail */}
          <Button
            variant="outline"
            onClick={onOpenAudit}
            className="h-11 px-5 rounded-2xl font-semibold text-[13px] border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 backdrop-blur-md"
          >
            <FileText className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
            Audit Trail
          </Button>

          {/* Tertiary Action: Generate QR */}
          <Button
            variant="outline"
            onClick={onOpenQR}
            className="h-11 px-5 rounded-2xl font-semibold text-[13px] border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 backdrop-blur-md"
          >
            <QrCode className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
            Generate QR
          </Button>
        </div>

      </div>
    </div>
  );
};
