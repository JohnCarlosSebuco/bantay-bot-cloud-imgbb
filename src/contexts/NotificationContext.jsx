import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Notification Context
const NotificationContext = createContext({
  toasts: [],
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
  removeToast: () => {},
  confirmState: null,
  confirm: () => Promise.resolve(false),
  closeConfirm: () => {},
});

// Toast duration in milliseconds
const DEFAULT_DURATION = 3000;

// Notification Provider Component
export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const toastIdRef = useRef(0);
  const confirmResolveRef = useRef(null);

  // Add a toast notification
  const addToast = useCallback((type, title, message, duration = DEFAULT_DURATION) => {
    const id = ++toastIdRef.current;
    const toast = { id, type, title, message, duration };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Convenience methods for different toast types
  const showSuccess = useCallback((title, message, duration) => {
    return addToast('success', title, message, duration);
  }, [addToast]);

  const showError = useCallback((title, message, duration) => {
    return addToast('error', title, message, duration);
  }, [addToast]);

  const showWarning = useCallback((title, message, duration) => {
    return addToast('warning', title, message, duration);
  }, [addToast]);

  const showInfo = useCallback((title, message, duration) => {
    return addToast('info', title, message, duration);
  }, [addToast]);

  // Show confirm dialog and return Promise<boolean>
  const confirm = useCallback((title, message, options = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({
        title,
        message,
        isDangerous: options.isDangerous || false,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
      });
    });
  }, []);

  // Close confirm dialog with result
  const closeConfirm = useCallback((result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmState(null);
  }, []);

  const value = {
    toasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    confirmState,
    confirm,
    closeConfirm,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notifications
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
