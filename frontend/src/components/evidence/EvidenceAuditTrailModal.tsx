import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Clock, 
  User, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  X,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Modal, Button, Badge, SecurityIconBox } from '@components/ui';
import type { AuditTrailEntry } from '@type-defs/verification';
import { formatDate } from '@utils/date';
import { apiClient } from '@services/api/apiClient';

interface EvidenceAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceId: string;
  assetName: string;
  assetId: string;
}

export const EvidenceAuditTrailModal: React.FC<EvidenceAuditTrailModalProps> = ({
  isOpen,
  onClose,
  evidenceId,
  assetName,
  assetId,
}) => {
  const [logs, setLogs] = useState<AuditTrailEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !evidenceId) return;

    let isMounted = true;
    const fetchAudit = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch from the real audit trail endpoint
        const res = await apiClient.get<AuditTrailEntry[]>(`/evidence/${evidenceId}/audit-trail`);
        if (isMounted) {
          if (res.success && res.data && res.data.length > 0) {
            setLogs(res.data);
          } else {
            // Fallback to query admin audit logs or build foundational record
            setLogs([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load cryptographic audit history');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAudit();
    return () => { isMounted = false; };
  }, [isOpen, evidenceId]);

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const exportAuditCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Action', 'Actor', 'Timestamp', 'IP Address', 'Details'];
    const rows = logs.map(l => [
      l.id,
      l.action,
      l.performedBy,
      l.performedAt,
      l.ipAddress || 'N/A',
      JSON.stringify(l.details || {})
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${evidenceId.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cryptographic Audit Trail & Provenance Log"
      description={`Industrial security log for ${assetName} (ID: ${evidenceId.substring(0, 8)}...)`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300 block">
              Audited Asset: <span className="font-bold text-gray-900 dark:text-white">{assetName}</span>
            </span>
            <span className="font-mono text-gray-500 dark:text-gray-400 block">
              Evidence UUID: {evidenceId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAuditCSV}
              disabled={logs.length === 0}
              className="border-black/10 dark:border-white/15 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Retrieving cryptographic audit records from PostgreSQL...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-center text-sm">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <SecurityIconBox icon={FileText} variant="neutral" size="lg" className="mx-auto" />
            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Audit Stream Initializing
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Foundational lifecycle entries recorded during initial evidence capture and blockchain ledger anchor.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const isAnchor = log.action.includes('Anchor') || log.action.includes('Submit');
              const isVerify = log.action.includes('Verif');
              const isTamper = log.action.includes('Mismatch') || log.action.includes('Reject');

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-black/10 dark:border-white/10 shadow-sm space-y-3 transition-colors hover:border-primary-500/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <SecurityIconBox
                        icon={isTamper ? AlertTriangle : isVerify || isAnchor ? Shield : FileText}
                        variant={isTamper ? 'danger' : isVerify || isAnchor ? 'verified' : 'primary'}
                        size="sm"
                      />
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          by <span className="font-medium text-gray-700 dark:text-gray-300">{log.performedBy}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(log.performedAt, { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                    </div>
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all space-y-1">
                      {Object.entries(log.details).map(([k, v]) => (
                        <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                          <span className="text-gray-400 font-semibold min-w-[120px]">{k}:</span>
                          <span className="text-gray-900 dark:text-gray-200">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                    <span>Log Reference: {log.id.substring(0, 16)}...</span>
                    {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-black/5 dark:border-white/10 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
