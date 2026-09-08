import { Loader2, CheckCircle, AlertCircle, AlertTriangle, Copy, ExternalLink, ShieldCheck, Fingerprint, Database, Clock, Zap } from 'lucide-react';
import { Badge } from '@components/ui';
import type { VerificationResult, VerificationDiscrepancy } from '@type-defs/verification';

interface VerificationResultProps {
  result: VerificationResult | null;
  isLoading?: boolean;
}

export function VerificationResult({ result, isLoading }: VerificationResultProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-12 flex flex-col items-center justify-center animate-pulse">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Verifying cryptography and querying chain...</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const isSuccess = result.isValid;
  const statusColor = isSuccess ? 'text-emerald-600' : 'text-red-600';
  const statusBg = isSuccess ? 'bg-emerald-50' : 'bg-red-50';
  const statusBorder = isSuccess ? 'border-emerald-200' : 'border-red-200';
  const StatusIcon = isSuccess ? ShieldCheck : AlertTriangle;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Status Header */}
      <div className={`p-6 rounded-2xl border flex items-center justify-between ${statusBg} ${statusBorder}`}>
        <div className="flex items-center gap-5">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center bg-white shadow-sm border ${statusBorder}`}>
            <StatusIcon className={`h-7 w-7 ${statusColor}`} />
          </div>
          <div>
            <h3 className={`text-xl font-semibold tracking-tight mb-1 ${isSuccess ? 'text-emerald-900' : 'text-red-900'}`}>
              {isSuccess ? 'Cryptographically Verified' : 'Integrity Mismatch Detected'}
            </h3>
            <p className={`text-sm ${isSuccess ? 'text-emerald-700' : 'text-red-700'}`}>
              {isSuccess 
                ? 'Evidence securely matches immutable ledger records.'
                : 'Warning: Evidence data has been altered or corrupted.'}
            </p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs uppercase tracking-widest font-semibold opacity-50 mb-1">Checked By</p>
          <p className="font-medium text-sm">{result.checkedBy}</p>
        </div>
      </div>

      {/* Discrepancies (if any) */}
      {!isSuccess && result.details.discrepancies && result.details.discrepancies.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider">Detected Anomalies</h4>
          {result.details.discrepancies.map((d: VerificationDiscrepancy, i: number) => (
            <div key={i} className="p-4 bg-white dark:bg-white/5 border border-red-100 dark:border-red-900/40 rounded-xl flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{d.field} mismatch</p>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-1">Expected (Ledger)</span>
                    <span className="font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">{d.expected}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-1">Actual (Local)</span>
                    <span className="font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">{d.actual}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Ledger */}
      <div className="grid sm:grid-cols-2 gap-4">
        <VerificationLedgerItem 
          icon={Fingerprint} 
          label="SHA-256 Hash" 
          value={result.details.hashMatch ? "Match" : "Mismatch"} 
          passed={result.details.hashMatch} 
        />
        <VerificationLedgerItem 
          icon={Zap} 
          label="Digital Signature" 
          value={result.details.signatureValid ? "Valid" : "Invalid"} 
          passed={result.details.signatureValid} 
        />
        <VerificationLedgerItem 
          icon={Database} 
          label="Chain Integrity" 
          value={result.details.chainIntact ? "Intact" : "Broken"} 
          passed={result.details.chainIntact} 
        />
        <VerificationLedgerItem 
          icon={Clock} 
          label="Timestamp Check" 
          value={result.details.timestampValid ? "Synced" : "Drift Detected"} 
          passed={result.details.timestampValid} 
        />
      </div>

      {/* Blockchain Proof Block (High Contrast) */}
      {result.blockchainProof && (
        <div className="bg-gray-900 rounded-2xl p-6 text-gray-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <ShieldCheck className="h-48 w-48" />
          </div>
          
          <div className="flex items-center justify-between mb-6 relative z-10 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                ANCHORED
              </Badge>
              <h4 className="font-medium text-white tracking-tight">Blockchain Receipt</h4>
            </div>
            <button className="text-gray-400 hover:text-white transition-colors" title="Copy TX">
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 relative z-10 text-[13px]">
            <div>
              <p className="text-gray-500 mb-1.5 uppercase tracking-wider font-semibold text-[11px]">Network</p>
              <p className="font-medium text-gray-200">{result.blockchainProof.network}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1.5 uppercase tracking-wider font-semibold text-[11px]">Block Number</p>
              <p className="font-mono text-gray-200">{result.blockchainProof.blockNumber}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-gray-500 mb-1.5 uppercase tracking-wider font-semibold text-[11px]">Transaction ID</p>
              <p className="font-mono text-gray-300 break-all">{result.blockchainProof.transactionId}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-gray-500 mb-1.5 uppercase tracking-wider font-semibold text-[11px]">Merkle Root</p>
              <p className="font-mono text-gray-300 break-all">{result.blockchainProof.merkleRoot}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end relative z-10">
            <button className="text-[13px] font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1.5 transition-colors">
              View on Block Explorer <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationLedgerItem({ icon: Icon, label, value, passed }: { icon: any, label: string, value: string, passed: boolean }) {
  return (
    <div className="flex items-center p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl shadow-sm">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 ${passed ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
        <Icon className={`h-5 w-5 ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
      </div>
      <div className="flex-1">
        <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">{label}</p>
        <p className={`font-semibold text-[14px] ${passed ? 'text-gray-900 dark:text-gray-100' : 'text-red-700 dark:text-red-400'}`}>{value}</p>
      </div>
      {passed ? (
        <CheckCircle className="h-5 w-5 text-emerald-500" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-500" />
      )}
    </div>
  );
}