import { useState, useRef, useEffect } from 'react';
import { X, Video, RotateCcw, Check, Loader2, StopCircle, AlertCircle } from 'lucide-react';
import { Button } from '@components/ui';
import { useCamera } from '@hooks/useCamera';

interface VideoCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
  maxDuration?: number;
}

export function VideoCapture({ onCapture, onCancel, facingMode = 'environment', maxDuration }: VideoCaptureProps) {
  const {
    stream,
    isActive,
    error,
    devices,
    startCamera,
    stopCamera,
    switchCamera,
    startRecording,
    stopRecording,
    isRecording,
  } = useCamera();

  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCamera(facingMode).catch(() => {});
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera, stopCamera, facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleRecordToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        setRecordedFile(file);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setRecordingTime(0);
      await startRecording();
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        if (maxDuration && recordingTime + 1 >= maxDuration) {
          handleRecordToggle();
        }
      }, 1000);
    }
  };

  const handleConfirm = () => {
    if (recordedFile) {
      onCapture(recordedFile);
      setRecordedFile(null);
    }
  };

  const handleRetake = () => {
    setRecordedFile(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedFile) {
    const url = URL.createObjectURL(recordedFile);
    return (
      <div className="w-full h-full bg-black flex flex-col">
        <div className="flex-1 relative flex items-center justify-center">
          <video src={url} controls className="max-w-full max-h-full" autoPlay />
        </div>
        <div className="p-4 bg-gray-900/50 backdrop-blur flex items-center justify-between border-t border-gray-800">
          <div className="flex items-center gap-4">
            <span className="text-white font-mono text-sm">VIDEO • {(recordedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleRetake} className="text-white hover:bg-white/10">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={handleConfirm} className="bg-primary-500 hover:bg-primary-600">
              <Check className="h-4 w-4 mr-2" />
              Use Video
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
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
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
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/80 backdrop-blur rounded-full text-white">
                <StopCircle className="h-5 w-5 animate-pulse" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center pb-10">
          <button
            onClick={handleRecordToggle}
            disabled={!isActive}
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse'
                : 'bg-white hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            {isRecording ? (
              <div className="h-6 w-6 rounded bg-white" />
            ) : (
              <Video className="h-8 w-8 text-black" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}