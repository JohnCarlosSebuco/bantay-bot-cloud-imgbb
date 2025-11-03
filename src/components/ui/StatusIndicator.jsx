import React from 'react';

const StatusIndicator = ({
  status = 'offline', // online, offline, warning, error
  label = '',
  lastUpdate = null,
  connectionStrength = 0,
  batteryLevel = null,
  temperature = null,
  language = 'tl',
  showDetails = true,
  size = 'medium', // small, medium, large
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'success',
          icon: '🟢',
          bgColor: 'bg-success/10',
          textColor: 'text-success',
          borderColor: 'border-success/30',
          label: language === 'tl' ? 'Online' : 'Online'
        };
      case 'warning':
        return {
          color: 'warning',
          icon: '🟡',
          bgColor: 'bg-warning/10',
          textColor: 'text-warning',
          borderColor: 'border-warning/30',
          label: language === 'tl' ? 'May babala' : 'Warning'
        };
      case 'error':
        return {
          color: 'error',
          icon: '🔴',
          bgColor: 'bg-error/10',
          textColor: 'text-error',
          borderColor: 'border-error/30',
          label: language === 'tl' ? 'May problema' : 'Error'
        };
      default:
        return {
          color: 'tertiary',
          icon: '⚫',
          bgColor: 'bg-tertiary',
          textColor: 'text-tertiary',
          borderColor: 'border-tertiary',
          label: language === 'tl' ? 'Offline' : 'Offline'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const formatLastUpdate = () => {
    if (!lastUpdate) {
      return language === 'tl' ? 'Walang update' : 'No updates';
    }

    const now = new Date();
    const update = new Date(lastUpdate);
    const diffInSeconds = Math.floor((now - update) / 1000);

    if (diffInSeconds < 60) {
      return language === 'tl' ? 'Ngayon lang' : 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return language === 'tl' ? `${minutes} min nakaraan` : `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return language === 'tl' ? `${hours} oras nakaraan` : `${hours}h ago`;
    }
  };

  const getConnectionBars = () => {
    const bars = [];
    for (let i = 1; i <= 4; i++) {
      bars.push(
        <div
          key={i}
          className={`w-1 rounded-full ${
            connectionStrength >= (i * 25) ? 'bg-success' : 'bg-tertiary'
          }`}
          style={{ height: `${6 + i * 2}px` }}
        />
      );
    }
    return bars;
  };

  const getBatteryIcon = () => {
    if (batteryLevel === null) return null;

    if (batteryLevel > 75) return '🔋';
    if (batteryLevel > 50) return '🔋';
    if (batteryLevel > 25) return '🪫';
    return '🪫';
  };

  const sizeClasses = {
    small: {
      container: 'p-3',
      icon: 'text-lg',
      title: 'text-sm',
      subtitle: 'text-xs',
      indicator: 'w-2 h-2'
    },
    medium: {
      container: 'p-4',
      icon: 'text-xl',
      title: 'text-base',
      subtitle: 'text-sm',
      indicator: 'w-3 h-3'
    },
    large: {
      container: 'p-6',
      icon: 'text-2xl',
      title: 'text-lg',
      subtitle: 'text-base',
      indicator: 'w-4 h-4'
    }
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className={`bg-primary rounded-xl border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} transition-all duration-300 hover-lift ${sizeClass.container} ${className}`}>
      {/* Main Status */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`${sizeClass.indicator} ${statusConfig.bgColor.replace('/10', '')} rounded-full ${status === 'online' ? 'animate-pulse' : ''}`}></div>
        <div className="flex-1">
          <div className={`font-semibold ${statusConfig.textColor} ${sizeClass.title}`}>
            {label || statusConfig.label}
          </div>
          {showDetails && (
            <div className={`${sizeClass.subtitle} text-secondary`}>
              {formatLastUpdate()}
            </div>
          )}
        </div>
        <span className={sizeClass.icon}>{statusConfig.icon}</span>
      </div>

      {/* Additional Details */}
      {showDetails && (connectionStrength > 0 || batteryLevel !== null || temperature !== null) && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-secondary">
          {/* Connection Strength */}
          {connectionStrength > 0 && (
            <div className="text-center">
              <div className="flex items-end justify-center gap-1 mb-1">
                {getConnectionBars()}
              </div>
              <div className="text-xs text-tertiary">
                {language === 'tl' ? 'Signal' : 'Signal'}
              </div>
            </div>
          )}

          {/* Battery Level */}
          {batteryLevel !== null && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-lg">{getBatteryIcon()}</span>
              </div>
              <div className="text-xs text-tertiary">
                {batteryLevel}%
              </div>
            </div>
          )}

          {/* Temperature */}
          {temperature !== null && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-lg">🌡️</span>
              </div>
              <div className="text-xs text-tertiary">
                {temperature}°C
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Animation */}
      {status === 'online' && (
        <div className="mt-3 flex justify-center">
          <div className="flex gap-1">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="w-1 h-1 bg-success rounded-full animate-pulse"
                style={{
                  animationDelay: `${index * 200}ms`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 flex justify-center">
          <div className="w-4 h-4 border-2 border-error rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;