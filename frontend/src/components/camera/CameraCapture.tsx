import { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Video, VideoOff, Download, AlertCircle } from 'lucide-react';
import { Button } from '@components/ui';
import { Modal } from '@components/ui';
import { useCamera } from '@hooks/useCamera';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, type: 'photo' | 'video') => void;
  defaultFacingMode?: 'user' | 'environment';
}

export function CameraCapture({ isOpen, onClose, onCapture, defaultFacingMode = 'environment' }: CameraCaptureProps) {
  const {
    stream,
    isActive,
    error,
    facingMode,
    devices,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
  } = useCamera();

  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera(defaultFacingMode).catch(() => {});
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera, defaultFacingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handlePhotoCapture = async () => {
    if (!stream) return;
    const blob = await capturePhoto();
    if (blob) {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreviewFile(file);
    }
  };

  const handleVideoToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        setPreviewFile(file);
      }
    } else {
      await startRecording();
    }
  };

  const handleConfirmCapture = () => {
    if (previewFile) {
      onCapture(previewFile, mode);
      setPreviewFile(null);
    }
  };

  const handleRetake = () => {
    setPreviewFile(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={!previewFile}
      showCloseButton={!previewFile}
    >
      <div className="h-full flex flex-col bg-black">
        {!previewFile ? (
          <>
            <div className="relative flex-1 bg-gray-900">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center p-4">
                    <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                    <p>{error}</p>
                    <p className="text-sm mt-2">Please check camera permissions</p>
                  </div>
                </div>
              )}

              <div className="absolute top-4 left-4 right-4 flex justify-between">
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                  {devices.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </button>
                  )}
                  <button
                    onClick={() => setMode(mode === 'photo' ? 'video' : 'photo')}
                    className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-white text-sm transition-colors"
                  >
                    {mode === 'photo' ? 'VIDEO' : 'PHOTO'}
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6 pb-10">
                <button
                  onClick={mode === 'photo' ? handlePhotoCapture : handleVideoToggle}
                  disabled={!isActive || (mode === 'video' && !isRecording && !stream)}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
                    mode === 'photo'
                      ? 'bg-white hover:bg-gray-100'
                      : isRecording
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-white hover:bg-gray-100'
                  } disabled:opacity-50`}
                >
                  {mode === 'photo' ? (
                    <Camera className="h-8 w-8 text-black" />
                  ) : isRecording ? (
                    <div className="h-6 w-6 rounded bg-white" />
                  ) : (
                    <Video className="h-8 w-8 text-black" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <PreviewModal
            file={previewFile}
            type={mode}
            onConfirm={handleConfirmCapture}
            onRetake={handleRetake}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  );
}

function PreviewModal({
  file,
  type,
  onConfirm,
  onRetake,
  onClose,
}: {
  file: File;
  type: 'photo' | 'video';
  onConfirm: () => void;
  onRetake: () => void;
  onClose: () => void;
}) {
  const url = URL.createObjectURL(file);

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 relative flex items-center justify-center">
        {type === 'photo' ? (
          <img src={url} alt="Preview" className="max-w-full max-h-full object-contain" />
        ) : (
          <video src={url} controls className="max-w-full max-h-full" autoPlay />
        )}
      </div>
      <div className="p-4 bg-gray-900/50 backdrop-blur flex items-center justify-between border-t border-gray-800">
        <div className="flex items-center gap-4">
          <span className="text-white font-mono text-sm">
            {type === 'photo' ? 'PHOTO' : 'VIDEO'} • {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <a
            href={url}
            download={file.name}
            className="p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <Download className="h-5 w-5" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onRetake} className="text-white hover:bg-white/10">
            Retake
          </Button>
          <Button onClick={onConfirm} className="bg-primary-500 hover:bg-primary-600">
            Use This
          </Button>
        </div>
      </div>
    </div>
  );
}