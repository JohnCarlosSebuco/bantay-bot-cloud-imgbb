import React, { useState } from 'react';

const CameraSettings = ({
  brightness = 0,
  contrast = 0,
  onBrightnessChange,
  onContrastChange,
  onResolutionChange,
  grayscaleMode = false,
  onGrayscaleModeToggle,
  className = ''
}) => {
  const [selectedResolution, setSelectedResolution] = useState(1); // 0=96x96, 1=QVGA, 2=VGA, 3=SVGA

  const resolutions = [
    { label: '96x96', value: 0 },
    { label: 'QVGA (320x240)', value: 1 },
    { label: 'VGA (640x480)', value: 2 },
    { label: 'SVGA (800x600)', value: 3 },
  ];

  const handleResolutionSelect = (value) => {
    setSelectedResolution(value);
    onResolutionChange?.(value);
  };

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-lg ${className}`}>
      <h3 className="text-lg font-bold text-gray-800 mb-5">📹 Camera Settings</h3>

      {/* Brightness Control */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          ☀️ Brightness
        </label>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500 w-6 text-center">-2</span>
          <div className="flex-1">
            <input
              type="range"
              min="-2"
              max="2"
              step="1"
              value={brightness}
              onChange={(e) => onBrightnessChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>
          <span className="text-xs text-gray-500 w-6 text-center">+2</span>
        </div>
        <div className="text-sm font-bold text-blue-600 text-center mt-2">
          Current: {brightness}
        </div>
      </div>

      {/* Contrast Control */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          🎨 Contrast
        </label>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500 w-6 text-center">-2</span>
          <div className="flex-1">
            <input
              type="range"
              min="-2"
              max="2"
              step="1"
              value={contrast}
              onChange={(e) => onContrastChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>
          <span className="text-xs text-gray-500 w-6 text-center">+2</span>
        </div>
        <div className="text-sm font-bold text-blue-600 text-center mt-2">
          Current: {contrast}
        </div>
      </div>

      {/* Resolution Selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          📐 Resolution
        </label>
        <div className="grid grid-cols-2 gap-2">
          {resolutions.map((res) => (
            <button
              key={res.value}
              className={`p-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                selectedResolution === res.value
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => handleResolutionSelect(res.value)}
            >
              {res.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grayscale Mode Toggle */}
      <div className="mb-5">
        <div className="flex justify-between items-center">
          <div>
            <label className="block text-sm font-semibold text-gray-600">
              ⚫ Grayscale Mode
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Save bandwidth & processing power
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={grayscaleMode}
              onChange={(e) => onGrayscaleModeToggle?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
        <p className="text-xs text-gray-600">
          💡 <span className="font-bold text-gray-800">Tip:</span> Lower resolution saves battery. Use QVGA for detection.
        </p>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default CameraSettings;