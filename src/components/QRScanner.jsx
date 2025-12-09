import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X, Camera, AlertCircle } from 'lucide-react';

const QRScanner = ({ onScanSuccess, onClose, language = 'en' }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const texts = {
    en: {
      scanning: 'Point camera at QR code',
      initializing: 'Starting camera...',
      cancel: 'Cancel',
      cameraError: 'Camera Access Required',
      cameraErrorMessage: 'Please allow camera access to scan the QR code.',
      noCameraError: 'No Camera Found',
      noCameraMessage: 'This device does not have a camera or camera access is not supported.',
      retry: 'Try Again'
    },
    tl: {
      scanning: 'Itutok ang camera sa QR code',
      initializing: 'Binubuksan ang camera...',
      cancel: 'Kanselahin',
      cameraError: 'Kailangan ng Camera Access',
      cameraErrorMessage: 'Paki-allow ang camera access para ma-scan ang QR code.',
      noCameraError: 'Walang Camera',
      noCameraMessage: 'Walang camera ang device na ito o hindi supported ang camera access.',
      retry: 'Subukan Muli'
    }
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    let scanner = null;

    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setError('noCamera');
          setIsInitializing(false);
          return;
        }

        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            // Successfully scanned
            if (result?.data) {
              scanner.stop();
              onScanSuccess(result.data);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment' // Use back camera on mobile
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
        setIsInitializing(false);
      } catch (err) {
        console.error('QR Scanner error:', err);
        setError('permission');
        setIsInitializing(false);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [onScanSuccess]);

  const handleRetry = async () => {
    setError(null);
    setIsInitializing(true);

    if (scannerRef.current) {
      try {
        await scannerRef.current.start();
        setIsInitializing(false);
      } catch (err) {
        setError('permission');
        setIsInitializing(false);
      }
    }
  };

  // Error screen
  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
        <div className="surface-primary rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-error" />
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">
            {error === 'noCamera' ? t.noCameraError : t.cameraError}
          </h2>
          <p className="text-sm text-secondary mb-6">
            {error === 'noCamera' ? t.noCameraMessage : t.cameraErrorMessage}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm border-2 border-primary text-secondary hover:bg-tertiary transition-colors"
            >
              {t.cancel}
            </button>
            {error === 'permission' && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                {t.retry}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Video element for camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay with scanning frame */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top overlay */}
        <div className="flex-1 bg-black/60" />

        {/* Middle row with scanning frame */}
        <div className="flex">
          <div className="flex-1 bg-black/60" />

          {/* Scanning frame */}
          <div className="w-64 h-64 relative">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-lg" />

            {/* Scanning line animation */}
            <div className="absolute inset-x-4 top-4 h-0.5 bg-brand/80 animate-scan" />
          </div>

          <div className="flex-1 bg-black/60" />
        </div>

        {/* Bottom overlay */}
        <div className="flex-1 bg-black/60 flex flex-col items-center justify-start pt-8">
          {/* Status text */}
          <div className="flex items-center gap-2 text-white mb-6">
            {isInitializing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm">{t.initializing}</span>
              </>
            ) : (
              <>
                <Camera size={20} className="text-brand" />
                <span className="text-sm">{t.scanning}</span>
              </>
            )}
          </div>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-sm bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <X size={18} />
            {t.cancel}
          </button>
        </div>
      </div>

      {/* Close button in top corner */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        <X size={24} />
      </button>

      {/* CSS for scanning animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(224px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
