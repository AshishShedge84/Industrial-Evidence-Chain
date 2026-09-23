import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Copy, Check, Lock, ExternalLink, Cpu } from 'lucide-react';
import { SecurityIconBox } from '@components/ui';
import { formatDate } from '@utils/date';

interface IntegrityVerificationBoxProps {
  hash: string;
  isMasked: boolean;
  userRole?: string;
  lastVerifiedAt?: string;
  transactionId?: string;
  blockNumber?: number;
  network?: string;
  isPending?: boolean;
}

export const IntegrityVerificationBox: React.FC<IntegrityVerificationBoxProps> = ({
  hash,
  isMasked,
  userRole,
  lastVerifiedAt,
  transactionId,
  blockNumber,
  network = 'Hyperledger Fabric v2.5',
  isPending = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPending) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-br from-amber-50/70 via-white/80 to-amber-50/30 dark:from-amber-950/25 dark:via-[#15120C]/90 dark:to-amber-950/15 backdrop-blur-xl p-6 sm:p-8 shadow-[0_10px_35px_-10px_rgba(245,158,11,0.15)] dark:shadow-[0_15px_40px_-15px_rgba(217,119,6,0.25)] transition-all duration-300">
        {/* Decorative ambient glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        {/* Header: Security Icon & Main Status */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-amber-500/15 dark:border-amber-500/10">
          <div className="flex items-center gap-3.5">
            <SecurityIconBox
              icon={Lock}
              variant="warning"
              size="lg"
              pulse
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                  Waiting for Verification
                </h2>
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 font-medium mt-0.5">
                Evidence anchored to blockchain ledger. Awaiting Manager review & cryptographic check.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Pending Verification
          </div>
        </div>

        {/* Middle: Evidence Fingerprint */}
        <div className="py-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Anchored Ledger Fingerprint (SHA-256)
              </span>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                {isMasked ? (
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                    Masked ({userRole || 'Standard'} View)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    Full Hash (Authorized: {userRole})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-black/40 border border-amber-500/20 dark:border-amber-500/15 group shadow-inner">
              <code className="font-mono text-xs sm:text-sm text-gray-900 dark:text-amber-200 tracking-wider break-all select-all font-semibold">
                {hash || 'No hash recorded'}
              </code>
              {hash && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ml-3 p-2 rounded-xl text-gray-400 hover:text-gray-800 dark:hover:text-amber-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                  title="Copy Fingerprint"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Technical Anchor Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-white/[0.02] border border-amber-500/10 dark:border-white/5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Ledger Anchor State
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                  SEALED & ANCHORED
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  · {network}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-white/[0.02] border border-amber-500/10 dark:border-white/5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Verification Pipeline
              </span>
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Awaiting Manager Trigger
              </span>
            </div>
          </div>

          {transactionId && (
            <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
              <span className="truncate mr-2">TX: {transactionId}</span>
              {blockNumber && <span>Block #{blockNumber.toLocaleString()}</span>}
            </div>
          )}
        </div>

        {/* Footer info notice */}
        <div className="pt-4 border-t border-amber-500/15 dark:border-amber-500/10 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Record is immutable and sealed. Integrity check runs upon Manager review.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white/80 to-emerald-50/30 dark:from-emerald-950/25 dark:via-[#0B1313]/90 dark:to-emerald-950/15 backdrop-blur-xl p-6 sm:p-8 shadow-[0_10px_35px_-10px_rgba(16,185,129,0.15)] dark:shadow-[0_15px_40px_-15px_rgba(5,150,105,0.25)] transition-all duration-300">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      {/* Header: Security Icon & Main Status */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-emerald-500/15 dark:border-emerald-500/10">
        <div className="flex items-center gap-3.5">
          <SecurityIconBox
            icon={ShieldCheck}
            variant="verified"
            size="lg"
            pulse
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                Integrity Verified
              </h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400/80 font-medium mt-0.5">
              Deterministic SHA-256 hash matches immutable blockchain ledger anchor
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Consensus Confirmed
        </div>
      </div>

      {/* Middle: Evidence Fingerprint */}
      <div className="py-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              Evidence Fingerprint (SHA-256)
            </span>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              {isMasked ? (
                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                  Masked ({userRole || 'Standard'} View)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                  Full Hash (Authorized: {userRole})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-black/40 border border-emerald-500/20 dark:border-emerald-500/15 group shadow-inner">
            <code className="font-mono text-xs sm:text-sm text-gray-900 dark:text-emerald-200 tracking-wider break-all select-all font-semibold">
              {hash || 'No hash recorded'}
            </code>
            {hash && (
              <button
                type="button"
                onClick={handleCopy}
                className="ml-3 p-2 rounded-xl text-gray-400 hover:text-gray-800 dark:hover:text-emerald-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                title="Copy Fingerprint"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Technical Anchor Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-white/[0.02] border border-emerald-500/10 dark:border-white/5">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Ledger Anchor State
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                MATCHED
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                · {network}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-white/[0.02] border border-emerald-500/10 dark:border-white/5">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Last Cryptographic Check
            </span>
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
              {lastVerifiedAt ? formatDate(lastVerifiedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'Verified just now'}
            </span>
          </div>
        </div>

        {transactionId && (
          <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
            <span className="truncate mr-2">TX: {transactionId}</span>
            {blockNumber && <span>Block #{blockNumber.toLocaleString()}</span>}
          </div>
        )}
      </div>

      {/* Footer reassurance notice */}
      <div className="pt-4 border-t border-emerald-500/15 dark:border-emerald-500/10 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Evidence has not been modified or tampered with since anchor.</span>
      </div>
    </div>
  );
};
