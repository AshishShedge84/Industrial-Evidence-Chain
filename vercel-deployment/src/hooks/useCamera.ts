import { useState, useCallback, useRef, useEffect } from 'react';

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  facingMode: 'user' | 'environment';
  devices: MediaDeviceInfo[];
  permissionState?: 'granted' | 'denied' | 'prompt' | 'unknown';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    const isMobile = typeof window !== 'undefined' && (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));
    return isMobile ? 'environment' : 'user';
  });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep streamRef in sync with stream
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const checkPermissionState = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'camera' as PermissionName });
        setPermissionState(status.state);
        status.onchange = () => {
          setPermissionState(status.state);
        };
      } catch {
        setPermissionState('unknown');
      }
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    checkPermissionState();
  }, [enumerateDevices, checkPermissionState]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API is not supported in this browser.');
      return false;
    }
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());
      setPermissionState('granted');
      setError(null);
      await enumerateDevices();
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Camera access denied. Please allow camera permissions in your browser or macOS System Settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device available.');
      } else {
        setError(err.message || 'Failed to access camera');
      }
      return false;
    }
  }, [enumerateDevices]);

  const startCamera = useCallback(
    async (newFacingMode?: 'user' | 'environment') => {
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API is not supported in this browser.');
        setIsActive(false);
        return;
      }

      // Check device count first
      const availableDevices = await enumerateDevices();
      if (availableDevices.length === 0 && devices.length === 0) {
        // Enumerate again after a small tick if empty
        const retryDevices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = retryDevices.filter(d => d.kind === 'videoinput');
        if (vDevices.length === 0 && retryDevices.length > 0) {
          setError('No camera device available');
          setIsActive(false);
          return;
        }
      }

      const isMobile = typeof window !== 'undefined' && (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));
      const targetFacingMode = newFacingMode || (isMobile ? 'environment' : 'user');
      setFacingMode(targetFacingMode);

      // Clean up previous stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
      }

      const tryGetUserMedia = async (constraints: MediaStreamConstraints) => {
        return await navigator.mediaDevices.getUserMedia(constraints);
      };

      try {
        let newStream: MediaStream | null = null;

        if (isMobile) {
          // On mobile, try ideal environment camera first
          try {
            newStream = await tryGetUserMedia({
              video: {
                facingMode: { ideal: targetFacingMode },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch (mobileErr: any) {
            console.warn('Ideal environment camera failed on mobile, trying fallback:', mobileErr);
            // Fallback to basic video constraint
            newStream = await tryGetUserMedia({ video: true, audio: false });
          }
        } else {
          // On desktop (Mac/Windows), use standard constraints without forcing environment
          try {
            newStream = await tryGetUserMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch (desktopErr: any) {
            console.warn('High-res desktop camera failed, trying basic video:', desktopErr);
            newStream = await tryGetUserMedia({ video: true, audio: false });
          }
        }

        if (newStream) {
          streamRef.current = newStream;
          setStream(newStream);
          setIsActive(true);
          setError(null);
          setPermissionState('granted');
          await enumerateDevices();
        }
      } catch (err: any) {
        console.error('getUserMedia failed:', err);
        setIsActive(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionState('denied');
          setError('Camera access denied. Please grant camera permission in your browser and macOS System Settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera device available');
        } else if (err.name === 'NotReadableError') {
          setError('Camera hardware is currently in use by another application.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera constraints could not be satisfied by your video hardware.');
        } else if (err.name === 'SecurityError') {
          setError('Camera access requires a secure HTTPS or localhost origin.');
        } else {
          setError(err.message || 'Failed to initialize camera.');
        }
      }
    },
    [devices.length, enumerateDevices]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsActive(false);
    if (isRecording) {
      stopRecording();
    }
  }, [stream, isRecording]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const activeStream = streamRef.current || stream;
    if (!activeStream) {
      setError('No active camera stream');
      return null;
    }

    const videoTrack = activeStream.getVideoTracks()[0];
    if (!videoTrack) {
      setError('No video track available');
      return null;
    }

    try {
      if (typeof window !== 'undefined' && 'ImageCapture' in window) {
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const blob = await imageCapture.takePhoto();
        return blob;
      }
    } catch {
      // Fall back to canvas capture
    }

    // Fallback: draw video frame to canvas
    const video = document.createElement('video');
    video.srcObject = activeStream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob!);
        },
        'image/jpeg',
        0.92
      );
    });
  }, [stream]);

  const startRecording = useCallback(async () => {
    const activeStream = streamRef.current || stream;
    if (!activeStream) {
      setError('No active camera stream');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(activeStream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err: any) {
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
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        recordedChunksRef.current = [];
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  // Clean up all tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return {
    stream,
    isActive,
    error,
    facingMode,
    devices,
    permissionState,
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