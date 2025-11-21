import React, { useState, useEffect } from 'react';

const DetectionControls = ({
  detectionEnabled,
  onDetectionToggle,
  sensitivity = 2,
  onSensitivityChange,
  birdsDetectedToday = 0,
  onResetCount,
  className = '',
}) => {
  const [isPulsing, setIsPulsing] = useState(detectionEnabled);

  useEffect(() => {
    setIsPulsing(detectionEnabled);
  }, [detectionEnabled]);

  const getSensitivityLabel = (value) => {
    if (value === 1) return 'Low';
    if (value === 2) return 'Medium';
    return 'High';
  };

  const getSensitivityColor = (value) => {
    if (value === 1) return '#51CF66';
    if (value === 2) return '#FFB800';
    return '#FF6B6B';
  };

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">🐦 Bird Detection</h3>
        <div
          className={`w-3 h-3 rounded-full shadow-lg ${
            isPulsing ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor: detectionEnabled ? '#51CF66' : '#FF6B6B',
          }}
        />
      </div>

      {/* Detection Toggle */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="text-base font-semibold text-gray-800 mb-1">
              Detection System
            </div>
            <div className="text-xs text-gray-600">
              {detectionEnabled ? 'Actively monitoring' : 'Currently disabled'}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={detectionEnabled}
              onChange={(e) => onDetectionToggle?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Detection Statistics */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <div className="flex justify-around mb-4">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-blue-600">
              {birdsDetectedToday}
            </div>
            <div className="text-xs text-gray-600 mt-1">Birds Today</div>
          </div>
          <div className="w-px bg-gray-300 mx-4"></div>
          <div className="text-center flex-1">
            <div
              className="text-2xl font-bold"
              style={{ color: getSensitivityColor(sensitivity) }}
            >
              {getSensitivityLabel(sensitivity)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Sensitivity</div>
          </div>
        </div>
        <button
          onClick={onResetCount}
          className="w-full bg-white text-gray-600 py-2 px-4 rounded-lg border border-gray-200 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          🔄 Reset Count
        </button>
      </div>

      {/* Sensitivity Slider */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          🎯 Detection Sensitivity
        </label>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500 w-8 text-center">Low</span>
          <div className="flex-1">
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={sensitivity}
              onChange={(e) => onSensitivityChange?.(parseInt(e.target.value))}
              disabled={!detectionEnabled}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, ${getSensitivityColor(sensitivity)} 0%, ${getSensitivityColor(sensitivity)} ${((sensitivity - 1) / 2) * 100}%, #E0E0E0 ${((sensitivity - 1) / 2) * 100}%, #E0E0E0 100%)`,
              }}
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getSensitivityColor(sensitivity)};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getSensitivityColor(sensitivity)};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
            `}</style>
          </div>
          <span className="text-xs text-gray-500 w-8 text-center">High</span>
        </div>
        <div
          className="text-base font-bold text-center mt-2"
          style={{ color: getSensitivityColor(sensitivity) }}
        >
          {getSensitivityLabel(sensitivity)} Sensitivity
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
        <div className="text-sm font-bold text-gray-800 mb-2">
          ℹ️ How it works:
        </div>
        <div className="text-xs text-gray-600 leading-5">
          • <span className="font-bold text-gray-800">Low:</span> Fewer false alarms, may miss small birds
          <br />
          • <span className="font-bold text-gray-800">Medium:</span> Balanced detection (recommended)
          <br />
          • <span className="font-bold text-gray-800">High:</span> Maximum detection, more false positives
        </div>
      </div>
    </div>
  );
};

export default DetectionControls;