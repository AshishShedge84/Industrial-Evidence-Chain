import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@components/ui';
import { Textarea } from '@components/ui';
import { useMediaCapture } from '@hooks/useMediaCapture';
import { useGeolocation } from '@hooks/useGeolocation';
import { useCamera } from '@hooks/useCamera';
import type { ActivityType, EvidenceLocation } from '@type-defs/evidence';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_DESCRIPTIONS } from '@constants/activityTypes';

interface EvidenceCaptureFlowProps {
  assetId: string;
  onComplete: (evidence: CaptureEvidenceData) => Promise<void>;
  onCancel: () => void;
}

interface CaptureEvidenceData {
  activityType: ActivityType;
  description: string;
  location: EvidenceLocation;
  mediaFiles: File[];
}

const steps = [
  { id: 'activity', label: 'Activity' },
  { id: 'details', label: 'Details' },
  { id: 'capture', label: 'Capture' },
  { id: 'review', label: 'Review' },
];

export function EvidenceCaptureFlow({ assetId, onComplete, onCancel }: EvidenceCaptureFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<EvidenceLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { capturedFiles, capturePhoto, captureVideo, stopVideoCapture, isCapturing, clearCapturedFiles, error: captureError } = useMediaCapture();
  const { stream, startCamera, stopCamera, isActive, error: cameraError } = useCamera();
  const { getCurrentPosition, isSupported: geoSupported } = useGeolocation();

  const handleNext = () => {
    if (currentStep === 0 && !activityType) return;
    if (currentStep === 1 && (!description.trim() || !location)) return;
    if (currentStep === 2 && capturedFiles.length === 0) return;
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Start camera when entering capture step
  useEffect(() => {
    if (currentStep === 2 && !stream && !isActive) {
      startCamera('environment').catch(() => {});
    } else if (currentStep !== 2 && stream) {
      stopCamera();
    }
    return () => {
      if (stream) {
        stopCamera();
      }
    };
  }, [currentStep, startCamera, stopCamera, stream, isActive]);

  const handleGetLocation = async () => {
    if (!geoSupported) {
      setLocationError('Geolocation not supported');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      let address: string | undefined;
      
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        try {
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${apiKey}`);
          const data = await response.json();
          if (data.status === 'OK' && data.results.length > 0) {
            address = data.results[0].formatted_address;
          }
        } catch (e) {
          console.error('Google Maps Geocoding failed', e);
        }
      } else {
        console.warn('VITE_GOOGLE_MAPS_API_KEY is missing. Using OpenStreetMap Nominatim fallback.');
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (e) {
          console.error('Nominatim Geocoding failed', e);
        }
      }

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!activityType || !description.trim() || !location || capturedFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        activityType,
        description,
        location,
        mediaFiles: capturedFiles,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'activity':
        return (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Select Activity</h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">What type of evidence are you recording?</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {ACTIVITY_TYPES.map((type) => {
                const Icon: React.ComponentType<{ className?: string }> = ACTIVITY_TYPE_ICONS[type];
                const isSelected = activityType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActivityType(type)}
                    className={`relative p-5 rounded-2xl transition-all text-left border ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-[0_4px_20px_-8px_rgba(var(--color-primary-500),0.3)]'
                        : 'border-black/[0.05] dark:border-white/10 bg-white dark:bg-white/5 hover:border-black/10 dark:hover:border-white/20 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-500'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className={`text-[16px] font-bold mb-1 ${isSelected ? 'text-primary-900 dark:text-primary-200' : 'text-gray-900 dark:text-gray-100'}`}>
                          {ACTIVITY_TYPE_LABELS[type]}
                        </p>
                        <p className={`text-[13px] leading-relaxed ${isSelected ? 'text-primary-700/80 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {ACTIVITY_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shadow-sm">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Evidence Details</h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">Provide observations and verify location.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-widest mb-3">Observations</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your findings, issues, or actions taken in detail..."
                  rows={5}
                  required
                  className="bg-gray-50/50 border-black/[0.05] focus:bg-white text-[15px]"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-widest mb-3">Location Tag</label>
                <div
                  onClick={() => { if (!location && !isGettingLocation) handleGetLocation(); }}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    location 
                      ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 cursor-default opacity-100' 
                      : 'bg-white dark:bg-[#111] border-black/[0.05] dark:border-white/[0.05] hover:border-black/10 dark:hover:border-white/10 cursor-pointer'
                  } ${isGettingLocation ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                      location ? 'bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isGettingLocation ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : location ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0 pr-2">
                      <p className="text-[15px] font-semibold line-clamp-3 text-gray-900 dark:text-gray-100">
                        {location ? (location.address || 'Location Verified') : 'Verify Current Location'}
                      </p>
                      {location && (
                        <p className="text-[13px] font-mono mt-0.5 text-gray-600 dark:text-gray-400">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!location && !isGettingLocation && (
                    <span className="text-[13px] font-semibold text-primary-600 dark:text-primary-400 shrink-0">Tap to fetch</span>
                  )}
                </div>
                {locationError && (
                  <p className="mt-3 text-[13px] font-medium text-error-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {locationError}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'capture':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Media Capture</h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">Record visual evidence for this activity.</p>
            </div>
            
            <CaptureStep
              assetId={assetId}
              onPhotoCapture={capturePhoto}
              onVideoStart={captureVideo}
              onVideoStop={stopVideoCapture}
              capturedFiles={capturedFiles}
              isCapturing={isCapturing}
              captureError={captureError}
              clearFiles={clearCapturedFiles}
              stream={stream}
            />
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Review Evidence</h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">Ensure all details are correct before sealing.</p>
            </div>
            
            <ReviewStep
              activityType={activityType!}
              description={description}
              location={location}
              capturedFiles={capturedFiles}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 0 && !activityType) return true;
    if (currentStep === 1 && (!description.trim() || !location)) return true;
    if (currentStep === 2 && capturedFiles.length === 0) return true;
    return false;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isPast = index < currentStep;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'w-12 bg-primary-600' 
                        : isPast
                        ? 'w-6 bg-primary-200'
                        : 'w-6 bg-gray-100'
                    }`}
                  />
                  {index < steps.length - 1 && <div className="w-2" />}
                </div>
              );
            })}
          </div>
          <span className="text-[13px] font-bold text-gray-400 tracking-widest uppercase">
            Step {currentStep + 1} / {steps.length}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-[#0F1218]/80 dark:border dark:border-white/5 rounded-[2rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] p-8 sm:p-10 mb-8"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center px-2">
        <button
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
          className="h-12 px-6 rounded-xl font-semibold text-[14px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        
        <div className="flex gap-3">
          {currentStep === steps.length - 1 ? (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="h-12 px-8 rounded-xl font-bold text-[14px] bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sealing...
                </>
              ) : (
                <>
                  Seal Evidence
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="h-12 px-8 rounded-xl font-bold text-[14px] bg-black text-white hover:bg-gray-900 shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CaptureStep({
  onPhotoCapture,
  onVideoStart,
  onVideoStop,
  capturedFiles,
  isCapturing,
  captureError,
  clearFiles,
  stream,
}: {
  assetId: string;
  onPhotoCapture: (stream: MediaStream) => Promise<File | null>;
  onVideoStart: (stream: MediaStream) => Promise<File | null>;
  onVideoStop: () => Promise<File | null>;
  capturedFiles: File[];
  isCapturing: boolean;
  captureError: string | null;
  clearFiles: () => void;
  stream: MediaStream | null;
}) {
  const [showCamera, setShowCamera] = useState(false);

  const handlePhotoCapture = async () => {
    if (!showCamera) {
      setShowCamera(true);
      return;
    }
    if (stream) {
      await onPhotoCapture(stream);
    }
  };

  const handleVideoToggle = async () => {
    if (!showCamera) {
      setShowCamera(true);
      return;
    }
    if (isCapturing) {
      await onVideoStop();
    } else {
      if (stream) {
        await onVideoStart(stream);
      }
    }
  };

  return (
    <div className="space-y-6">
      {showCamera && (
        <CameraPreview
          onPhotoCapture={handlePhotoCapture}
          onVideoToggle={handleVideoToggle}
          isCapturing={isCapturing}
          onClose={() => setShowCamera(false)}
          stream={stream}
        />
      )}

      {!showCamera && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button 
            onClick={handlePhotoCapture} 
            className="group flex flex-col items-center justify-center gap-4 h-40 rounded-2xl border-2 border-dashed border-black/10 hover:border-primary-500 hover:bg-primary-50/50 transition-all"
          >
            <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={2} />
              </svg>
            </div>
            <span className="font-bold text-[15px] text-gray-900">Take Photo</span>
          </button>
          
          <button 
            onClick={handleVideoToggle} 
            className="group flex flex-col items-center justify-center gap-4 h-40 rounded-2xl border-2 border-dashed border-black/10 hover:border-primary-500 hover:bg-primary-50/50 transition-all"
          >
            <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-[15px] text-gray-900">Record Video</span>
          </button>
        </div>
      )}

      {capturedFiles.length > 0 && (
        <div className="pt-6 mt-6 border-t border-black/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 text-[15px]">Captured Media</h4>
            <span className="px-2.5 py-1 bg-black/5 text-gray-600 text-[12px] font-bold rounded-full">
              {capturedFiles.length} item{capturedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {capturedFiles.map((file, index) => (
              <div key={index} className="relative group rounded-xl overflow-hidden shadow-sm border border-black/5 aspect-square bg-gray-100">
                {file.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Evidence ${index + 1}`} />
                )}
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => {
                      const newFiles = [...capturedFiles];
                      newFiles.splice(index, 1);
                      clearFiles();
                      newFiles.forEach((f) => {
                        // Re-add files logic in actual implementation
                      });
                    }}
                    className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-error-500 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                {/* Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold tracking-wider text-white bg-black/50 backdrop-blur-md rounded-md">
                  {file.type.startsWith('video/') ? 'VIDEO' : 'PHOTO'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {captureError && (
        <div className="p-4 bg-error-50 rounded-xl text-error-700 text-[14px] font-medium flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {captureError}
        </div>
      )}
    </div>
  );
}

function CameraPreview({
  onPhotoCapture,
  onVideoToggle,
  isCapturing,
  onClose,
  stream,
}: {
  onPhotoCapture: () => void;
  onVideoToggle: () => void;
  isCapturing: boolean;
  onClose: () => void;
  stream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
      <div className="aspect-[4/3] sm:aspect-video bg-gray-900 flex items-center justify-center relative">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white text-center p-6">
            <div className="h-16 w-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 opacity-50 animate-spin" />
            </div>
            <p className="font-medium text-[15px]">Initializing Camera...</p>
          </div>
        )}
      </div>
      
      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
        <button onClick={onClose} className="h-12 w-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center gap-6">
          <button
            onClick={onPhotoCapture}
            disabled={isCapturing}
            className="h-16 w-16 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 ring-4 ring-white/20"
          >
            <div className="h-14 w-14 rounded-full border border-black/10" />
          </button>
          
          <button
            onClick={onVideoToggle}
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-colors ring-4 ring-white/20 ${
              isCapturing ? 'bg-error-500' : 'bg-black/50 backdrop-blur border-2 border-white'
            }`}
          >
            {isCapturing ? (
              <div className="h-6 w-6 rounded bg-white" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-error-500" />
            )}
          </button>
        </div>
        
        <div className="w-12" /> {/* Spacer for centering */}
      </div>
      
      {/* Recording Indicator */}
      {isCapturing && (
        <div className="absolute top-4 left-4 bg-error-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
          <div className="h-2 w-2 bg-white rounded-full" />
          REC 00:12
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  activityType,
  description,
  location,
  capturedFiles,
}: {
  activityType: ActivityType;
  description: string;
  location: EvidenceLocation | null;
  capturedFiles: File[];
}) {
  const Icon = ACTIVITY_TYPE_ICONS[activityType];
  
  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="bg-gray-50/50 rounded-2xl border border-black/[0.03] p-6 space-y-6">
        
        <div>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Activity Type</h4>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-[15px] text-gray-900">{ACTIVITY_TYPE_LABELS[activityType]}</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-black/5">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Observations</h4>
          <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>

        {location && (
          <div className="pt-6 border-t border-black/5 dark:border-white/5">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Location Anchor</h4>
            {location.address && (
              <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight whitespace-pre-wrap break-words">{location.address}</p>
            )}
            <div className="inline-flex items-center gap-2 bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 px-3 py-1.5 rounded-lg shadow-sm">
              <Check className="h-4 w-4 text-success-500 dark:text-success-400" />
              <span className="font-mono text-[13px] font-medium text-gray-600 dark:text-gray-300">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
          Attached Media ({capturedFiles.length})
        </h4>
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-4">
          {capturedFiles.map((file, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden border border-black/5 aspect-square bg-gray-100">
              {file.type.startsWith('video/') ? (
                <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
              ) : (
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Evidence ${index + 1}`} />
              )}
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold text-white bg-black/60 backdrop-blur rounded">
                {file.type.startsWith('video/') ? 'VID' : 'PIC'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}