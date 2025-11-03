import React from 'react';

const BirdDetectionCard = ({
  isDetecting = false,
  lastDetectionTime = null,
  detectionCount = 0,
  detectionSensitivity = 75,
  onSensitivityChange,
  language = 'tl',
  className = ''
}) => {
  const formatLastDetection = () => {
    if (!lastDetectionTime) {
      return language === 'tl' ? 'Walang detection pa' : 'No detection yet';
    }

    const now = new Date();
    const detection = new Date(lastDetectionTime);
    const diffInMinutes = Math.floor((now - detection) / (1000 * 60));

    if (diffInMinutes < 1) {
      return language === 'tl' ? 'Ngayon lang' : 'Just now';
    } else if (diffInMinutes < 60) {
      return language === 'tl' ? `${diffInMinutes} minuto nakaraan` : `${diffInMinutes} minutes ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return language === 'tl' ? `${diffInHours} oras nakaraan` : `${diffInHours} hours ago`;
    }
  };

  const getSensitivityLevel = () => {
    if (detectionSensitivity < 30) return {
      label: language === 'tl' ? 'Mababa' : 'Low',
      color: 'info',
      icon: '🔍'
    };
    if (detectionSensitivity < 70) return {
      label: language === 'tl' ? 'Katamtaman' : 'Medium',
      color: 'warning',
      icon: '👁️'
    };
    return {
      label: language === 'tl' ? 'Mataas' : 'High',
      color: 'error',
      icon: '🎯'
    };
  };

  const sensitivityLevel = getSensitivityLevel();

  const getDetectionStatus = () => {
    if (isDetecting) {
      return {
        status: language === 'tl' ? 'May nakitang ibon!' : 'Bird detected!',
        color: 'error',
        icon: '🚨',
        bgColor: 'bg-error/10',
        textColor: 'text-error'
      };
    }

    return {
      status: language === 'tl' ? 'Nagmamasid' : 'Monitoring',
      color: 'success',
      icon: '👀',
      bgColor: 'bg-success/10',
      textColor: 'text-success'
    };
  };

  const detectionStatus = getDetectionStatus();

  return (
    <div className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDetecting ? 'bg-error/20 animate-pulse' : 'bg-success/20'}`}>
          <span className="text-2xl">{isDetecting ? '🚨' : '🦅'}</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'BIRD DETECTION' : 'BIRD DETECTION'}
          </h3>
          <p className="text-sm text-secondary">
            {language === 'tl' ? 'AI-powered na pagsubaybay' : 'AI-powered monitoring'}
          </p>
        </div>
      </div>

      {/* Detection Status */}
      <div className="space-y-4 mb-6">
        <div className={`p-4 rounded-xl ${detectionStatus.bgColor} border border-${detectionStatus.color}/20`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{detectionStatus.icon}</span>
            <div>
              <h4 className={`font-semibold ${detectionStatus.textColor}`}>
                {detectionStatus.status}
              </h4>
              <p className="text-sm text-secondary">
                {formatLastDetection()}
              </p>
            </div>
          </div>
        </div>

        {/* Detection Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-tertiary rounded-xl">
            <div className="text-2xl font-bold text-primary">{detectionCount}</div>
            <div className="text-xs text-secondary">
              {language === 'tl' ? 'Kabuuang detection' : 'Total detections'}
            </div>
          </div>
          <div className="text-center p-3 bg-tertiary rounded-xl">
            <div className="text-2xl font-bold text-primary">
              {lastDetectionTime ? '✅' : '⏳'}
            </div>
            <div className="text-xs text-secondary">
              {language === 'tl' ? 'Sistema' : 'System'}
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-secondary">
            {language === 'tl' ? 'Sensitivity Level' : 'Sensitivity Level'}
          </span>
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${sensitivityLevel.color}/10 text-${sensitivityLevel.color} flex items-center gap-1`}>
            <span>{sensitivityLevel.icon}</span>
            <span>{sensitivityLevel.label}</span>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min="10"
            max="100"
            value={detectionSensitivity}
            onChange={(e) => onSensitivityChange?.(parseInt(e.target.value))}
            className="w-full h-2 bg-tertiary rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--${sensitivityLevel.color}-500) 0%, var(--${sensitivityLevel.color}-500) ${detectionSensitivity}%, var(--bg-tertiary) ${detectionSensitivity}%, var(--bg-tertiary) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-tertiary">
            <span>10%</span>
            <span className="font-medium">{detectionSensitivity}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Detection Visualization */}
      {isDetecting && (
        <div className="mt-6 p-4 bg-error/5 rounded-xl border border-error/20">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-error font-semibold">
              {language === 'tl' ? 'LIVE DETECTION' : 'LIVE DETECTION'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="w-3 h-3 bg-error rounded-full animate-pulse"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-error animate-pulse' : 'bg-success'}`}></div>
          <span className="text-xs text-secondary">
            {language === 'tl' ? 'AI Camera' : 'AI Camera'}
          </span>
        </div>
        <span className="text-xs text-tertiary">
          {language === 'tl' ? 'Aktibo' : 'Active'}
        </span>
      </div>
    </div>
  );
};

export default BirdDetectionCard;