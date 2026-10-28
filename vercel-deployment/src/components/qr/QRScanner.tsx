import { useRef, useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, ScanLine, Loader2 } from 'lucide-react';
import { Button } from '@components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  facingMode?: 'user' | 'environment';
}

export function parseAssetIdentifier(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Check if it's a URL like https://.../assets/TAG or /assets/GUID
  const urlMatch = trimmed.match(/\/assets\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Check if it's JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.assetTag) return String(parsed.assetTag);
      if (parsed.assetId) return String(parsed.assetId);
      if (parsed.id) return String(parsed.id);
      if (parsed.code) return String(parsed.code);
    } catch {
      // ignore JSON parse errors
    }
  }

  return trimmed;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        isStoppingRef.current = false;
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);
    setScanResult(null);
    setIsInitializing(true);

    try {
      // Check if mediaDevices exists
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API is not supported in this browser.');
        setIsInitializing(false);
        return;
      }

      await stopScanner();

      const containerElement = document.getElementById('qr-reader-viewport');
      if (!containerElement) {
        setIsInitializing(false);
        return;
      }

      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = html5QrCode;

      // Get available cameras to determine device
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (camErr: any) {
        if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
          setError('Camera access denied. Please grant permission in your browser and macOS System Settings to scan QR codes.');
          setIsInitializing(false);
          return;
        }
      }

      if (!cameras || cameras.length === 0) {
        setError('No camera device available');
        setIsInitializing(false);
        return;
      }

      const isMobile = typeof window !== 'undefined' && (
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
      );

      // Capability-aware strategy:
      // On mobile, prefer rear camera; on desktop, prefer first available camera (usually FaceTime / built-in webcam)
      let cameraConfig: any = { facingMode: isMobile ? 'environment' : 'user' };

      const onScanSuccess = (decodedText: string) => {
        const parsed = parseAssetIdentifier(decodedText);
        setScanResult(parsed);
        if (navigator.vibrate) navigator.vibrate(200);
        stopScanner();
      };

      try {
        await html5QrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          () => {} // silent on frame errors
        );
        setHasPermission(true);
      } catch (startErr: any) {
        console.warn('Initial camera start failed, trying fallback camera device:', startErr);
        // Fallback to first enumerated camera id
        if (cameras.length > 0) {
          try {
            await html5QrCode.start(
              cameras[0].id,
              {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              onScanSuccess,
              () => {}
            );
            setHasPermission(true);
          } catch (fallbackErr: any) {
            console.error('Fallback camera failed:', fallbackErr);
            if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
              setError('Camera access denied. Please grant permission to scan QR codes.');
            } else if (fallbackErr.name === 'NotFoundError') {
              setError('No camera device available');
            } else {
              setError(fallbackErr.message || 'Failed to start camera');
            }
            setHasPermission(false);
          }
        } else {
          setError(startErr.message || 'Failed to start camera');
          setHasPermission(false);
        }
      }
    } catch (err: any) {
      console.error('QR Scanner error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please grant permission in your browser to scan QR codes.');
      } else {
        setError(err.message || 'Failed to access camera.');
      }
      setHasPermission(false);
    } finally {
      setIsInitializing(false);
    }
  }, [stopScanner]);

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow modal container DOM node to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        stopScanner();
        document.body.style.overflow = '';
      };
    } else {
      stopScanner();
      document.body.style.overflow = '';
    }
  }, [isOpen, startScanner, stopScanner]);

  const handleManualClose = () => {
    stopScanner();
    onClose();
  };

  const handleConfirm = () => {
    if (scanResult) {
      onScan(scanResult);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="absolute top-0 inset-x-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h2 className="text-white font-medium tracking-tight text-lg">Scan Asset QR</h2>
            <button
              onClick={handleManualClose}
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Viewport for Html5Qrcode */}
          <div className="relative flex-1 bg-black w-full h-full flex items-center justify-center">
            <div id="qr-reader-viewport" className="w-full h-full max-w-lg max-h-[80vh] flex items-center justify-center" />

            {/* Initializing State */}
            {isInitializing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white bg-black">
                <Loader2 className="h-10 w-10 mb-4 animate-spin text-primary-500" />
                <p className="text-sm text-gray-300 font-medium">Initializing camera...</p>
              </div>
            )}

            {/* Error State */}
            {!isInitializing && error && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6 bg-black">
                <AlertCircle className="h-12 w-12 mb-4 text-rose-500" />
                <p className="text-center mb-6 text-gray-300 max-w-md">{error}</p>
                <Button onClick={startScanner} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Retry Camera Access
                </Button>
              </div>
            )}

            {/* Scanning Overlay */}
            {hasPermission && !scanResult && !error && (
              <div className="absolute bottom-12 inset-x-0 flex justify-center z-20 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-xl rounded-full px-6 py-3 flex items-center gap-3 border border-white/10">
                  <ScanLine className="h-5 w-5 text-white/70" />
                  <span className="text-white/90 font-medium text-sm">Align QR code within frame</span>
                </div>
              </div>
            )}

            {/* Success State Overlay */}
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                >
                  <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl">
                    <div className="h-20 w-20 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">Code Scanned</h3>
                    <p className="text-gray-600 mb-8 font-mono text-sm break-all bg-gray-50 p-4 rounded-xl border border-black/5">
                      {scanResult}
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button size="lg" className="w-full rounded-2xl" onClick={handleConfirm}>
                        Proceed with Asset
                      </Button>
                      <Button size="lg" variant="ghost" className="w-full rounded-2xl text-gray-500" onClick={startScanner}>
                        Scan Again
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}