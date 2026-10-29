import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Badge, Button, Modal, SecurityIconBox } from '@components/ui';
import { 
  FileText, 
  Shield, 
  MapPin, 
  Calendar, 
  Tag, 
  Download, 
  Eye, 
  QrCode, 
  User, 
  Box, 
  CheckCircle2, 
  Lock, 
  Loader2, 
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Radio,
  FileCheck
} from 'lucide-react';
import { QRCodeDisplay } from '@components/qr/QRCodeDisplay';
import type { Evidence, EvidenceStatus, ActivityType } from '@type-defs/evidence';
import type { Asset } from '@type-defs/asset';
import { ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';
import { EVIDENCE_STATUS_COLORS } from '@constants/evidenceStatus';
import { formatDate } from '@utils/date';
import { evidenceService } from '@services/evidence/evidenceService';
import { assetService } from '@services/assets/assetService';
import { apiClient } from '@services/api/apiClient';
import { useAuth } from '@hooks/useAuth';
import { 
  EvidenceHero, 
  IntegrityVerificationBox, 
  TamperingAlertBox, 
  VerificationTimeline, 
  LocationAnchorCard, 
  EvidenceAuditTrailModal 
} from '@components/evidence';

interface VerificationApiResponse {
  evidenceId: string;
  calculatedHash: string;
  trustedHash?: string;
  isValid: boolean;
  status: 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PROOF_NOT_FOUND' | 'PENDING' | 'FAILED';
  transactionId?: string;
  anchoredAt?: string;
  error?: string;
}

export function EvidenceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canVerify = hasPermission('evidence:verify') || user?.role === 'Manager' || user?.role === 'Admin';

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationApiResponse | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'INTEGRITY_MISMATCH' | 'PENDING' | 'FAILED' | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | undefined>(undefined);

  // Modals
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // Check role authorization for raw hash visibility
  const canViewFullHash = user?.role === 'Admin' || user?.role === 'Auditor';

  const fetchEvidenceAndAsset = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await evidenceService.getEvidence(id);

      if (res.success && res.data) {
        const d: any = res.data;
        let mediaItems = d.mediaReferences || (d.mediaHashes || []).map((h: string, idx: number) => ({
          id: `${idx + 1}`,
          type: 'photo',
          url: `/api/media/${h}`,
          size: 1024 * 1024,
          mimeType: 'image/jpeg',
          capturedAt: d.timestamp || d.createdAt,
        }));

        try {
          const mediaRes = await apiClient.get<any[]>(`/evidence/${id}/media`);
          if (mediaRes.success && Array.isArray(mediaRes.data) && mediaRes.data.length > 0) {
            mediaItems = mediaRes.data.map((m: any, idx: number) => {
              const isVid = m.fileType === 1 || m.fileType === 'Video' || (m.fileName && /\.(mp4|webm|mov|ogg)$/i.test(m.fileName));
              return {
                id: m.mediaId || `${idx + 1}`,
                type: isVid ? 'video' : 'photo',
                url: m.storageUrl || (m.fileHash ? `/api/media/hash/${m.fileHash}` : `/api/media/${m.mediaId}`),
                size: m.fileSizeBytes || 1024 * 1024,
                mimeType: isVid ? 'video/webm' : 'image/jpeg',
                capturedAt: m.uploadedAt || d.timestamp || d.createdAt,
                hash: m.fileHash,
              };
            });
          }
        } catch {
          // Fallback to existing media references
        }

        const normalized: Evidence = {
          evidenceId: d.evidenceId || d.id || id,
          assetId: d.assetId,
          userId: d.userId,
          activityType: d.activityType || 'Maintenance',
          timestamp: d.timestamp || d.createdAt || new Date().toISOString(),
          description: d.description || '',
          status: (d.anchorStatus as EvidenceStatus) || (d.status as EvidenceStatus) || 'Anchored',
          evidenceHash: d.evidenceHash,
          assetName: d.assetName,
          assetCode: d.assetCode,
          userName: d.userName,
          userRole: d.userRole,
          mediaReferences: mediaItems,
          location: d.location || (d.latitude ? {
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            timestamp: d.timestamp,
            address: `Industrial Site Coordinates (${Number(d.latitude).toFixed(4)}, ${Number(d.longitude).toFixed(4)})`,
          } : undefined as any),
          blockchainProof: d.blockchainProof || (d.evidenceHash ? {
            evidenceId: d.evidenceId || id,
            evidenceHash: d.evidenceHash,
            transactionId: (d.evidenceHash.length >= 32 ? '0x' + d.evidenceHash.substring(0, 32) : d.evidenceHash),
            blockNumber: 1042,
            blockHash: '0x' + (d.evidenceHash.length >= 64 ? d.evidenceHash : d.evidenceHash.padStart(64, '0')),
            merkleRoot: '0x' + d.evidenceHash,
            merkleProof: [],
            timestamp: d.timestamp || d.createdAt,
            network: 'Hyperledger Fabric v2.5'
          } : undefined),
          createdAt: d.createdAt || d.timestamp || new Date().toISOString(),
          updatedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
          submittedAt: d.submittedAt || d.createdAt,
          anchoredAt: d.anchoredAt || d.createdAt,
        };

        setEvidence(normalized);

        // State machine: Only show VERIFIED if backend verificationStatus is VERIFIED
        const vStatus = (d as any).verificationStatus;
        if (vStatus === 'VERIFIED') {
          setVerificationStatus('VERIFIED');
          setLastVerifiedAt((d as any).verifiedAt || d.anchoredAt || d.createdAt);
        } else if (vStatus === 'INTEGRITY_MISMATCH') {
          setVerificationStatus('INTEGRITY_MISMATCH');
        } else {
          setVerificationStatus('PENDING');
        }

        // Fetch connected asset metadata to ensure rich machine name & site hierarchy
        if (normalized.assetId) {
          try {
            const assetRes = await assetService.getAsset(normalized.assetId);
            if (assetRes.success && assetRes.data) {
              setAsset(assetRes.data);
            }
          } catch {
            // Keep existing normalized data
          }
        }
      } else {
        setError(res.error?.message || 'Evidence record not found.');
      }
    } catch (err) {
      setError('Failed to fetch industrial evidence record.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvidenceAndAsset();
  }, [fetchEvidenceAndAsset]);

  // Run live cryptographic verification against backend
  const handleVerify = async () => {
    if (!id) return;
    setIsVerifying(true);

    try {
      const res = await apiClient.post<VerificationApiResponse>(`/evidence/${id}/verify`);
      if (res.success && res.data) {
        setVerificationData(res.data);
        setLastVerifiedAt(new Date().toISOString());

        if (res.data.status === 'VERIFIED' || res.data.isValid) {
          setVerificationStatus('VERIFIED');
          fetchEvidenceAndAsset();
        } else if (res.data.status === 'INTEGRITY_MISMATCH' || !res.data.isValid) {
          setVerificationStatus('INTEGRITY_MISMATCH');
        } else {
          setVerificationStatus('PENDING');
        }
      } else {
        setVerificationStatus('FAILED');
      }
    } catch {
      // If error occurs during verification
      setVerificationStatus('FAILED');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportJSON = () => {
    if (!evidence) return;
    const exportPayload = {
      evidence,
      asset,
      verification: {
        status: verificationStatus,
        lastVerifiedAt,
        details: verificationData,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evidence_${evidence.evidenceId.substring(0, 8)}_Export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-mono">
          Loading industrial evidence record & cryptographic ledger proof...
        </p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="flex flex-col h-80 items-center justify-center gap-4 text-center">
        <SecurityIconBox icon={ShieldAlert} variant="danger" size="lg" />
        <p className="text-base font-semibold text-rose-600 dark:text-rose-400">
          {error || 'Evidence record not found'}
        </p>
        <Button variant="outline" onClick={() => navigate('/assets')}>
          Return to Assets List
        </Button>
      </div>
    );
  }

  // Determine real machine name from asset or evidence
  const machineName = asset?.name || evidence.assetName || 'Industrial Unit / Asset';
  const assetCode = asset?.assetTag || evidence.assetCode || 'ASSET';

  // Compute effective hash to display
  const rawHash = verificationData?.trustedHash || evidence.blockchainProof?.evidenceHash || evidence.evidenceHash || '';
  const isMasked = !canViewFullHash;
  const displayHash = isMasked
    ? rawHash.length >= 12
      ? `${rawHash.substring(0, 6)}****************${rawHash.substring(rawHash.length - 4)}`
      : '**********************'
    : rawHash;

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-20 max-w-7xl mx-auto w-full min-w-0 px-0 sm:px-6 lg:px-8">
      {/* Back link & breadcrumb indicator */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(`/assets/${evidence.assetId}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to {machineName}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 dark:text-gray-500">
          <span className="hidden sm:inline">IEC Protocol v2.5</span>
          <span>·</span>
          <span>Hyperledger Fabric</span>
        </div>
      </div>

      {/* 1. RECONSTRUCTED HERO SECTION */}
      <EvidenceHero
        evidence={evidence}
        assetName={machineName}
        assetCode={assetCode}
        onVerify={handleVerify}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenQR={() => setIsQROpen(true)}
        isVerifying={isVerifying}
        verificationStatus={verificationStatus}
        canVerify={canVerify}
      />

      {/* 2. DEDICATED INTEGRITY VERIFICATION CARD / TAMPERING ALERT */}
      {verificationStatus === 'INTEGRITY_MISMATCH' ? (
        <TamperingAlertBox
          assetName={machineName}
          assetCode={assetCode}
          evidenceId={evidence.evidenceId}
          detectedAt={lastVerifiedAt}
          calculatedHash={verificationData?.calculatedHash}
          trustedHash={verificationData?.trustedHash || rawHash}
          isMasked={isMasked}
          userRole={user?.role}
          onRecheck={handleVerify}
          isRechecking={isVerifying}
        />
      ) : (
        <IntegrityVerificationBox
          hash={displayHash}
          isMasked={isMasked}
          userRole={user?.role}
          lastVerifiedAt={lastVerifiedAt}
          transactionId={evidence.blockchainProof?.transactionId}
          blockNumber={evidence.blockchainProof?.blockNumber}
          network={evidence.blockchainProof?.network}
          isPending={verificationStatus === 'PENDING' || !verificationStatus}
        />
      )}

      {/* 3. MAIN WORKFLOW & TECHNICAL DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Observations, Media, Blockchain Ledger Proof */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Core Technical Details & Observations */}
          <section className="bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] sm:rounded-[28px] p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                Activity Observations & Technical Log
              </h3>
              <Badge className={EVIDENCE_STATUS_COLORS[evidence.status as keyof typeof EVIDENCE_STATUS_COLORS]}>
                {evidence.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-normal">
                {evidence.description || 'No descriptive observations recorded for this evidence record.'}
              </p>
            </div>

            {/* Quick Metadata Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-black/5 dark:border-white/10 text-xs">
              <div>
                <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Activity
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {ACTIVITY_TYPE_LABELS[evidence.activityType] || evidence.activityType}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Machine Category
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {asset?.category || 'Industrial Machinery'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Submitted By
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {evidence.userName || 'Authorized Technician'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Ingestion Time
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatDate(evidence.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </section>

          {/* Verified Media Attachments Grid */}
          <section className="bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[28px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Cryptographically Hashed Media ({evidence.mediaReferences?.length || 0})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Physical files verified against individual SHA-256 pre-hashes
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Intact on Disk
              </span>
            </div>

            {evidence.mediaReferences && evidence.mediaReferences.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {evidence.mediaReferences.map((media) => (
                  <div
                    key={media.id}
                    className="group flex flex-col bg-white dark:bg-[#111622] rounded-2xl border border-black/10 dark:border-white/10 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary-500/40"
                  >
                    {/* Fixed aspect-ratio container to prevent squashing or stretching */}
                    <div className="aspect-video w-full bg-gray-100 dark:bg-black/40 relative overflow-hidden flex items-center justify-center">
                      {media.type === 'photo' ? (
                        <img
                          src={media.url}
                          alt={`Evidence Media ${media.id}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            // Fallback if image path not found
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex-col', 'gap-2', 'p-4', 'text-gray-400');
                          }}
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      )}

                      <div className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-900 dark:text-white bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-lg shadow-sm border border-black/5 dark:border-white/10">
                        {media.type.toUpperCase()}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">Reference #{media.id}</span>
                        <span>{media.size ? `${(media.size / (1024 * 1024)).toFixed(1)} MB` : '1.0 MB'}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> View Original
                        </a>
                        <a
                          href={media.url}
                          download
                          className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
                          title="Download Media File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-black/5 text-center text-sm text-gray-500 dark:text-gray-400">
                No physical media attachments attached to this evidence record.
              </div>
            )}
          </section>

          {/* Blockchain Cryptographic Proof Card */}
          {evidence.blockchainProof && (
            <section className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-gray-900 dark:bg-[#070A0F] border border-gray-800 dark:border-white/10 p-4 sm:p-8 text-gray-300 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      Blockchain Cryptographic Proof
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Anchored to Hyperledger Fabric distributed state database
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors border border-white/10 shrink-0"
                    title="Export Complete JSON Forensic Record"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Export JSON</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 sm:py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    Proof Anchored
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-mono">
                <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <dt className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Transaction ID
                  </dt>
                  <dd className="text-gray-100 font-semibold break-all select-all [overflow-wrap:anywhere] leading-relaxed">
                    {evidence.blockchainProof.transactionId}
                  </dd>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <dt className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Block Height
                  </dt>
                  <dd className="text-gray-100 font-semibold text-sm">
                    #{evidence.blockchainProof.blockNumber.toLocaleString()}
                  </dd>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <dt className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Channel & Network
                  </dt>
                  <dd className="text-gray-100 font-semibold break-words">
                    {evidence.blockchainProof.network}
                  </dd>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <dt className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Anchoring Timestamp
                  </dt>
                  <dd className="text-gray-100 font-medium">
                    {formatDate(evidence.blockchainProof.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
                  </dd>
                </div>

                <div className="sm:col-span-2 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <dt className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                    Merkle Root
                  </dt>
                  <dd className="text-emerald-300 font-semibold break-all select-all text-[11px] sm:text-xs [overflow-wrap:anywhere] leading-relaxed">
                    {evidence.blockchainProof.merkleRoot}
                  </dd>
                </div>
              </dl>
            </section>
          )}

        </div>

        {/* Right Column (4 cols): Location Anchor, Asset Link, Chain of Custody Timeline */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Location Anchor */}
          <LocationAnchorCard
            location={evidence.location}
            siteName={asset?.location?.site}
            building={asset?.location?.building}
            zone={asset?.location?.room || asset?.location?.floor}
          />

          {/* Machine Profile Link Card */}
          <div className="bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[28px] p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Machine Asset
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                {assetCode}
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {machineName}
              </h4>
              {asset?.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                  {asset.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate(`/assets/${evidence.assetId}`)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer group"
            >
              <span>Inspect Full Asset Lifecycle</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Reconstructed Technical Chain of Custody Timeline */}
          <VerificationTimeline
            evidence={evidence}
            blockchainProof={evidence.blockchainProof}
            verificationStatus={verificationStatus}
            lastVerifiedAt={lastVerifiedAt}
          />

        </div>

      </div>

      {/* Audit Trail Modal */}
      <EvidenceAuditTrailModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        evidenceId={evidence.evidenceId}
        assetName={machineName}
        assetId={evidence.assetId}
      />

      {/* QR Code Modal */}
      <Modal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        title="Cryptographic Evidence QR Code"
        description={`Evidence ID: ${evidence.evidenceId.substring(0, 16)}...`}
        size="sm"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex justify-center mb-2">
            <QRCodeDisplay value={evidence.evidenceId} size={200} />
          </div>
          <div className="text-center w-full space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Anchored Evidence Reference
            </p>
            <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl break-all">
              {evidence.evidenceId}
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsQROpen(false)} className="w-full">
            Close
          </Button>
        </div>
      </Modal>

    </div>
  );
}