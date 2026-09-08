import { useState, useCallback, useRef, useEffect } from 'react';

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  facingMode: 'user' | 'environment';
  devices: MediaDeviceInfo[];
}

export interface CameraActions {
  startCamera: (facingMode?: 'user' | 'environment') => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  capturePhoto: () => Promise<Blob | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useCamera(): CameraState & CameraActions {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  const startCamera = useCallback(
    async (newFacingMode?: 'user' | 'environment') => {
      if (newFacingMode) {
        setFacingMode(newFacingMode);
      }

      setError(null);

      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true,
        });

        setStream(newStream);
        setIsActive(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera';
        setError(message);
        setIsActive(false);
        throw err;
      }
    },
    [facingMode, stream]
  );

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);
    }
    if (isRecording) {
      stopRecording();
    }
  }, [stream, isRecording]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!stream) {
      setError('No active camera stream');
      return null;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      setError('No video track available');
      return null;
    }

    try {
      const imageCapture = new ImageCapture(videoTrack);
      const blob = await imageCapture.takePhoto();
      return blob;
    } catch {
      // Fallback: use canvas to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.9);
      });
    }
  }, [stream]);

  const startRecording = useCallback(async () => {
    if (!stream) {
      setError('No active camera stream');
      return;
    }

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
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      throw err;
    }
  }, [stream]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stream, isRecording]);

  return {
    stream,
    isActive,
    error,
    facingMode,
    devices,
    isRecording,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    requestPermission,
  };
}