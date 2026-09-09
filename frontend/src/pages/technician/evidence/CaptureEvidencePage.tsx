import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { EvidenceCaptureFlow } from '@components/evidence';
import { Badge, Button, useToast } from '@components/ui';
import { ArrowLeft, QrCode, Box, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { evidenceService } from '@services/evidence/evidenceService';
import { QRScanner } from '@components/qr/QRScanner';
import type { Asset } from '@type-defs/asset';
import type { EvidenceLocation } from '@type-defs/evidence';
import type { AssetSearchParams } from '@components/assets/AssetSearch';

import { assetService } from '@services/assets/assetService';

interface CaptureEvidenceData {
  activityType: string;
  description: string;
  location: EvidenceLocation;
  mediaFiles: File[];
}

export function CaptureEvidencePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetSelector, setShowAssetSelector] = useState(true);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isSearchingAsset, setIsSearchingAsset] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [submissionState, setSubmissionState] = useState<{ step: string, status: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ step: '', status: 'idle' });
  const toast = useToast();

  const handleQRScan = async (result: string) => {
    setIsQRScannerOpen(false);
    setAssetSearchQuery(result);
    await handleVerifyAsset(result);
  };

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetSelector(false);
  };

  const handleBackToAssetSelection = () => {
    setSelectedAsset(null);
    setShowAssetSelector(true);
  };

  const handleVerifyAsset = async (overrideQuery?: any) => {
    // If it's called from an event handler, overrideQuery will be an Event. Let's handle it safely.
    let queryToSearch = typeof overrideQuery === 'string' ? overrideQuery : assetSearchQuery;
    queryToSearch = queryToSearch?.trim() || '';
    
    if (!queryToSearch) {
      toast.error('Error', 'Please enter an Asset ID or Tag');
      return;
    }
    
    setIsSearchingAsset(true);
    try {
      // 1. Try fetching by exact GUID if input matches UUID format
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(queryToSearch);
      
      if (isGuid) {
        try {
          const idRes = await assetService.getAsset(queryToSearch);
          if (idRes.success && idRes.data) {
            handleSelectAsset(idRes.data);
            toast.success('Success', 'Asset resolved successfully');
            return;
          }
        } catch (idErr: any) {
          if (idErr.status === 404) {
            toast.error('Error', 'Asset not found');
            return;
          }
          throw idErr; // Pass 401/403/other errors down to generic catch block
        }
      }

      // 2. Search by Tag/Name using the search endpoint
      const res = await assetService.getAssets({ query: queryToSearch });
      if (res.success && res.data && res.data.items.length > 0) {
        const exactMatch = res.data.items.find(a => a.assetTag.toLowerCase() === queryToSearch.toLowerCase());
        handleSelectAsset(exactMatch || res.data.items[0]);
        toast.success('Success', 'Asset resolved successfully');
      } else {
        toast.error('Error', 'Asset not found');
      }
    } catch (err: any) {
      console.error('Failed to find asset', err);
      if (err.status === 401 || err.response?.status === 401) {
        toast.error('Authentication Error', 'Please log in again to verify assets.');
      } else if (err.status === 403 || err.response?.status === 403) {
        toast.error('Permission Error', 'You do not have permission to access this asset.');
      } else {
        toast.error('Connection Error', 'Failed to connect to the server.');
      }
    } finally {
      setIsSearchingAsset(false);
    }
  };

  const handleCaptureComplete = async (evidenceData: CaptureEvidenceData) => {
    if (!selectedAsset || !user) return;
    
    try {
      setSubmissionState({ step: 'Creating evidence record...', status: 'loading' });
      const createRes = await evidenceService.createEvidence({
        assetId: selectedAsset.id,
        userId: user.id,
        activityType: evidenceData.activityType as any,
        timestamp: new Date().toISOString(),
        description: evidenceData.description,
        location: evidenceData.location,
        mediaReferences: [],
      });

      if (!createRes.success || !createRes.data) {
        throw new Error(createRes.error?.message || 'Failed to create evidence');
      }

      const evidenceId = createRes.data.evidenceId || (createRes.data as any).id;

      // 2. Upload Media
      setSubmissionState({ step: 'Uploading media assets...', status: 'loading' });
      const uploadRes = await evidenceService.uploadMedia(evidenceId, evidenceData.mediaFiles);
      
      if (!uploadRes.success) {
        throw new Error(uploadRes.error?.message || 'Failed to upload media');
      }

      // 3. Submit Evidence (Anchor to Blockchain)
      setSubmissionState({ step: 'Hashing and anchoring to ledger...', status: 'loading' });
      const submitRes = await evidenceService.submitEvidence(evidenceId);
      
      if (!submitRes.success) {
        throw new Error(submitRes.error?.message || 'Failed to submit/anchor evidence');
      }

      // 4. Navigate to success
      setSubmissionState({ step: 'Completed', status: 'success' });
      setTimeout(() => {
        navigate(`/evidence/${evidenceId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Evidence upload failed', err);
      setSubmissionState((prev) => ({ ...prev, status: 'error', message: err.message || 'Failed to upload evidence' }));
      toast.error('Error', err.message || 'Failed to upload evidence. Please try again.');
    }
  };

  if (showAssetSelector) {
    return (
      <div className="space-y-12 pb-12">
        <PageContainer
          title="Capture Evidence"
          description="Identify an asset to begin the evidence capture workflow."
        >
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-2xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl p-10 text-center">
              <div className="h-24 w-24 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Scan Asset QR Code</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                Scan the QR code physically attached to the industrial asset to securely begin the chain of custody.
              </p>
              <Button 
                size="lg" 
                className="w-full sm:w-auto min-w-[200px]"
                onClick={() => setIsQRScannerOpen(true)}
              >
                <QrCode className="h-5 w-5 mr-2" />
                Open Camera
              </Button>
              
              <QRScanner 
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScan={handleQRScan}
              />
              
              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 font-medium mb-4">Or enter Asset ID manually</p>
                <div className="flex max-w-sm mx-auto gap-3">
                  <input 
                    type="text" 
                    placeholder="e.g. PUMP-001" 
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
                  />
                  <Button variant="secondary" onClick={handleVerifyAsset} disabled={isSearchingAsset}>
                    {isSearchingAsset ? '...' : 'Verify'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <PageContainer
        title="Capture Evidence"
        description="Follow the steps to record verified industrial evidence."
        breadcrumbs={[
          { label: 'Evidence', href: '/evidence' },
          { label: 'Capture', href: '/evidence/capture' },
          { label: selectedAsset?.assetTag || 'Asset' },
        ]}
        actions={
          <Button variant="outline" className="h-10 px-4 font-semibold text-[13px] hover:bg-black/5 hover:text-gray-900 border-black/[0.05]" onClick={handleBackToAssetSelection}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Asset
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          {/* Selected Asset Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border border-black/5 shadow-sm p-6 sm:p-8 mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-[20px] bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-md">
                <Box className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[20px] font-bold text-gray-900 tracking-tight">{selectedAsset?.assetTag}</h3>
                  <Badge className="bg-success-50 text-success-700 text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider">{selectedAsset?.status}</Badge>
                </div>
                <p className="text-[15px] text-gray-500 font-medium">{selectedAsset?.name}</p>
              </div>
            </div>
            
            {selectedAsset?.location && (
              <div className="flex items-center gap-2 text-[14px] font-medium text-gray-600 bg-gray-100/80 px-4 py-2.5 rounded-2xl self-start sm:self-center">
                <MapPin className="h-4 w-4 text-gray-400" />
                {selectedAsset.location.site}
              </div>
            )}
          </div>

          <EvidenceCaptureFlow
            assetId={selectedAsset?.id || ''}
            onComplete={handleCaptureComplete}
            onCancel={handleBackToAssetSelection}
          />
          
          {submissionState.status !== 'idle' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                <div className="mb-6 flex justify-center">
                  {submissionState.status === 'loading' && (
                    <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
                  )}
                  {submissionState.status === 'success' && (
                    <CheckCircle className="h-12 w-12 text-success-500" />
                  )}
                  {submissionState.status === 'error' && (
                    <AlertCircle className="h-12 w-12 text-error-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {submissionState.status === 'loading' ? 'Processing Evidence' : 
                   submissionState.status === 'success' ? 'Evidence Secured' : 'Submission Failed'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {submissionState.step}
                </p>
                {submissionState.status === 'error' && (
                  <div className="mt-8">
                    <Button onClick={() => setSubmissionState({ step: '', status: 'idle' })} className="w-full">
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}