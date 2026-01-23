import React from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

const COLOR_CLASSES = {
  blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  green: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' },
  yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' }
};

const MODES = [
  { value: CONNECTION_MODES.AUTO, label: 'Auto', labelTl: 'Auto', icon: Zap, color: 'blue' },
  { value: CONNECTION_MODES.ONLINE, label: 'Online', labelTl: 'Online', icon: Wifi, color: 'green' },
  { value: CONNECTION_MODES.OFFLINE, label: 'Offline', labelTl: 'Offline', icon: WifiOff, color: 'yellow' }
];

export default function ConnectionModeSelector({ currentMode, onModeChange, disabled = false, language = 'en' }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map(({ value, label, labelTl, icon: Icon, color }) => {
        const isSelected = currentMode === value;
        const displayLabel = language === 'tl' ? labelTl : label;
        const classes = COLOR_CLASSES[color];
        return (
          <button
            key={value}
            onClick={() => !disabled && onModeChange(value)}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-all
              ${isSelected
                ? `${classes.border} ${classes.bg}`
                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon size={20} className={`mx-auto mb-1 ${isSelected ? classes.text : 'text-gray-500'}`} />
            <div className={`text-xs font-medium text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>
              {displayLabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}
