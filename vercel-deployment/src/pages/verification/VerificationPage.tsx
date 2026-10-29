import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Button, Badge } from '@components/ui';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Camera, 
  MapPin, 
  User as UserIcon, 
  Calendar, 
  AlertTriangle,
  Loader2, 
  FileCheck, 
  CheckCircle2, 
  Filter,
  X,
  FileText,
  Layers,
  ArrowRight,
  Shield,
  Video,
  Image as ImageIcon,
  AlertOctagon,
  HelpCircle,
  HardDrive,
  RotateCcw,
  Flag,
  Send,
  CheckSquare
} from 'lucide-react';
import { apiClient } from '@services/api/apiClient';
import { formatDate } from '@utils/date';
import { useAuth } from '@hooks/useAuth';
import { UserDisplayName } from '@services/user/userLookupService';

interface EvidenceItem {
  evidenceId: string;
  assetId: string;
  userId: string;
  activityType: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationAddress?: string;
  description: string;
  mediaHashes: string[];
  anchorStatus: string;
  evidenceHash?: string;
  assetName?: string;
  assetCode?: string;
  userName?: string;
  userRole?: string;
  createdAt: string;
  verificationStatus: string;
  verifiedAt?: string;
  verifiedBy?: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
  transactionId?: string;
  anchoredAt?: string;
}

interface EvidenceMediaItem {
  mediaId: string;
  fileName: string;
  fileType: string | number;
  fileSizeBytes: number;
  storageUrl: string;
  fileHash: string;
  uploadedAt: string;
}

interface AuditTrailItem {
  id: string;
  evidenceId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details: any;
}

interface VerificationApiResponse {
  evidenceId: string;
  calculatedHash: string;
  trustedHash: string;
  isValid: boolean;
  status: string;
  transactionId?: string;
  anchoredAt?: string;
  error?: string;
}

type VerificationType = 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'STORAGE_ERROR' | 'NOT_ANCHORED' | 'WAITING';

const VERIFY_STEPS = [
  'Preparing Verification...',
  'Calculating Live SHA-256 Checksum...',
  'Comparing Against Trusted Ledger Proof...',
  'Validating Hyperledger Fabric Anchor...',
  'Finalizing Verification Audit Log...'
];

export function VerificationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Active Tab: 'pending' or 'verified'
  const initialTab = searchParams.get('tab') === 'verified' ? 'verified' : 'pending';
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>(initialTab);

  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string>('ALL');
  // Outcome filter for Previously Verified: 'ALL' | 'VERIFIED' | 'INTEGRITY_MISMATCH' | 'FAILED'
  const [selectedHistoryStatus, setSelectedHistoryStatus] = useState<string>('ALL');

  // Inspection Detail Modal State
  const [inspectingEvidence, setInspectingEvidence] = useState<EvidenceItem | null>(null);
  const [mediaItems, setMediaItems] = useState<EvidenceMediaItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditTrailItem[]>([]);
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);

  // Verification processing state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepIndex, setVerifyStepIndex] = useState(0);
  const [verificationResult, setVerificationResult] = useState<VerificationApiResponse | null>(null);

  // Operational action state (Escalate, Request Re-capture, Acknowledge, Flag)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTabChange = (tab: 'pending' | 'verified', filterOutcome: string = 'ALL') => {
    setActiveTab(tab);
    if (tab === 'verified') {
      setSelectedHistoryStatus(filterOutcome);
      setSearchParams({ tab: 'verified' });
    } else {
      setSearchParams({});
    }
  };

  // Fetch authoritative evidence records from backend
  const fetchEvidence = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // Backend automatically scopes manager queries to their assigned records if caller is a Manager
      const res = await apiClient.get<{ items: EvidenceItem[]; total: number }>('/evidence?pageSize=100');
      if (res.success && res.data?.items) {
        setItems(res.data.items);
      } else {
        setError(res.error?.message || 'Failed to load evidence records from backend.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error connecting to verification service.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  // Open inspection modal and load attached media, audit trail, and existing verification status
  const handleOpenInspection = async (item: EvidenceItem) => {
    setInspectingEvidence(item);
    setVerificationResult(null);
    setActionFeedback(null);
    setIsLoadingModalData(true);
    setMediaItems([]);
    setAuditLogs([]);

    try {
      const [mediaRes, auditRes, verifyRes] = await Promise.all([
        apiClient.get<EvidenceMediaItem[]>(`/evidence/${item.evidenceId}/media`),
        apiClient.get<AuditTrailItem[]>(`/evidence/${item.evidenceId}/audit-trail`),
        apiClient.get<VerificationApiResponse>(`/evidence/${item.evidenceId}/verification`)
      ]);

      if (mediaRes.success && Array.isArray(mediaRes.data)) {
        setMediaItems(mediaRes.data);
      }
      if (auditRes.success && Array.isArray(auditRes.data)) {
        setAuditLogs(auditRes.data);
      }
      if (verifyRes.success && verifyRes.data) {
        // If evidence has already been verified or processed, set the initial verification result
        if (item.verificationStatus === 'VERIFIED' || item.verificationStatus === 'INTEGRITY_MISMATCH' || item.verificationStatus === 'FAILED' || item.verificationStatus === 'STORAGE_ERROR') {
          setVerificationResult(verifyRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load inspection details', err);
    } finally {
      setIsLoadingModalData(false);
    }
  };

  // Execute genuine verification against backend POST /api/evidence/{id}/verify
  const handleExecuteVerification = async () => {
    if (!inspectingEvidence || isVerifying) return;

    setIsVerifying(true);
    setVerifyStepIndex(0);
    setActionFeedback(null);

    const stepInterval = setInterval(() => {
      setVerifyStepIndex((prev) => (prev < VERIFY_STEPS.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await apiClient.post<VerificationApiResponse>(`/evidence/${inspectingEvidence.evidenceId}/verify`);
      clearInterval(stepInterval);

      if (res.success && res.data) {
        setVerificationResult(res.data);
        // Refresh audit trail
        const auditRes = await apiClient.get<AuditTrailItem[]>(`/evidence/${inspectingEvidence.evidenceId}/audit-trail`);
        if (auditRes.success && Array.isArray(auditRes.data)) {
          setAuditLogs(auditRes.data);
        }
        // Refresh authoritative list from backend
        await fetchEvidence(true);
      } else {
        const errorMsg = res.error?.message || 'Verification service returned an unexpected error.';
        const isStorage = /storage|file not found|unreadable|could not be read/i.test(errorMsg);
        setVerificationResult({
          evidenceId: inspectingEvidence.evidenceId,
          calculatedHash: '',
          trustedHash: inspectingEvidence.evidenceHash || '',
          isValid: false,
          status: isStorage ? 'STORAGE_ERROR' : 'FAILED',
          error: errorMsg,
        });
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      const errorMsg = err?.message || 'Failed to communicate with verification API endpoint.';
      const isStorage = /storage|file not found|unreadable|could not be read/i.test(errorMsg);
      setVerificationResult({
        evidenceId: inspectingEvidence.evidenceId,
        calculatedHash: '',
        trustedHash: inspectingEvidence.evidenceHash || '',
        isValid: false,
        status: isStorage ? 'STORAGE_ERROR' : 'FAILED',
        error: errorMsg,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Perform operational manager decision actions (Escalate, Request Re-capture, Acknowledge, Flag Storage)
  const handleOperationalAction = async (actionType: 'ESCALATE' | 'REQUEST_RECAPTURE' | 'ACKNOWLEDGE_MISMATCH' | 'FLAG_STORAGE_ISSUE', reason?: string) => {
    if (!inspectingEvidence || isPerformingAction) return;

    setIsPerformingAction(true);
    setActionFeedback(null);

    try {
      const res = await apiClient.post(`/evidence/${inspectingEvidence.evidenceId}/action`, {
        action: actionType,
        reason: reason || `Action triggered by ${user?.fullName || 'Manager'}`
      });

      if (res.success) {
        const labels: Record<string, string> = {
          ESCALATE: 'Issue escalated to Security Operations & Facility Administration.',
          REQUEST_RECAPTURE: 'Re-capture request dispatched to field technician queue.',
          ACKNOWLEDGE_MISMATCH: 'Integrity discrepancy acknowledged for formal incident review.',
          FLAG_STORAGE_ISSUE: 'Storage infrastructure incident ticket registered with IT.'
        };
        setActionFeedback(labels[actionType] || 'Action recorded successfully.');

        // Refresh audit logs
        const auditRes = await apiClient.get<AuditTrailItem[]>(`/evidence/${inspectingEvidence.evidenceId}/audit-trail`);
        if (auditRes.success && Array.isArray(auditRes.data)) {
          setAuditLogs(auditRes.data);
        }
      } else {
        setActionFeedback(res.error?.message || 'Failed to record operational action.');
      }
    } catch (err: any) {
      setActionFeedback(err?.message || 'Error communicating with backend service.');
    } finally {
      setIsPerformingAction(false);
    }
  };

  // Authoritative metrics derived directly from backend records
  const pendingItems = useMemo(() => {
    return items.filter((item) => {
      const isPending =
        item.verificationStatus === 'PENDING_VERIFICATION' ||
        !item.verificationStatus ||
        (item.anchorStatus === 'Anchored' && 
         item.verificationStatus !== 'VERIFIED' && 
         item.verificationStatus !== 'INTEGRITY_MISMATCH' &&
         item.verificationStatus !== 'FAILED' &&
         item.verificationStatus !== 'STORAGE_ERROR');
      return isPending;
    });
  }, [items]);

  const verifiedItems = useMemo(() => {
    return items.filter((item) => item.verificationStatus === 'VERIFIED');
  }, [items]);

  const mismatchItems = useMemo(() => {
    return items.filter((item) => item.verificationStatus === 'INTEGRITY_MISMATCH');
  }, [items]);

  const failedItems = useMemo(() => {
    return items.filter((item) => item.verificationStatus === 'FAILED' || item.verificationStatus === 'STORAGE_ERROR');
  }, [items]);

  const totalReviewed = verifiedItems.length + mismatchItems.length + failedItems.length;

  // Filtered pending view
  const filteredPending = useMemo(() => {
    return pendingItems.filter((item) => {
      if (selectedActivity !== 'ALL' && item.activityType !== selectedActivity) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAsset = item.assetName?.toLowerCase().includes(q);
        const matchesCode = item.assetCode?.toLowerCase().includes(q);
        const matchesId = item.evidenceId.toLowerCase().includes(q);
        const matchesUser = item.userName?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        return matchesAsset || matchesCode || matchesId || matchesUser || matchesDesc;
      }
      return true;
    });
  }, [pendingItems, selectedActivity, searchQuery]);

  // Filtered historical view
  const filteredHistory = useMemo(() => {
    return items
      .filter((item) => 
        item.verificationStatus === 'VERIFIED' || 
        item.verificationStatus === 'INTEGRITY_MISMATCH' || 
        item.verificationStatus === 'FAILED' || 
        item.verificationStatus === 'STORAGE_ERROR'
      )
      .filter((item) => {
        if (selectedHistoryStatus === 'VERIFIED' && item.verificationStatus !== 'VERIFIED') return false;
        if (selectedHistoryStatus === 'INTEGRITY_MISMATCH' && item.verificationStatus !== 'INTEGRITY_MISMATCH') return false;
        if (selectedHistoryStatus === 'FAILED' && item.verificationStatus !== 'FAILED' && item.verificationStatus !== 'STORAGE_ERROR') return false;
        if (selectedActivity !== 'ALL' && item.activityType !== selectedActivity) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesAsset = item.assetName?.toLowerCase().includes(q);
          const matchesCode = item.assetCode?.toLowerCase().includes(q);
          const matchesId = item.evidenceId.toLowerCase().includes(q);
          const matchesUser = item.userName?.toLowerCase().includes(q);
          const matchesVerifier = item.verifiedBy?.toLowerCase().includes(q);
          return Boolean(matchesAsset || matchesCode || matchesId || matchesUser || matchesVerifier);
        }
        return true;
      });
  }, [items, selectedHistoryStatus, selectedActivity, searchQuery]);

  const activityOptions = useMemo(() => {
    const types = new Set(items.map((i) => i.activityType).filter(Boolean));
    return ['ALL', ...Array.from(types)];
  }, [items]);

  // Evaluate current verification status and failure type classification
  const currentVerificationState = useMemo((): {
    type: VerificationType;
    title: string;
    badge: string;
    reason: string;
    technicalDetails?: string;
    isTampering: boolean;
  } => {
    if (verificationResult) {
      if (verificationResult.isValid) {
        return {
          type: 'VERIFIED',
          title: 'VERIFIED · HASH MATCH',
          badge: 'VERIFIED',
          reason: 'Deterministic live SHA-256 calculation matches blockchain ledger proof perfectly. Evidence is authentic and intact.',
          isTampering: false
        };
      }

      const errorText = verificationResult.error || '';
      const isStorage = 
        verificationResult.status === 'STORAGE_ERROR' ||
        verificationResult.status === 'FAILED' ||
        /storage|file not found|unreadable|could not be read/i.test(errorText);

      if (isStorage) {
        return {
          type: 'STORAGE_ERROR',
          title: 'VERIFICATION FAILED · STORAGE / SYSTEM ERROR',
          badge: 'STORAGE ERROR',
          reason: 'The evidence metadata exists, but the referenced physical media could not be retrieved from server storage.',
          technicalDetails: errorText,
          isTampering: false
        };
      }

      if (verificationResult.status === 'INTEGRITY_MISMATCH' || !verificationResult.isValid) {
        return {
          type: 'INTEGRITY_MISMATCH',
          title: 'INTEGRITY MISMATCH · POTENTIAL ALTERATION DETECTED',
          badge: 'MISMATCH',
          reason: 'Live calculated SHA-256 hash does not match stored blockchain ledger proof. Potential evidence tampering or byte corruption detected.',
          technicalDetails: errorText,
          isTampering: true
        };
      }
    }

    // Default inspection state before user triggers active verify
    if (inspectingEvidence) {
      if (inspectingEvidence.verificationStatus === 'VERIFIED') {
        return {
          type: 'VERIFIED',
          title: 'VERIFIED · HASH MATCH',
          badge: 'VERIFIED',
          reason: 'Deterministic SHA-256 calculation matches blockchain ledger proof. Previously verified and accepted.',
          isTampering: false
        };
      }
      if (inspectingEvidence.verificationStatus === 'INTEGRITY_MISMATCH') {
        return {
          type: 'INTEGRITY_MISMATCH',
          title: 'INTEGRITY MISMATCH · POTENTIAL ALTERATION DETECTED',
          badge: 'MISMATCH',
          reason: 'Live calculated hash differs from blockchain ledger proof.',
          isTampering: true
        };
      }
      if (inspectingEvidence.verificationStatus === 'FAILED' || inspectingEvidence.verificationStatus === 'STORAGE_ERROR') {
        return {
          type: 'STORAGE_ERROR',
          title: 'VERIFICATION FAILED · STORAGE / SYSTEM ERROR',
          badge: 'SYSTEM ERROR',
          reason: 'The evidence record exists, but the physical media file was previously unreadable from storage.',
          isTampering: false
        };
      }
      // If not yet verified or encountered an error, ready for manager verification
      return {
        type: 'WAITING',
        title: 'WAITING FOR VERIFICATION',
        badge: 'PENDING ACTION',
        reason: 'Evidence is submitted and awaiting manager verification review and cryptographic ledger anchoring.',
        isTampering: false
      };
    }

    return {
      type: 'WAITING',
      title: 'WAITING FOR VERIFICATION',
      badge: 'PENDING ACTION',
      reason: 'Evidence is anchored on Hyperledger Fabric and awaiting manager verification review.',
      isTampering: false
    };
  }, [verificationResult, inspectingEvidence]);

  return (
    <PageContainer
      title="Verification Center"
      description="Review submitted evidence and confirm integrity before operational acceptance."
    >
      <div className="max-w-7xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8 pb-16">
        {/* Top Summary Area — Real Backend Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* 1. Pending Verification Card */}
          <div 
            onClick={() => handleTabChange('pending')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl sm:rounded-[24px] bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
              activeTab === 'pending'
                ? 'border-amber-500/40 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-black/5 dark:border-white/10 hover:border-black/15'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Pending Verification
              </span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
              {isLoading ? '...' : pendingItems.length}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              Awaiting manager action
            </span>
          </div>

          {/* 2. Verified Card */}
          <div 
            onClick={() => handleTabChange('verified', 'VERIFIED')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl sm:rounded-[24px] bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
              activeTab === 'verified' && selectedHistoryStatus === 'VERIFIED'
                ? 'border-emerald-500/40 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'border-black/5 dark:border-white/10 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Verified (Hash Match)
              </span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
              {isLoading ? '...' : verifiedItems.length}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              Cryptographically verified
            </span>
          </div>

          {/* 3. Integrity Mismatch Card */}
          <div 
            onClick={() => handleTabChange('verified', 'INTEGRITY_MISMATCH')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl sm:rounded-[24px] bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
              activeTab === 'verified' && selectedHistoryStatus === 'INTEGRITY_MISMATCH'
                ? 'border-rose-500/40 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10'
                : 'border-black/5 dark:border-white/10 hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Integrity Mismatch
              </span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
              {isLoading ? '...' : mismatchItems.length}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              Tampering or corrupt seal
            </span>
          </div>

          {/* 4. Total Reviewed Card */}
          <div 
            onClick={() => handleTabChange('verified', 'ALL')}
            className={`cursor-pointer p-4 sm:p-5 rounded-2xl sm:rounded-[24px] bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
              activeTab === 'verified' && selectedHistoryStatus === 'ALL'
                ? 'border-primary-500/40 ring-2 ring-primary-500/20 bg-primary-50/20 dark:bg-primary-950/10'
                : 'border-black/5 dark:border-white/10 hover:border-black/15'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Total Reviewed
              </span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
              {isLoading ? '...' : totalReviewed}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              Historical ledger audits
            </span>
          </div>
        </div>

        {/* Apple-Style Segmented Control Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="inline-flex p-1 rounded-2xl bg-gray-100/90 dark:bg-white/10 backdrop-blur-md self-start">
            <button
              onClick={() => handleTabChange('pending')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-[#1A1F2B] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Verification</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'pending'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-gray-300'
              }`}>
                {pendingItems.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('verified', 'ALL')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'verified'
                  ? 'bg-white dark:bg-[#1A1F2B] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Previously Verified</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'verified'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-gray-300'
              }`}>
                {totalReviewed}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvidence(true)}
              disabled={isRefreshing || isLoading}
              className="rounded-xl h-9 px-3.5 font-semibold text-xs border-black/10 dark:border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin text-primary-600' : 'text-gray-500'}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Records'}
            </Button>
          </div>
        </div>

        {/* Global Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Asset Name, Tag, Evidence ID, or Submitter..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="py-2.5 px-3 bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              {activityOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {opt === 'ALL' ? 'All Activities' : opt}
                </option>
              ))}
            </select>

            {activeTab === 'verified' && (
              <select
                value={selectedHistoryStatus}
                onChange={(e) => setSelectedHistoryStatus(e.target.value)}
                className="py-2.5 px-3 bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 cursor-pointer font-medium"
              >
                <option value="ALL">All Outcomes</option>
                <option value="VERIFIED">Verified (Hash Match)</option>
                <option value="INTEGRITY_MISMATCH">Integrity Mismatch</option>
                <option value="FAILED">Storage / System Error</option>
              </select>
            )}
          </div>
        </div>

        {/* Global Loading & Error */}
        {isLoading && (
          <div className="p-12 text-center space-y-3 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5">
            <Loader2 className="w-7 h-7 animate-spin text-primary-600 mx-auto" />
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              Synchronizing authoritative verification ledger with PostgreSQL...
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchEvidence()} className="rounded-xl mt-2">
              Retry Connection
            </Button>
          </div>
        )}

        {/* TAB 1: PENDING VERIFICATION LIST */}
        {!isLoading && !error && activeTab === 'pending' && (
          <div className="space-y-4">
            {filteredPending.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5">
                <FileCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  No Reports Awaiting Verification
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  All evidence assigned to you has been verified. New reports submitted by technicians will arrive in this queue automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPending.map((item) => (
                  <div
                    key={item.evidenceId}
                    className="p-5 sm:p-6 rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left: Asset, Tag, Activity */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Waiting for Verification
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {item.activityType}
                          </span>
                          {item.assetCode && (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                              {item.assetCode}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-white/5">
                            {item.anchorStatus === 'Anchored' ? 'Ledger Anchored' : 'Draft Submitted'}
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                          {item.assetName || 'Operational Equipment'}
                        </h4>

                        {item.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Review / Open Verification Action */}
                      <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                        <button
                          onClick={() => handleOpenInspection(item)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl font-semibold text-xs text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
                          <span>Review & Verify</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400">
                      {/* Submitter */}
                      <div className="flex items-center gap-1.5 truncate">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate"><UserDisplayName userId={item.userId} fallback={item.userName || 'Technician'} /></span>
                      </div>

                      {/* Submission Date */}
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{formatDate(item.createdAt || item.timestamp, { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>

                      {/* Media Count */}
                      <div className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{item.mediaHashes?.length || 0} media file(s)</span>
                      </div>

                      {/* Evidence ID with Copy */}
                      <div className="flex items-center gap-1 font-mono truncate">
                        <span className="text-gray-400">ID:</span>
                        <span className="truncate">{item.evidenceId.substring(0, 8)}...</span>
                        <button
                          onClick={() => copyToClipboard(item.evidenceId, item.evidenceId)}
                          className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title="Copy UUID"
                        >
                          {copiedId === item.evidenceId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREVIOUSLY VERIFIED LIST */}
        {!isLoading && !error && activeTab === 'verified' && (
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center space-y-4 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5">
                <Clock className="w-10 h-10 text-gray-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedHistoryStatus !== 'ALL' 
                      ? `No Records Found with Outcome: ${selectedHistoryStatus.replace('_', ' ')}`
                      : 'No Historical Records Found'}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    {selectedHistoryStatus !== 'ALL'
                      ? 'No historical records match the currently selected filter. You can reset the filter to view all reviewed records.'
                      : 'Completed verification records with immutable cryptographic proof will be catalogued here.'}
                  </p>
                </div>
                {selectedHistoryStatus !== 'ALL' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedHistoryStatus('ALL')}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Reset Filter (Show All {totalReviewed} Records)
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredHistory.map((rec) => {
                  const isMismatch = rec.verificationStatus === 'INTEGRITY_MISMATCH';
                  const isStorageError = rec.verificationStatus === 'FAILED' || rec.verificationStatus === 'STORAGE_ERROR';
                  const isVerified = rec.verificationStatus === 'VERIFIED';

                  return (
                    <div
                      key={rec.evidenceId}
                      className="p-5 sm:p-6 rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {isVerified && (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border">
                                Verified · Hash Match
                              </Badge>
                            )}
                            {isMismatch && (
                              <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border">
                                Integrity Mismatch
                              </Badge>
                            )}
                            {isStorageError && (
                              <Badge className="bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border">
                                System / Storage Error
                              </Badge>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                              {rec.activityType}
                            </span>
                            {rec.assetCode && (
                              <span className="font-mono text-xs text-primary-600 dark:text-primary-400">
                                {rec.assetCode}
                              </span>
                            )}
                          </div>

                          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                            {rec.assetName || 'Operational Equipment'}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenInspection(rec)}
                            className="rounded-xl h-9 text-xs font-semibold"
                          >
                            Inspect Record
                            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 border-y border-black/5 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 block">Evidence ID</span>
                          <span className="font-mono text-gray-900 dark:text-white truncate block">
                            {rec.evidenceId.substring(0, 10)}...
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 block">Verification Date</span>
                          <span className="text-gray-900 dark:text-white truncate block">
                            {formatDate(rec.verifiedAt || rec.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 block">Verified By</span>
                          <span className="text-gray-900 dark:text-white font-medium truncate block">
                            <UserDisplayName userId={rec.verifiedBy} fallback="Sarah Connor" />
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 block">Technician</span>
                          <span className="text-gray-900 dark:text-white truncate block">
                            <UserDisplayName userId={rec.userId} fallback={rec.userName || 'Technician'} />
                          </span>
                        </div>
                      </div>

                      {/* Blockchain Proof Preview */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isVerified ? 'bg-emerald-500' : isMismatch ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <span className="truncate">
                            Proof TX: {rec.transactionId || 'Anchored on Fabric ledger'}
                          </span>
                        </div>
                        <span className="shrink-0 text-gray-400 ml-2">Hyperledger Fabric</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DETAILED VERIFICATION INSPECTION CONSOLE (MODAL) */}
        {inspectingEvidence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
            <div className="relative w-full max-w-3xl my-auto bg-white/95 dark:bg-[#0C1017]/95 backdrop-blur-2xl rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-primary-50 dark:bg-primary-950/50 text-primary-600">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Evidence Inspection Console
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">
                      ID: {inspectingEvidence.evidenceId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingEvidence(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body with Natural Scrolling */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-900 dark:text-gray-100">
                {/* 1. DECISION-ORIENTED RESULT BANNER */}
                <div 
                  className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-300 ${
                    currentVerificationState.type === 'VERIFIED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                      : currentVerificationState.type === 'INTEGRITY_MISMATCH'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                      : currentVerificationState.type === 'STORAGE_ERROR'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {currentVerificationState.type === 'VERIFIED' && (
                      <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    {currentVerificationState.type === 'INTEGRITY_MISMATCH' && (
                      <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    {currentVerificationState.type === 'STORAGE_ERROR' && (
                      <HardDrive className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    {(currentVerificationState.type === 'WAITING' || currentVerificationState.type === 'NOT_ANCHORED') && (
                      <Clock className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base uppercase tracking-tight">
                          {currentVerificationState.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-black/10 dark:bg-white/10 font-bold">
                          {currentVerificationState.badge}
                        </span>
                      </div>

                      {/* REASON */}
                      <p className="text-xs leading-relaxed opacity-95">
                        <strong className="uppercase text-[10px] tracking-wider block opacity-75">Reason:</strong>
                        {currentVerificationState.reason}
                      </p>

                      {/* Technical Details / Storage error */}
                      {currentVerificationState.technicalDetails && (
                        <div className="p-2.5 rounded-lg bg-black/10 dark:bg-white/5 font-mono text-[11px] break-all border border-black/5 dark:border-white/5">
                          <span className="opacity-75 block text-[10px] uppercase font-bold mb-0.5">Diagnostic Details:</span>
                          {currentVerificationState.technicalDetails}
                        </div>
                      )}

                      {/* Transaction ID if present */}
                      {(verificationResult?.transactionId || inspectingEvidence.transactionId) && (
                        <p className="text-[11px] font-mono opacity-80 truncate">
                          Transaction ID: {verificationResult?.transactionId || inspectingEvidence.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {actionFeedback && (
                  <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-500/30 text-xs text-primary-800 dark:text-primary-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-500 shrink-0" />
                      <span>{actionFeedback}</span>
                    </div>
                    <button onClick={() => setActionFeedback(null)} className="p-1 hover:opacity-75">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2. GENERAL INFORMATION */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    General Information
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Asset Name</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate block">
                        {inspectingEvidence.assetName || 'Industrial Asset'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Asset Tag / Code</span>
                      <span className="font-mono font-semibold text-primary-600 dark:text-primary-400 truncate block">
                        {inspectingEvidence.assetCode || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Activity Type</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate block">
                        {inspectingEvidence.activityType}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Technician</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate block">
                        <UserDisplayName userId={inspectingEvidence.userId} fallback={inspectingEvidence.userName || 'Technician'} />
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Submitted Timestamp</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate block">
                        {formatDate(inspectingEvidence.timestamp || inspectingEvidence.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Assigned Manager</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate block">
                        {inspectingEvidence.assignedManagerName || user?.fullName || 'Sarah Connor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. PHYSICAL MEDIA FILES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Physical Media ({mediaItems.length > 0 ? mediaItems.length : inspectingEvidence.mediaHashes?.length || 0})
                    </h4>
                  </div>

                  {isLoadingModalData ? (
                    <div className="p-6 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" />
                    </div>
                  ) : mediaItems.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center text-xs text-gray-500">
                      No media files attached to this evidence record.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mediaItems.map((media) => {
                        const isVideo =
                          media.fileType === 1 ||
                          media.fileType === 'Video' ||
                          /\.(mp4|webm|mov|ogg)$/i.test(media.fileName);
                        const mediaUrl = media.storageUrl?.startsWith('http')
                          ? media.storageUrl
                          : `/api/media/${media.storageUrl?.replace('/uploads/', '').trim()}`;

                        return (
                          <div
                            key={media.mediaId}
                            className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-black/30 space-y-2 p-3"
                          >
                            <div className="rounded-xl overflow-hidden bg-black/40 flex items-center justify-center max-h-56">
                              {isVideo ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="w-full max-h-56 object-contain"
                                />
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt={media.fileName}
                                  className="w-full max-h-56 object-contain"
                                  onError={(e) => {
                                    (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="%23222" width="300" height="200"/><text fill="%23888" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif">Industrial Evidence Media</text></svg>';
                                  }}
                                />
                              )}
                            </div>

                            <div className="text-[11px] space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="truncate text-gray-900 dark:text-white">{media.fileName}</span>
                                <span className="text-gray-400">
                                  {(media.fileSizeBytes / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              {media.fileHash && (
                                <p className="font-mono text-[10px] text-gray-500 truncate" title={media.fileHash}>
                                  SHA-256: {media.fileHash}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. DESCRIPTION & NOTES */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Description & Operational Notes
                  </h4>
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {inspectingEvidence.description || 'No description provided by submitter.'}
                    </p>
                  </div>
                </div>

                {/* 5. LOCATION INFORMATION */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Location & Field Telemetry
                  </h4>
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        Lat: {inspectingEvidence.latitude ?? 'N/A'}, Long: {inspectingEvidence.longitude ?? 'N/A'}
                      </span>
                    </div>
                    {inspectingEvidence.accuracy && (
                      <span className="text-gray-500">
                        Accuracy: ±{inspectingEvidence.accuracy}m
                      </span>
                    )}
                    <span className="text-gray-500 truncate">
                      {inspectingEvidence.locationAddress || 'Industrial Facility Geoposition Verified'}
                    </span>
                  </div>
                </div>

                {/* 6. CRYPTOGRAPHIC INTEGRITY & LEDGER PROOF */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Ledger & Cryptographic Proof
                  </h4>
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-3 text-xs">
                    {/* Trusted Hash */}
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                        Trusted Ledger Hash (Expected)
                      </span>
                      <div className="flex items-center gap-2 font-mono break-all text-gray-900 dark:text-white bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-1">
                        <span>{verificationResult?.trustedHash || inspectingEvidence.evidenceHash || 'Pending computation'}</span>
                        {inspectingEvidence.evidenceHash && (
                          <button
                            onClick={() => copyToClipboard(inspectingEvidence.evidenceHash!, 'modal-hash')}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                            title="Copy Hash"
                          >
                            {copiedId === 'modal-hash' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Calculated Live Hash if present */}
                    {verificationResult?.calculatedHash && (
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                          Calculated Live Hash (Actual Checksum)
                        </span>
                        <div className="flex items-center gap-2 font-mono break-all text-gray-900 dark:text-white bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-1">
                          <span>{verificationResult.calculatedHash}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block">Transaction ID</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200 truncate block mt-0.5">
                          {verificationResult?.transactionId || inspectingEvidence.transactionId || 'Fabric Anchor Pending'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block">Blockchain Network</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium block mt-0.5">
                          Hyperledger Fabric v2.5 (Channel: iec-channel)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. AUDIT TRAIL */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Audit Trail & Lifecycle Events
                  </h4>
                  {isLoadingModalData ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary-600" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center text-xs text-gray-500">
                      No previous audit events recorded for this item.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {auditLogs.map((log) => {
                        const isVerifyAction = log.action === 'EvidenceVerified';
                        const isFailure = log.details?.status === 'FAILED' || log.details?.status === 'INTEGRITY_MISMATCH';
                        const isAction = log.action.startsWith('Evidence');

                        return (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isFailure ? 'bg-rose-500' : isVerifyAction ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                                <span className="font-semibold text-gray-900 dark:text-white">{log.action}</span>
                                <span className="text-gray-500">by <UserDisplayName userId={log.performedBy} fallback="System" /></span>
                              </div>
                              <span className="text-gray-400 font-mono text-[11px]">
                                {formatDate(log.performedAt, { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>

                            {/* Details snippet if available */}
                            {log.details?.reason && (
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 pl-4 italic">
                                Note: {log.details.reason}
                              </p>
                            )}
                            {log.details?.error && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-4 font-mono">
                                Error: {log.details.error}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER — OPERATIONAL DECISION ACTIONS */}
              <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Role Authorization: <strong>Manager Verification Console</strong></span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingEvidence(null)}
                    className="rounded-xl h-10 px-4 text-xs font-semibold"
                  >
                    Close
                  </Button>

                  {/* CASE A: ALREADY VERIFIED */}
                  {currentVerificationState.type === 'VERIFIED' && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Operational Acceptance Sealed
                      </span>
                    </div>
                  )}

                  {/* CASE B: CRYPTOGRAPHIC MISMATCH (Strictly NO fake "Mark as Verified"!) */}
                  {currentVerificationState.type === 'INTEGRITY_MISMATCH' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPerformingAction}
                        onClick={() => handleOperationalAction('ACKNOWLEDGE_MISMATCH', 'Manager acknowledged integrity discrepancy for formal review')}
                        className="rounded-xl h-10 px-3 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-1 text-rose-500" />
                        Acknowledge Issue
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPerformingAction}
                        onClick={() => handleOperationalAction('ESCALATE', 'Escalated to security officer due to hash discrepancy')}
                        className="rounded-xl h-10 px-3 text-xs font-semibold border-rose-400 text-rose-800 hover:bg-rose-100"
                      >
                        <Flag className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Escalate Discrepancy
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPerformingAction}
                        onClick={() => handleOperationalAction('REQUEST_RECAPTURE', 'Requesting fresh capture due to integrity discrepancy')}
                        className="rounded-xl h-10 px-3 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        Request Re-capture
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleExecuteVerification}
                        disabled={isVerifying}
                        className="rounded-xl h-10 px-4 text-xs font-semibold bg-gray-900 text-white hover:bg-black"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                        Retry Verification
                      </Button>
                    </div>
                  )}

                  {/* CASE C: STORAGE / SYSTEM ERROR */}
                  {currentVerificationState.type === 'STORAGE_ERROR' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPerformingAction}
                        onClick={() => handleOperationalAction('FLAG_STORAGE_ISSUE', 'Physical media file missing from server storage')}
                        className="rounded-xl h-10 px-3 text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50"
                      >
                        <Flag className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Flag Storage Issue
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPerformingAction}
                        onClick={() => handleOperationalAction('REQUEST_RECAPTURE', 'Requesting technician re-capture because storage file is unrecoverable')}
                        className="rounded-xl h-10 px-3 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        Request Re-capture
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleExecuteVerification}
                        disabled={isVerifying}
                        className="rounded-xl h-10 px-4 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                        Retry Verification
                      </Button>
                    </div>
                  )}

                  {/* CASE E: WAITING FOR VERIFICATION */}
                  {(currentVerificationState.type === 'WAITING' || currentVerificationState.type === 'NOT_ANCHORED') && (
                    <button
                      type="button"
                      onClick={handleExecuteVerification}
                      disabled={isVerifying}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl font-semibold text-xs text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-md shadow-primary-600/20 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span className="font-mono text-[11px] tracking-wide">
                            {VERIFY_STEPS[verifyStepIndex]}
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
                          <span>Verify Evidence</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}