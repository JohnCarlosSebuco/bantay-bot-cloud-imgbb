import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

// Default button labels
const defaultLabels = {
  confirm: 'Confirm',
  cancel: 'Cancel',
};

const ConfirmDialog = ({ language = 'en' }) => {
  const { confirmState, closeConfirm } = useNotification();
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Bilingual labels
  const labels = {
    en: { confirm: 'Confirm', cancel: 'Cancel' },
    tl: { confirm: 'Ituloy', cancel: 'Kanselahin' },
  };
  const t = labels[language] || labels.en;

  // Animate in when confirmState changes
  useEffect(() => {
    if (confirmState) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [confirmState]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!confirmState) return;

    // Focus confirm button on open
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && document.activeElement === confirmBtnRef.current) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Tab') {
        // Simple focus trap within dialog
        const focusable = dialogRef.current?.querySelectorAll('button');
        if (focusable && focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Prevent scrolling when dialog is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmState]);

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(() => closeConfirm(true), 150);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => closeConfirm(false), 150);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!confirmState) return null;

  const { title, message, isDangerous, confirmText, cancelText } = confirmState;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-150
        ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`
          w-full max-w-md surface-primary rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-150
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 ${isDangerous ? 'bg-error/5' : ''}`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`
              shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${isDangerous ? 'bg-error/20' : 'bg-warning/20'}
            `}>
              <AlertTriangle
                size={20}
                className={isDangerous ? 'text-error' : 'text-warning'}
              />
            </div>

            {/* Title & Message */}
            <div className="flex-1 min-w-0">
              <h2
                id="confirm-dialog-title"
                className={`font-bold text-lg ${isDangerous ? 'text-error' : 'text-primary'}`}
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-description"
                className="text-sm text-secondary mt-1"
              >
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors"
          >
            {cancelText || t.cancel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={handleConfirm}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium text-white transition-colors
              ${isDangerous
                ? 'bg-error hover:bg-error/90'
                : 'bg-brand hover:bg-brand/90'
              }
            `}
          >
            {confirmText || t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
