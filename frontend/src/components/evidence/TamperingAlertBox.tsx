import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  BellRing, 
  UserCheck, 
  FileWarning, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw,
  Send
} from 'lucide-react';
import { SecurityIconBox, Button } from '@components/ui';
import { formatDate } from '@utils/date';

interface TamperingAlertBoxProps {
  assetName: string;
  assetCode?: string;
  evidenceId: string;
  detectedAt?: string;
  calculatedHash?: string;
  trustedHash?: string;
  isMasked?: boolean;
  userRole?: string;
  onRecheck?: () => void;
  isRechecking?: boolean;
}

export const TamperingAlertBox: React.FC<TamperingAlertBoxProps> = ({
  assetName,
  assetCode,
  evidenceId,
  detectedAt = new Date().toISOString(),
  calculatedHash,
  trustedHash,
  isMasked = false,
  userRole,
  onRecheck,
  isRechecking = false,
}) => {
  const [flagged, setFlagged] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleFlagIncident = () => {
    setFlagged(true);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border-2 border-rose-500/80 bg-gradient-to-br from-rose-50 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-[#15090C]/90 dark:to-rose-950/30 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_15px_45px_-10px_rgba(225,29,72,0.25)] dark:shadow-[0_20px_50px_-15px_rgba(225,29,72,0.4)] transition-all animate-in fade-in duration-300">
      {/* Visual warning beacon in corner */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-500/20">
        <div className="flex items-center gap-4">
          <SecurityIconBox
            icon={ShieldAlert}
            variant="danger"
            size="lg"
            pulse
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 tracking-wide uppercase">
                Tampering Detected
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-rose-600 text-white animate-pulse">
                Critical Incident
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-300 font-medium mt-0.5">
              Ledger fingerprint does not match calculated evidence hash state.
            </p>
          </div>
        </div>

        {onRecheck && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRecheck}
            disabled={isRechecking}
            className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRechecking ? 'animate-spin' : ''}`} />
            Re-verify Cryptography
          </Button>
        )}
      </div>

      {/* Structured Forensic Evidence Fields */}
      <div className="py-6 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 border border-rose-500/20">
            <dt className="text-[11px] font-bold text-rose-800/80 dark:text-rose-400 uppercase tracking-wider mb-1">
              Affected Asset
            </dt>
            <dd className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
              <span>{assetName} {assetCode && `(${assetCode})`}</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 border border-rose-500/20">
            <dt className="text-[11px] font-bold text-rose-800/80 dark:text-rose-400 uppercase tracking-wider mb-1">
              Evidence Identifier
            </dt>
            <dd className="font-mono text-xs text-gray-900 dark:text-gray-200 flex items-center justify-between">
              <span className="truncate mr-2">{evidenceId}</span>
              <button
                type="button"
                onClick={() => handleCopy(evidenceId, 'ev')}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {copiedField === 'ev' ? <Check className="w-3.5 h-3.5 text-rose-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </dd>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 border border-rose-500/20">
            <dt className="text-[11px] font-bold text-rose-800/80 dark:text-rose-400 uppercase tracking-wider mb-1">
              Detection Timestamp
            </dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formatDate(detectedAt, { dateStyle: 'medium', timeStyle: 'medium' })}</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 border border-rose-500/20">
            <dt className="text-[11px] font-bold text-rose-800/80 dark:text-rose-400 uppercase tracking-wider mb-1">
              Integrity Failure Reason
            </dt>
            <dd className="font-semibold text-rose-700 dark:text-rose-300">
              Ledger fingerprint mismatch: Evidence canonical state or physical media altered.
            </dd>
          </div>
        </dl>

        {/* Cryptographic Comparison */}
        {(calculatedHash || trustedHash) && (
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-black/60 border border-rose-500/25 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span>Cryptographic Fingerprint Audit</span>
              <span>{isMasked ? `Masked (${userRole})` : `Full Audit (${userRole})`}</span>
            </div>

            {trustedHash && (
              <div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">Ledger Anchored Hash:</span>
                <code className="block font-mono text-xs text-gray-700 dark:text-gray-300 break-all p-2 rounded-lg bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  {trustedHash}
                </code>
              </div>
            )}

            {calculatedHash && (
              <div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block mb-0.5">Live Recalculated Hash:</span>
                <code className="block font-mono text-xs text-rose-700 dark:text-rose-300 break-all p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                  {calculatedHash}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incident Escalation & Security Flags */}
      <div className="pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
            Automated Escalation:
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800 font-semibold flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Flagged to Manager
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800 font-semibold flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Flagged to Admin
          </span>
        </div>

        <Button
          size="sm"
          onClick={handleFlagIncident}
          disabled={flagged}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md shadow-rose-600/30"
        >
          {flagged ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Incident Escalated
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-1.5" />
              Escalate Security Event
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
