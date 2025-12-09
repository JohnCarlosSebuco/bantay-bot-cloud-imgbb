import React, { useState } from 'react';
import { Shield, Camera, CheckCircle, XCircle, Loader2, KeyRound } from 'lucide-react';
import { useQRSecurity } from '../contexts/QRSecurityContext';
import QRScanner from './QRScanner';

const QRSecurityGate = ({ children, language = 'en' }) => {
  const { isVerified, isLoading, verifyQRCode } = useQRSecurity();
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualKey, setManualKey] = useState('');

  const texts = {
    en: {
      title: 'Welcome to BantayBot',
      subtitle: 'Scan QR Code to Access',
      instruction: 'Scan the QR code on your BantayBot user manual to connect this app to your device.',
      scanButton: 'Scan QR Code',
      manualEntry: 'Enter Code Manually',
      manualTitle: 'Enter Access Code',
      manualInstruction: 'Enter the access code from your BantayBot user manual.',
      manualPlaceholder: 'Enter access code...',
      verify: 'Verify',
      back: 'Back',
      success: 'Verified!',
      successMessage: 'Your BantayBot is now connected to this app.',
      enterApp: 'Enter App',
      error: 'Invalid Code',
      errorMessage: 'The code you entered is invalid. Please check and try again.',
      tryAgain: 'Try Again'
    },
    tl: {
      title: 'Maligayang Pagdating sa BantayBot',
      subtitle: 'I-scan ang QR Code para Makapasok',
      instruction: 'I-scan ang QR code sa user manual ng iyong BantayBot para makakonekta ang app na ito sa device mo.',
      scanButton: 'I-scan ang QR Code',
      manualEntry: 'Ilagay ang Code',
      manualTitle: 'Ilagay ang Access Code',
      manualInstruction: 'Ilagay ang access code mula sa user manual ng BantayBot.',
      manualPlaceholder: 'Ilagay ang code...',
      verify: 'I-verify',
      back: 'Bumalik',
      success: 'Na-verify na!',
      successMessage: 'Nakakonekta na ang BantayBot mo sa app na ito.',
      enterApp: 'Pumasok sa App',
      error: 'Hindi Tamang Code',
      errorMessage: 'Hindi tama ang code na inilagay mo. Paki-check at subukan muli.',
      tryAgain: 'Subukan Muli'
    }
  };

  const t = texts[language] || texts.en;

  // Handle successful scan (async because of hashing)
  const handleScanSuccess = async (scannedValue) => {
    setShowScanner(false);
    const isValid = await verifyQRCode(scannedValue);

    if (isValid) {
      setShowSuccess(true);
    } else {
      setShowError(true);
    }
  };

  // Handle entering the app after success
  const handleEnterApp = () => {
    setShowSuccess(false);
  };

  // Handle retry after error
  const handleRetry = () => {
    setShowError(false);
    setManualKey('');
  };

  // Handle manual key verification (async because of hashing)
  const handleManualVerify = async () => {
    setShowManualEntry(false);
    const isValid = await verifyQRCode(manualKey);

    if (isValid) {
      setShowSuccess(true);
    } else {
      setShowError(true);
    }
  };

  // Loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-brand animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If verified, render the app
  if (isVerified && !showSuccess) {
    return children;
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-secondary flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Success icon with animation */}
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6 animate-bounce-once">
            <CheckCircle size={48} className="text-success" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-2">{t.success}</h1>
          <p className="text-secondary mb-8">{t.successMessage}</p>

          <button
            onClick={handleEnterApp}
            className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-brand text-white hover:bg-brand/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {t.enterApp}
          </button>
        </div>

        <style>{`
          @keyframes bounce-once {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .animate-bounce-once {
            animation: bounce-once 0.5s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Error screen
  if (showError) {
    return (
      <div className="fixed inset-0 bg-secondary flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Error icon */}
          <div className="w-24 h-24 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6">
            <XCircle size={48} className="text-error" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-2">{t.error}</h1>
          <p className="text-secondary mb-8">{t.errorMessage}</p>

          <button
            onClick={handleRetry}
            className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-brand text-white hover:bg-brand/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {t.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  // QR Scanner overlay
  if (showScanner) {
    return (
      <QRScanner
        onScanSuccess={handleScanSuccess}
        onClose={() => setShowScanner(false)}
        language={language}
      />
    );
  }

  // Manual entry screen
  if (showManualEntry) {
    return (
      <div className="fixed inset-0 bg-secondary flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-brand/20 flex items-center justify-center mx-auto mb-6">
            <KeyRound size={40} className="text-brand" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-2">{t.manualTitle}</h1>
          <p className="text-sm text-secondary mb-6">{t.manualInstruction}</p>

          {/* Input field */}
          <input
            type="text"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder={t.manualPlaceholder}
            className="w-full px-4 py-3 rounded-xl border-2 border-primary bg-primary text-primary text-center font-mono text-sm mb-6 focus:outline-none focus:border-brand transition-colors"
            autoFocus
          />

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleManualVerify}
              disabled={!manualKey.trim()}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98] ${
                manualKey.trim()
                  ? 'bg-brand text-white hover:bg-brand/90 hover:shadow-xl'
                  : 'bg-tertiary text-secondary cursor-not-allowed'
              }`}
            >
              {t.verify}
            </button>
            <button
              onClick={() => {
                setShowManualEntry(false);
                setManualKey('');
              }}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-secondary hover:text-primary hover:bg-tertiary transition-colors"
            >
              {t.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main gate screen - prompt to scan
  return (
    <div className="fixed inset-0 bg-secondary flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* Logo/Icon */}
        <div className="w-24 h-24 rounded-2xl bg-brand/20 flex items-center justify-center mx-auto mb-6">
          <Shield size={48} className="text-brand" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-primary mb-2">{t.title}</h1>
        <h2 className="text-lg font-semibold text-brand mb-4">{t.subtitle}</h2>

        {/* Instruction */}
        <p className="text-sm text-secondary mb-8 leading-relaxed">
          {t.instruction}
        </p>

        {/* QR Code illustration */}
        <div className="w-32 h-32 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-dashed border-tertiary rounded-xl flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${
                    [0, 2, 6, 8].includes(i) ? 'bg-primary' :
                    i === 4 ? 'bg-brand' : 'bg-tertiary'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scan button */}
        <button
          onClick={() => setShowScanner(true)}
          className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-brand text-white hover:bg-brand/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 mb-3"
        >
          <Camera size={24} />
          {t.scanButton}
        </button>

        {/* Manual entry button */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm border-2 border-primary text-secondary hover:text-primary hover:bg-tertiary transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound size={18} />
          {t.manualEntry}
        </button>

        {/* Footer note */}
        <p className="text-xs text-secondary mt-6">
          {language === 'tl'
            ? 'Ang QR code ay nasa user manual ng BantayBot'
            : 'The QR code is on your BantayBot user manual'
          }
        </p>
      </div>
    </div>
  );
};

export default QRSecurityGate;
