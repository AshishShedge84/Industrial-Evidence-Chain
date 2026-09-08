import { useState, useRef, useEffect } from 'react';
import { X, Camera, Video, Image, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Button } from '@components/ui';
import { useCamera } from '@hooks/useCamera';
import { AlertCircle } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
}

export function PhotoCapture({ onCapture, onCancel, facingMode = 'environment' }: PhotoCaptureProps) {
  const {
    stream,
    isActive,
    error,
    devices,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  } = useCamera();

  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    startCamera(facingMode).catch(() => {});
    return () => stopCamera();
  }, [startCamera, stopCamera, facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = async () => {
    if (!stream) return;
    const blob = await capturePhoto();
    if (blob) {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
    }
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      setCapturedFile(null);
    }
  };

  const handleRetake = () => {
    setCapturedFile(null);
  };

  if (capturedFile) {
    const url = URL.createObjectURL(capturedFile);
    return (
      <div className="w-full h-full bg-black flex flex-col">
        <div className="flex-1 relative flex items-center justify-center">
          <img src={url} alt="Captured photo" className="max-w-full max-h-full object-contain" />
        </div>
        <div className="p-4 bg-gray-900/50 backdrop-blur flex items-center justify-between border-t border-gray-800">
          <div className="flex items-center gap-4">
            <span className="text-white font-mono text-sm">PHOTO • {(capturedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleRetake} className="text-white hover:bg-white/10">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={handleConfirm} className="bg-primary-500 hover:bg-primary-600">
              <Check className="h-4 w-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      <div className="relative flex-1">
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
          <button onClick={onCancel} className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <button onClick={switchCamera} className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white transition-colors">
                <RotateCcw className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center pb-10">
          <button onClick={handleCapture} disabled={!isActive} className="h-16 w-16 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50">
            <Camera className="h-8 w-8 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}