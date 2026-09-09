import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { EvidenceCaptureFlow } from '@components/evidence';
import { Badge } from '@components/ui';
import { Button } from '@components/ui';
import { ArrowLeft, QrCode, Box, MapPin } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { evidenceService } from '@services/evidence/evidenceService';
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

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetSelector(false);
  };

  const handleBackToAssetSelection = () => {
    setSelectedAsset(null);
    setShowAssetSelector(true);
  };

  const handleVerifyAsset = async () => {
    if (!assetSearchQuery.trim()) return;
    setIsSearchingAsset(true);
    try {
      // Find asset by tag/query
      const res = await assetService.getAssets({ query: assetSearchQuery.trim() });
      if (res.success && res.data && res.data.items.length > 0) {
        handleSelectAsset(res.data.items[0]);
      } else {
        alert('Asset not found. Please try another tag.');
      }
    } catch (err) {
      console.error('Failed to find asset', err);
      alert('Error searching for asset.');
    } finally {
      setIsSearchingAsset(false);
    }
  };

  const handleCaptureComplete = async (evidenceData: CaptureEvidenceData) => {
    if (!selectedAsset || !user) return;
    
    try {
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
      const uploadRes = await evidenceService.uploadMedia(evidenceId, evidenceData.mediaFiles);
      
      if (!uploadRes.success) {
        throw new Error(uploadRes.error?.message || 'Failed to upload media');
      }

      // 3. Submit Evidence (Anchor to Blockchain)
      const submitRes = await evidenceService.submitEvidence(evidenceId);
      
      if (!submitRes.success) {
        throw new Error(submitRes.error?.message || 'Failed to submit/anchor evidence');
      }

      // 4. Navigate to success
      navigate(`/evidence/${evidenceId}`);
    } catch (err) {
      console.error('Evidence upload failed', err);
      alert('Failed to upload evidence. Please try again.');
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
                onClick={() => {
                  // Use a default real asset search or prompt the user.
                  alert("Please enter the Asset Tag manually to fetch a real asset.");
                }}
              >
                <QrCode className="h-5 w-5 mr-2" />
                Open Camera
              </Button>
              
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
        </div>
      </PageContainer>
    </div>
  );
}