import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

// Toast type configurations
const toastConfig = {
  success: {
    icon: CheckCircle,
    borderColor: 'border-l-success',
    bgColor: 'bg-success/10',
    iconColor: 'text-success',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-l-error',
    bgColor: 'bg-error/10',
    iconColor: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-l-warning',
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  info: {
    icon: Info,
    borderColor: 'border-l-info',
    bgColor: 'bg-info/10',
    iconColor: 'text-info',
  },
};

// Individual Toast Item
const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const config = toastConfig[toast.type] || toastConfig.info;
  const IconComponent = config.icon;

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  // Auto-dismiss animation
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
      }, toast.duration - 200);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg
        surface-primary ${config.borderColor} ${config.bgColor}
        transition-all duration-200 ease-out
        ${isVisible && !isLeaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4'
        }
      `}
    >
      {/* Icon */}
      <div className={`shrink-0 ${config.iconColor}`}>
        <IconComponent size={20} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm text-primary">{toast.title}</p>
        )}
        {toast.message && (
          <p className="text-sm text-secondary mt-0.5">{toast.message}</p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-tertiary transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={16} className="text-tertiary" />
      </button>
    </div>
  );
};

// Toast Container Component
const Toast = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[1080] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default Toast;
