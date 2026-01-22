import React from 'react';

/**
 * Toggle component for switching between dual sensor and averaged view modes
 * Used across Dashboard, Analytics, History, and other soil sensor displays
 */
export default function SoilSensorToggle({ viewMode, onToggle, language = 'en', className = '' }) {
  const texts = {
    en: {
      dual: '2 Sensors',
      average: 'Average'
    },
    tl: {
      dual: '2 Sensor',
      average: 'Average'
    }
  };

  const t = texts[language] || texts.en;

  return (
    <div className={`flex items-center gap-0.5 bg-tertiary rounded-full p-0.5 flex-shrink-0 ${className}`}>
      <button
        onClick={() => onToggle('average')}
        className={`px-2 py-1 text-[10px] font-medium rounded-full transition-all duration-200 ${
          viewMode === 'average'
            ? 'bg-brand text-white shadow-sm'
            : 'text-secondary hover:text-primary'
        }`}
      >
        {t.average}
      </button>
      <button
        onClick={() => onToggle('dual')}
        className={`px-2 py-1 text-[10px] font-medium rounded-full transition-all duration-200 ${
          viewMode === 'dual'
            ? 'bg-brand text-white shadow-sm'
            : 'text-secondary hover:text-primary'
        }`}
      >
        {t.dual}
      </button>
    </div>
  );
}
