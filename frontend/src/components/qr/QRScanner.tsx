import { useRef, useEffect, useState } from 'react';
import { X, Camera, Loader2, CheckCircle, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '@components/ui';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  facingMode?: 'user' | 'environment';
}

export function QRScanner({ isOpen, onClose, onScan, facingMode = 'environment' }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      startScanner();
      document.body.style.overflow = 'hidden';
    } else {
      stopScanner();
      document.body.style.overflow = '';
    }
    return () => {
      stopScanner();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
      setIsScanning(true);
      startScanLoop();
    } catch (err) {
      setError('Camera access denied. Please grant permission to scan QR codes.');
      setHasPermission(false);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startScanLoop = () => {
    const scan = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = decodeQR(imageData);

        if (code) {
          setScanResult(code);
          setIsScanning(false);
          // Play a subtle success sound or haptic feedback if possible
          if (navigator.vibrate) navigator.vibrate(200);
        }
      }

      if (isScanning) {
        scanIntervalRef.current = window.requestAnimationFrame(scan);
      }
    };
    scan();
  };

  const handleManualClose = () => {
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

          {/* Camera Viewport */}
          <div className="relative flex-1 bg-black w-full h-full">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none border-[40px] sm:border-[80px] border-black/50" />
            
            {hasPermission && !scanResult && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                  {/* Viewfinder Corners */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-2xl" />
                  
                  {/* Scanning Animation */}
                  <motion.div 
                    animate={{ y: [0, 256, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 inset-x-0 h-0.5 bg-white/50 shadow-[0_0_8px_2px_rgba(255,255,255,0.5)] sm:animate-[scan_3s_linear_infinite]"
                  />
                </div>
              </div>
            )}

            {/* Error State */}
            {!hasPermission && error && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6 bg-black">
                <AlertCircle className="h-12 w-12 mb-4 text-error-500" />
                <p className="text-center mb-6 text-gray-300">{error}</p>
                <Button onClick={startScanner} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Retry Camera Access
                </Button>
              </div>
            )}

            {/* Scanning Status Bar */}
            {hasPermission && !scanResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-12 inset-x-0 flex justify-center z-20"
              >
                <div className="bg-black/60 backdrop-blur-xl rounded-full px-6 py-3 flex items-center gap-3 border border-white/10">
                  <ScanLine className="h-5 w-5 text-white/70" />
                  <span className="text-white/90 font-medium text-sm">Align QR code within frame</span>
                </div>
              </motion.div>
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
                    <p className="text-gray-500 mb-8 font-mono text-sm break-all bg-gray-50 p-4 rounded-xl border border-black/5">
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

function decodeQR(imageData: ImageData): string | null {
  try {
    const jsQR = (window as any).jsQR;
    if (jsQR) {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      return code?.data ?? null;
    }
    return null;
  } catch {
    return null;
  }
}