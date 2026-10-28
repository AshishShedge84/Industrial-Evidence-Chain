import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@components/layout';
import { Badge, Button, useToast, Textarea } from '@components/ui';
import {
  ArrowLeft,
  ArrowRight,
  QrCode,
  Box,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Video,
  Check,
  Tag,
  Calendar,
  Search,
  RotateCw,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { useCamera } from '@hooks/useCamera';
import { useGeolocation } from '@hooks/useGeolocation';
import { assetService } from '@services/assets/assetService';
import { evidenceService } from '@services/evidence/evidenceService';
import { QRScanner, parseAssetIdentifier } from '@components/qr/QRScanner';
import {
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_DESCRIPTIONS,
} from '@constants/activityTypes';
import type { Asset } from '@type-defs/asset';
import type { ActivityType, EvidenceLocation } from '@type-defs/evidence';
import { motion, AnimatePresence } from 'framer-motion';

// Supported backend ActivityTypes
const BACKEND_ACTIVITY_TYPES: ActivityType[] = [
  'Maintenance',
  'Inspection',
  'Safety',
  'Quality',
  'Audit',
  'Incident',
  'SparePart',
  'Transfer',
];

const STEPS = [
  { step: 1, title: 'Select Asset' },
  { step: 2, title: 'Confirm Asset' },
  { step: 3, title: 'Activity' },
  { step: 4, title: 'Location' },
  { step: 5, title: 'Capture' },
  { step: 6, title: 'Review' },
  { step: 7, title: 'Confirm & Submit' },
];

function formatCapturedDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `Captured on: ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
}

export function CaptureEvidencePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Workflow step: 1 to 7
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 & 2: Asset
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Step 3: Activity & Description
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [description, setDescription] = useState('');
  const [capturedAt, setCapturedAt] = useState<Date>(() => new Date());

  // Step 4: Location
  const [location, setLocation] = useState<EvidenceLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { getCurrentPosition, isSupported: geoSupported } = useGeolocation();

  // Step 5: Camera capture
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const {
    stream,
    isActive: isCameraActive,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
    switchCamera,
    devices: videoDevices,
  } = useCamera();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Step 7: Confirmation & Submission
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submissionState, setSubmissionState] = useState<{
    step: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ step: '', status: 'idle' });

  // Sync video preview element with camera stream in Step 5
  useEffect(() => {
    if (currentStep === 5 && !stream && !isCameraActive) {
      startCamera().catch(() => {});
    } else if (currentStep !== 5 && stream) {
      stopCamera();
    }
    return () => {
      if (stream) {
        stopCamera();
      }
    };
  }, [currentStep, startCamera, stopCamera, stream, isCameraActive]);

  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  // Debounced search for asset suggestions from REAL backend data
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await assetService.getAssets({ query: trimmed, pageSize: 8 });
        if (res.success && res.data) {
          setSuggestions(res.data.items);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to search assets', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle asset resolution from ID or Tag
  const handleResolveAsset = async (queryInput: string) => {
    const identifier = parseAssetIdentifier(queryInput);
    if (!identifier) {
      toast.error('Input Required', 'Please enter an Asset ID or Asset Tag.');
      return;
    }

    setIsSearching(true);
    try {
      // 1. Try UUID direct get
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);
      if (isGuid) {
        const res = await assetService.getAsset(identifier);
        if (res.success && res.data) {
          setSelectedAsset(res.data);
          setSuggestions([]);
          setCurrentStep(2);
          toast.success('Asset Found', `Resolved ${res.data.name}`);
          return;
        }
      }

      // 2. Query search
      const res = await assetService.getAssets({ query: identifier });
      if (res.success && res.data && res.data.items.length > 0) {
        const match = res.data.items.find(
          (a) => a.assetTag.toLowerCase() === identifier.toLowerCase() || a.id.toLowerCase() === identifier.toLowerCase()
        ) || res.data.items[0];

        setSelectedAsset(match);
        setSuggestions([]);
        setCurrentStep(2);
        toast.success('Asset Found', `Resolved ${match.assetTag} (${match.name})`);
      } else {
        toast.error('Not Found', `No real asset found matching "${identifier}".`);
      }
    } catch (err) {
      console.error('Failed to resolve asset', err);
      toast.error('Lookup Error', 'Failed to resolve asset from server.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle QR Scan
  const handleQRScan = async (scannedRaw: string) => {
    setIsQRScannerOpen(false);
    const identifier = parseAssetIdentifier(scannedRaw);
    setSearchQuery(identifier);
    await handleResolveAsset(identifier);
  };

  // Location Fetching
  const handleFetchLocation = async () => {
    if (!geoSupported) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      let address: string | undefined;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        if (data && data.display_name) {
          address = data.display_name;
        }
      } catch (e) {
        console.warn('Geocoding fallback failed', e);
      }

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: address || `Industrial Site (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
        timestamp: new Date().toISOString(),
      });
      toast.success('Location Verified', 'Coordinates anchored successfully.');
    } catch (err: any) {
      setLocationError(err instanceof Error ? err.message : 'Failed to retrieve location');
      toast.error('Location Error', 'Please grant location permission to anchor evidence.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Media Capture Actions
  const handleTakePhoto = async () => {
    try {
      const blob = await capturePhoto();
      if (blob) {
        const filename = `photo_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        setCapturedFiles((prev) => [...prev, file]);
        toast.success('Photo Captured', `${filename} added`);
      }
    } catch (err) {
      console.error('Failed to capture photo', err);
      toast.error('Camera Error', 'Could not take photo.');
    }
  };

  const handleToggleVideo = async () => {
    if (isRecording) {
      try {
        const blob = await stopRecording();
        if (blob) {
          const filename = `video_${Date.now()}.webm`;
          const file = new File([blob], filename, { type: 'video/webm' });
          setCapturedFiles((prev) => [...prev, file]);
          toast.success('Video Saved', `${filename} recorded`);
        }
      } catch (err) {
        console.error('Failed to stop recording', err);
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        console.error('Failed to start recording', err);
        toast.error('Recording Error', 'Could not start video recording.');
      }
    }
  };

  // Final Submission Pipeline
  const handleFinalSubmit = async () => {
    if (!selectedAsset || !user || !activityType || !location || capturedFiles.length === 0 || !isConfirmed) {
      toast.error('Incomplete Evidence', 'Please complete all required fields and confirmation.');
      return;
    }

    try {
      // Step 1: Create draft evidence in PostgreSQL
      setSubmissionState({ step: 'Creating evidence draft in database...', status: 'loading' });
      const createRes = await evidenceService.createEvidence({
        assetId: selectedAsset.id,
        userId: user.id,
        activityType: activityType,
        timestamp: capturedAt.toISOString(),
        description: description.trim(),
        latitude: location?.latitude,
        longitude: location?.longitude,
        location: location,
        mediaReferences: [],
      } as any);

      if (!createRes.success || !createRes.data) {
        throw new Error(createRes.error?.message || 'Failed to create evidence draft.');
      }

      const evidenceId = createRes.data.evidenceId || (createRes.data as any).id;

      // Step 2: Upload media files
      setSubmissionState({ step: 'Uploading and hashing media files...', status: 'loading' });
      const uploadRes = await evidenceService.uploadMedia(evidenceId, capturedFiles);
      if (!uploadRes.success) {
        throw new Error(uploadRes.error?.message || 'Failed to upload media files.');
      }

      // Step 3: Cryptographic canonicalization and anchor to blockchain ledger
      setSubmissionState({ step: 'Canonicalizing hash and anchoring to Hyperledger Fabric...', status: 'loading' });
      const submitRes = await evidenceService.submitEvidence(evidenceId);
      if (!submitRes.success) {
        throw new Error(submitRes.error?.message || 'Failed to anchor evidence to ledger.');
      }

      setSubmissionState({ step: 'Evidence sealed and anchored to ledger!', status: 'success' });
      toast.success('Evidence Sealed', 'Record successfully anchored to the blockchain.');

      // Stop camera cleanly before navigation
      stopCamera();

      setTimeout(() => {
        navigate(`/evidence/${evidenceId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Submission failed', err);
      setSubmissionState({
        step: 'Submission Failed',
        status: 'error',
        message: err.message || 'An error occurred during submission.',
      });
      toast.error('Submission Error', err.message || 'Failed to submit evidence.');
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-8 sm:space-y-12 pb-24 sm:pb-20">
      <PageContainer
        title="Capture Evidence"
        description="Guided 7-step industrial workflow for verified evidence collection."
        breadcrumbs={[
          { label: 'Evidence', href: '/evidence' },
          { label: 'Capture', href: '/evidence/capture' },
          { label: `Step ${currentStep}: ${STEPS[currentStep - 1]?.title}` },
        ]}
      >
        <div className="max-w-3xl mx-auto min-w-0 w-full">
          {/* Step Indicator */}
          <div className="mb-6 sm:mb-10">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <span className="text-[11px] sm:text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
                Step {currentStep} of 7: {STEPS[currentStep - 1]?.title}
              </span>
              <span className="text-[11px] sm:text-[12px] font-mono font-medium text-gray-400 shrink-0 ml-2">
                {Math.round((currentStep / 7) * 100)}% Completed
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s.step === currentStep
                      ? 'bg-primary-600'
                      : s.step < currentStep
                      ? 'bg-primary-300 dark:bg-primary-800'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  title={s.title}
                />
              ))}
            </div>
          </div>

          {/* Workflow Step Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full min-w-0 bg-white/80 dark:bg-[#0F1218]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 md:p-10 shadow-sm mb-8 overflow-hidden"
            >
              {/* STEP 1: Select Asset */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="h-20 w-20 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <QrCode className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                      Select Target Asset
                    </h2>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400">
                      Scan the asset's physical QR tag or search by Asset ID / Tag from PostgreSQL.
                    </p>
                  </div>

                  {/* Option A: Scan QR */}
                  <div className="text-center pt-2">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto min-w-0 sm:min-w-[220px] rounded-2xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20"
                      onClick={() => setIsQRScannerOpen(true)}
                    >
                      <QrCode className="h-5 w-5 mr-2" />
                      Scan Asset QR
                    </Button>
                  </div>

                  <QRScanner
                    isOpen={isQRScannerOpen}
                    onClose={() => setIsQRScannerOpen(false)}
                    onScan={handleQRScan}
                  />

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="border-t border-black/5 dark:border-white/10 w-full" />
                    <span className="bg-white dark:bg-[#111] px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest absolute">
                      or search manually
                    </span>
                  </div>

                  {/* Option B: Search Asset ID / Tag */}
                  <div className="space-y-3 relative">
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                      Search Asset ID or Asset Tag
                    </label>
                    <div className="flex gap-2 sm:gap-3">
                      <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="asset-query-input"
                          type="text"
                          placeholder="e.g. SENS-9941, HVAC-8092..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleResolveAsset(searchQuery);
                          }}
                          className="w-full pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50/70 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        className="rounded-2xl px-3.5 sm:px-6 text-xs sm:text-sm shrink-0"
                        onClick={() => handleResolveAsset(searchQuery)}
                        disabled={isSearching || !searchQuery.trim()}
                      >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find Asset'}
                      </Button>
                    </div>

                    {/* Autocomplete Suggestions from REAL Database */}
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#161a23] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-30 divide-y divide-gray-100 dark:divide-white/5">
                        {suggestions.map((asset) => (
                          <div
                            key={asset.id}
                            id={`asset-suggestion-${asset.assetTag}`}
                            onClick={() => {
                              setSelectedAsset(asset);
                              setSuggestions([]);
                              setSearchQuery(asset.assetTag);
                              setCurrentStep(2);
                            }}
                            className="asset-suggestion-item p-3.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                <Box className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {asset.assetTag}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{asset.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[11px] bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                {asset.category}
                              </Badge>
                              <Badge className="text-[11px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                {asset.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Confirm Asset */}
              {currentStep === 2 && selectedAsset && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Confirm Selected Asset
                    </h2>
                    <p className="text-sm text-gray-500">
                      Verify asset details from PostgreSQL before proceeding to record evidence.
                    </p>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-4">
                    <div className="flex items-start sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                          <Box className="h-5 w-5 sm:h-7 sm:w-7" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                            {selectedAsset.name}
                          </h3>
                          <p className="text-xs sm:text-sm font-mono text-primary-600 dark:text-primary-400">
                            {selectedAsset.assetTag}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] sm:text-xs font-bold uppercase shrink-0">
                        {selectedAsset.status}
                      </Badge>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Category
                        </dt>
                        <dd className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                          {selectedAsset.category}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Asset ID (GUID)
                        </dt>
                        <dd className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-all [overflow-wrap:anywhere]">
                          {selectedAsset.id}
                        </dd>
                      </div>
                      {selectedAsset.location && (
                        <div>
                          <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Location Site
                          </dt>
                          <dd className="font-medium text-gray-800 dark:text-gray-200 mt-0.5 flex items-center gap-1.5 break-words">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {selectedAsset.location.site}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Operating Status
                        </dt>
                        <dd className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                          Operational
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl w-full sm:w-auto"
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Select Different Asset
                    </Button>
                    <Button
                      id="confirm-asset-btn"
                      className="h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto shadow-sm"
                      onClick={() => {
                        setCapturedAt(new Date());
                        setCurrentStep(3);
                      }}
                    >
                      Confirm Asset & Continue
                      <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Activity & Description */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Choose Activity Type
                    </h2>
                    <p className="text-sm text-gray-500">
                      Select the industrial activity performed on {selectedAsset?.assetTag}.
                    </p>
                  </div>

                  {/* Backend-supported ActivityType grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {BACKEND_ACTIVITY_TYPES.map((type) => {
                      const Icon = ACTIVITY_TYPE_ICONS[type] || Tag;
                      const isSelected = activityType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          id={`activity-btn-${type.toLowerCase()}`}
                          onClick={() => setActivityType(type)}
                          className={`p-4 rounded-2xl text-left border transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20 shadow-sm'
                              : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                          }`}
                        >
                          <div
                            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm font-bold ${
                                  isSelected
                                    ? 'text-primary-900 dark:text-primary-200'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {ACTIVITY_TYPE_LABELS[type]}
                              </p>
                              {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {ACTIVITY_TYPE_DESCRIPTIONS[type]}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Description input */}
                  <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/10">
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                      Observations & Findings
                    </label>
                    <Textarea
                      id="observations-textarea"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail inspection results, measured readings, replaced parts, or maintenance notes..."
                      className="bg-gray-50/50 dark:bg-black/20 rounded-2xl"
                    />
                  </div>

                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl shrink-0"
                      onClick={() => setCurrentStep(2)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" /> Back
                    </Button>
                    <Button
                      id="continue-to-location-btn"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
                      disabled={!activityType || !description.trim()}
                      onClick={() => setCurrentStep(4)}
                    >
                      Continue to Location
                      <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: Location */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Anchor Location
                    </h2>
                    <p className="text-sm text-gray-500">
                      Record current physical geolocation to anchor evidence to the custody chain.
                    </p>
                  </div>

                  <div
                    id="fetch-location-box"
                    onClick={() => {
                      if (!location && !isGettingLocation) handleFetchLocation();
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-4 sm:p-6 rounded-2xl border transition-all ${
                      location
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-gray-50/50 dark:bg-white/[0.02] border-black/5 dark:border-white/10 hover:border-black/20 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div
                        className={`h-11 w-11 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                          location
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                        }`}
                      >
                        {isGettingLocation ? (
                          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                        ) : location ? (
                          <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                        ) : (
                          <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base break-words">
                          {location ? location.address : 'Fetch Current GPS Location'}
                        </p>
                        {location ? (
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1 break-all [overflow-wrap:anywhere]">
                            LAT: {location.latitude.toFixed(6)} | LNG: {location.longitude.toFixed(6)} (±
                            {location.accuracy?.toFixed(1)}m)
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Click to query device GPS sensors and anchor coordinates.
                          </p>
                        )}
                      </div>
                      {!location && !isGettingLocation && (
                        <Button size="sm" variant="secondary" className="rounded-xl shrink-0 text-xs px-2.5 sm:px-3">
                          Fetch GPS
                        </Button>
                      )}
                    </div>
                  </div>

                  {locationError && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="break-words">{locationError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl shrink-0"
                      onClick={() => setCurrentStep(3)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" /> Back
                    </Button>
                    <Button
                      id="continue-to-media-btn"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
                      disabled={!location}
                      onClick={() => setCurrentStep(5)}
                    >
                      Continue to Media Capture
                      <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5: Media Capture */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Real-Time Camera Capture
                    </h2>
                    <p className="text-sm text-gray-500">
                      Record live photographic or video evidence for {selectedAsset?.assetTag}.
                    </p>
                  </div>

                  {/* Camera Viewport */}
                  <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video flex items-center justify-center shadow-lg">
                    {isCameraActive && stream ? (
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-8 text-center text-white">
                        {cameraError ? (
                          <div className="space-y-3">
                            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                            <p className="text-sm text-gray-300 max-w-sm mx-auto">{cameraError}</p>
                            <Button
                              onClick={() => startCamera()}
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                            >
                              Retry Camera
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Loader2 className="h-10 w-10 animate-spin text-primary-400 mx-auto" />
                            <p className="text-sm text-gray-300">Initializing camera feed...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Camera Controls Overlay */}
                    {isCameraActive && stream && (
                      <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between z-20">
                        {videoDevices.length > 1 ? (
                          <button
                            onClick={() => switchCamera()}
                            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            title="Switch Camera"
                          >
                            <RotateCw className="h-5 w-5" />
                          </button>
                        ) : (
                          <div className="w-11" />
                        )}

                        {/* Capture Trigger Buttons */}
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={handleTakePhoto}
                            disabled={isRecording}
                            className="h-16 w-16 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ring-4 ring-white/20"
                            title="Take Photo"
                          >
                            <Camera className="h-7 w-7 text-gray-900" />
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleVideo}
                            className={`h-16 w-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ring-4 ring-white/20 ${
                              isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-gray-900 text-white border-2 border-white/50'
                            }`}
                            title={isRecording ? 'Stop Recording' : 'Record Video'}
                          >
                            <Video className="h-7 w-7" />
                          </button>
                        </div>

                        <div className="w-11" />
                      </div>
                    )}
                  </div>

                  {/* Captured Thumbnails */}
                  {capturedFiles.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Captured Media ({capturedFiles.length})
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">Ready for review</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        {capturedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-black/5 dark:border-white/10 group"
                          >
                            {file.type.startsWith('video/') ? (
                              <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={URL.createObjectURL(file)} alt="Evidence" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCapturedFiles((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white uppercase tracking-wider">
                              {file.type.startsWith('video/') ? 'VID' : 'IMG'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl shrink-0"
                      onClick={() => setCurrentStep(4)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" /> Back
                    </Button>
                    <Button
                      id="continue-to-review-btn"
                      className="h-10 sm:h-11 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
                      disabled={capturedFiles.length === 0}
                      onClick={() => {
                        stopCamera();
                        setCurrentStep(6);
                      }}
                    >
                      Continue to Review
                      <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 6: Review */}
              {currentStep === 6 && selectedAsset && activityType && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Review Evidence
                    </h2>
                    <p className="text-sm text-gray-500">
                      Verify all collected information before entering the final confirmation step.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 p-4 sm:p-6 space-y-5 sm:space-y-6">
                    {/* Automatic Timestamp */}
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-white dark:bg-black/30 border border-black/5 dark:border-white/10">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Automatic Capture Timestamp
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                          {formatCapturedDate(capturedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Summary Grid */}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-xs sm:text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Target Asset
                        </dt>
                        <dd className="font-bold text-gray-900 dark:text-white mt-0.5 break-words">
                          {selectedAsset.name} ({selectedAsset.assetTag})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Activity Type
                        </dt>
                        <dd className="font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                          {ACTIVITY_TYPE_LABELS[activityType]}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          GPS Location
                        </dt>
                        <dd className="font-medium text-gray-800 dark:text-gray-200 mt-0.5 break-words [overflow-wrap:anywhere]">
                          {location?.address}
                          <span className="block font-mono text-xs text-gray-500 mt-0.5 break-all">
                            {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)} (±
                            {location?.accuracy?.toFixed(1)}m)
                          </span>
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Observations
                        </dt>
                        <dd className="text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-white dark:bg-black/20 p-3 sm:p-3.5 rounded-xl border border-black/5 dark:border-white/5">
                          {description}
                        </dd>
                      </div>
                    </dl>

                    {/* Media Previews */}
                    <div>
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                        Media Previews ({capturedFiles.length})
                      </dt>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        {capturedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-black/5 relative"
                          >
                            {file.type.startsWith('video/') ? (
                              <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                            ) : (
                              <img src={URL.createObjectURL(file)} alt="Evidence" className="w-full h-full object-cover" />
                            )}
                            <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1 rounded bg-black/60 text-white uppercase">
                              {file.type.startsWith('video/') ? 'VID' : 'IMG'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl shrink-0"
                      onClick={() => setCurrentStep(5)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" /> Back
                    </Button>
                    <Button
                      id="proceed-to-confirmation-btn"
                      className="h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shrink-0 shadow-sm"
                      onClick={() => setCurrentStep(7)}
                    >
                      <span>Proceed to Confirmation</span>
                      <ArrowRight className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 7: Confirm & Submit */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Final Confirmation & Submission
                    </h2>
                    <p className="text-sm text-gray-500">
                      Once submitted, this evidence record is cryptographically canonicalized, sealed, and becomes
                      immutable.
                    </p>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 space-y-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                          Cryptographic Ledger Immutability
                        </p>
                        <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                          By submitting, you affirm under industrial audit standards that the captured media and observation
                          represent true conditions at the anchored timestamp. This record cannot be altered or edited
                          after submission.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 sm:pt-4 border-t border-amber-200/60 dark:border-amber-800/30">
                      <label className="flex items-start sm:items-center gap-2.5 sm:gap-3 cursor-pointer select-none">
                        <input
                          id="final-confirm-checkbox"
                          type="checkbox"
                          checked={isConfirmed}
                          onChange={(e) => setIsConfirmed(e.target.checked)}
                          className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0 rounded text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 cursor-pointer shrink-0"
                        />
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                          I confirm that the above evidence is correct and ready for submission.
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="h-10 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl shrink-0"
                      disabled={submissionState.status === 'loading'}
                      onClick={() => setCurrentStep(6)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="hidden xs:inline">Back to Review</span>
                      <span className="xs:hidden">Back</span>
                    </Button>
                    <Button
                      id="final-submit-evidence-btn"
                      className="h-10 sm:h-11 px-4 sm:px-8 text-xs sm:text-sm font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 shrink-0"
                      disabled={!isConfirmed || submissionState.status === 'loading'}
                      onClick={handleFinalSubmit}
                    >
                      {submissionState.status === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5 sm:mr-2 shrink-0" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Evidence
                          <Check className="h-4 w-4 ml-1.5 sm:ml-2 shrink-0" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Submission Progress Modal */}
          {submissionState.status !== 'idle' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                <div className="mb-5 flex justify-center">
                  {submissionState.status === 'loading' && (
                    <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
                  )}
                  {submissionState.status === 'success' && (
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                  )}
                  {submissionState.status === 'error' && (
                    <AlertCircle className="h-12 w-12 text-rose-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {submissionState.status === 'loading'
                    ? 'Processing Evidence'
                    : submissionState.status === 'success'
                    ? 'Evidence Sealed'
                    : 'Submission Error'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  {submissionState.message || submissionState.step}
                </p>
                {submissionState.status === 'error' && (
                  <div className="mt-6">
                    <Button
                      onClick={() => setSubmissionState({ step: '', status: 'idle' })}
                      className="w-full rounded-xl"
                    >
                      Dismiss & Try Again
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