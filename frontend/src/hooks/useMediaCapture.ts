import { useState, useCallback, useRef } from 'react';

export interface MediaCaptureState {
  isCapturing: boolean;
  capturedFiles: File[];
  error: string | null;
}

export interface MediaCaptureActions {
  capturePhoto: (stream: MediaStream) => Promise<File | null>;
  captureVideo: (stream: MediaStream, duration?: number) => Promise<File | null>;
  stopVideoCapture: () => Promise<File | null>;
  clearCapturedFiles: () => void;
  removeCapturedFile: (index: number) => void;
}

export function useMediaCapture(): MediaCaptureState & MediaCaptureActions {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const capturePhoto = useCallback(async (stream: MediaStream): Promise<File | null> => {
    setError(null);

    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track available');
      }

      const imageCapture = new ImageCapture(videoTrack);
      const blob = await imageCapture.takePhoto();

      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFiles((prev) => [...prev, file]);
      return file;
    } catch (err) {
      // Fallback using canvas
      try {
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
        });

        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedFiles((prev) => [...prev, file]);
        return file;
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to capture photo';
        setError(message);
        return null;
      }
    }
  }, []);

  const captureVideo = useCallback(
    async (stream: MediaStream, duration?: number): Promise<File | null> => {
      setError(null);

      try {
        recordedChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(100);
        mediaRecorderRef.current = mediaRecorder;
        streamRef.current = stream;
        setIsCapturing(true);

        if (duration) {
          setTimeout(() => {
            stopVideoCapture();
          }, duration * 1000);
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start video capture';
        setError(message);
        setIsCapturing(false);
        return null;
      }
    },
    []
  );

  const stopVideoCapture = useCallback(async (): Promise<File | null> => {
    if (!mediaRecorderRef.current || !isCapturing) {
      return null;
    }

    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        recordedChunksRef.current = [];
        setCapturedFiles((prev) => [...prev, file]);
        setIsCapturing(false);
        mediaRecorderRef.current = null;
        streamRef.current = null;
        resolve(file);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isCapturing]);

  const clearCapturedFiles = useCallback(() => {
    setCapturedFiles([]);
  }, []);

  const removeCapturedFile = useCallback((index: number) => {
    setCapturedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    isCapturing,
    capturedFiles,
    error,
    capturePhoto,
    captureVideo,
    stopVideoCapture,
    clearCapturedFiles,
    removeCapturedFile,
  };
}