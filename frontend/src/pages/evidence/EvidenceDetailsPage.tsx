import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Badge } from '@components/ui';
import { Button } from '@components/ui';
import { FileText, Shield, MapPin, Calendar, Tag, Download, Eye, QrCode, User, Box, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import type { Evidence, EvidenceStatus, ActivityType } from '@type-defs/evidence';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import { formatDate } from '@utils/date';
import { evidenceService } from '@services/evidence/evidenceService';

export function EvidenceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvidence = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await evidenceService.getEvidence(id);
        if (isMounted) {
          if (res.success && res.data) {
            setEvidence(res.data);
          } else {
            setError(res.error?.message || 'Evidence not found');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch evidence');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchEvidence();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <p className="text-error-600 font-medium">{error || 'Evidence not found'}</p>
      </div>
    );
  }

  const generatedHistory = [];
  if (evidence.verifiedAt) {
    generatedHistory.push({ timestamp: evidence.verifiedAt, action: 'Verified', user: 'System', details: 'Integrity check passed' });
  }
  if (evidence.anchoredAt) {
    generatedHistory.push({ timestamp: evidence.anchoredAt, action: 'Blockchain Anchored', user: 'System', details: evidence.blockchainProof?.transactionId ? `TX: ${evidence.blockchainProof.transactionId}` : '' });
  }
  if (evidence.submittedAt) {
    generatedHistory.push({ timestamp: evidence.submittedAt, action: 'Evidence Submitted', user: evidence.userId, details: '' });
  }
  if (evidence.createdAt) {
    generatedHistory.push({ timestamp: evidence.createdAt, action: 'Evidence Created', user: evidence.userId, details: 'Activity started' });
  }

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title={evidence.evidenceId}
        description={`${ACTIVITY_TYPE_LABELS[evidence.activityType]} · ${evidence.assetId}`}
        breadcrumbs={[
          { label: 'Evidence', href: '/evidence' },
          { label: evidence.evidenceId },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-4 font-semibold text-[13px] hover:bg-black/5 hover:text-gray-900 border-black/[0.05]">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="h-10 px-5 font-semibold text-[13px] bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 rounded-xl transition-all">
              <Shield className="h-4 w-4 mr-2" />
              Verify Authenticity
            </Button>
          </div>
        }
      >
        <div className="grid gap-12 lg:grid-cols-12 max-w-6xl">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Header Badge */}
            <div className="flex items-center gap-4 border-b border-black/5 pb-8">
              <div className="h-16 w-16 rounded-2xl bg-success-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success-600" />
              </div>
              <div>
                <Badge className={`${EVIDENCE_STATUS_COLORS[evidence.status]} px-3 py-1 text-[13px] font-bold uppercase tracking-wider mb-2`}>
                  {evidence.status}
                </Badge>
                <p className="text-[15px] text-gray-500 font-medium">Evidence captured securely and anchored to ledger</p>
              </div>
            </div>

            {/* Evidence Data */}
            <div className="space-y-8">
              <div>
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-6">Core Details</h3>
                <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-[13px] text-gray-500 font-medium mb-1.5">Activity Type</dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                      <Tag className="h-4 w-4 text-primary-500" />
                      {ACTIVITY_TYPE_LABELS[evidence.activityType]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-gray-500 font-medium mb-1.5">Asset Reference</dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                      <Box className="h-4 w-4 text-primary-500" />
                      {evidence.assetId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-gray-500 font-medium mb-1.5">Captured By</dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                      <User className="h-4 w-4 text-primary-500" />
                      User {evidence.userId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-gray-500 font-medium mb-1.5">Timestamp</dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                      <Calendar className="h-4 w-4 text-primary-500" />
                      {formatDate(evidence.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
                    </dd>
                  </div>
                </dl>
              </div>

              {evidence.location && (
                <div className="pt-8 border-t border-black/5">
                  <dt className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Location Anchor</dt>
                  <div className="bg-gray-50/50 rounded-2xl p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-gray-900 mb-1">
                        {evidence.location.address || `Location (${evidence.location.latitude.toFixed(4)}, ${evidence.location.longitude.toFixed(4)})`}
                      </p>
                      <p className="text-[13px] text-gray-500 font-mono">
                        LAT: {evidence.location.latitude.toFixed(6)} | LNG: {evidence.location.longitude.toFixed(6)}
                      </p>
                      {evidence.location.accuracy !== undefined && (
                        <p className="text-[12px] text-gray-400 mt-2">Accuracy: ±{evidence.location.accuracy}m</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-black/5">
                <dt className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Observations</dt>
                <p className="text-[16px] text-gray-800 leading-relaxed whitespace-pre-wrap">{evidence.description || 'No observations recorded.'}</p>
              </div>
            </div>

            {/* Media Files */}
            <div className="pt-8 border-t border-black/5">
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-6">Verified Media</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {evidence.mediaReferences.map((media) => (
                  <div key={media.id} className="group flex flex-col bg-white rounded-3xl border border-black/[0.03] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {media.type === 'photo' ? (
                        <img src={media.url} alt={`Evidence ${media.id}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <video src={media.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted />
                      )}
                      <div className="absolute top-3 right-3 px-2.5 py-1 text-[11px] font-bold tracking-wider text-gray-900 bg-white/90 backdrop-blur-md rounded-md shadow-sm">
                        {media.type.toUpperCase()}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between text-[13px] font-medium text-gray-500 mb-4">
                        <span>{media.size ? (media.size / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown Size'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-9 bg-gray-50 hover:bg-gray-100 border-transparent text-[13px] font-semibold text-gray-700">
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Button>
                        <Button variant="outline" className="w-9 h-9 p-0 bg-gray-50 hover:bg-gray-100 border-transparent text-gray-700">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blockchain Proof */}
            {evidence.blockchainProof && (
              <div className="pt-8 border-t border-black/5">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="h-5 w-5 text-gray-900" />
                  <h3 className="text-[16px] font-bold text-gray-900">Blockchain Integrity</h3>
                </div>
                <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 text-gray-300">
                  <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 text-[13px]">
                    <div>
                      <dt className="text-gray-500 font-medium mb-1">Transaction ID</dt>
                      <dd className="font-mono text-gray-100 break-all">{evidence.blockchainProof.transactionId}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 font-medium mb-1">Block Number</dt>
                      <dd className="font-mono text-gray-100">{evidence.blockchainProof.blockNumber.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 font-medium mb-1">Block Hash</dt>
                      <dd className="font-mono text-gray-100 break-all">{evidence.blockchainProof.blockHash}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 font-medium mb-1">Network</dt>
                      <dd className="font-mono text-gray-100">{evidence.blockchainProof.network}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500 font-medium mb-1">Merkle Root</dt>
                      <dd className="font-mono text-gray-100 break-all">{evidence.blockchainProof.merkleRoot}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 font-medium mb-1">Anchored At</dt>
                      <dd className="text-gray-100">{formatDate(evidence.blockchainProof.timestamp)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Quick Actions */}
            <div>
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-6">Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-black/[0.03] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <Shield className="h-5 w-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-[14px] text-gray-900">Run Verification</span>
                  </div>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-black/[0.03] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-semibold text-[14px] text-gray-900">Audit Trail</span>
                  </div>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-black/[0.03] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                      <QrCode className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-semibold text-[14px] text-gray-900">Generate QR</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-6">Chain of Custody</h3>
              <div className="relative border-l-2 border-black/5 ml-4 space-y-8 pb-4">
                {generatedHistory.map((entry, index) => (
                  <div key={index} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-primary-500 shadow-sm shadow-primary-500/30' : 'bg-gray-300'}`} />
                    <div>
                      <p className={`font-bold text-[14px] ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>{entry.action}</p>
                      <p className="text-[13px] text-gray-500 font-medium mt-0.5">by {entry.user}</p>
                      {entry.details && (
                        <p className="text-[13px] text-gray-500 mt-1 bg-gray-50 inline-block px-2 py-1 rounded-md">{entry.details}</p>
                      )}
                      <p className="text-[12px] text-gray-400 mt-2 font-mono">{formatDate(entry.timestamp, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </PageContainer>
    </div>
  );
}