import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const SpeakerControl = ({
  volume = 0.7,
  onVolumeChange,
  isMuted = false,
  onMuteToggle,
  className = '',
  style = {}
}) => {
  const { currentTheme, isDark } = useTheme();
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const testSpeaker = async () => {
    if (isTestPlaying) return;

    try {
      setIsTestPlaying(true);

      // Create a simple test beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz tone
      gainNode.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioContext.currentTime);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds

      setTimeout(() => {
        setIsTestPlaying(false);
      }, 500);
    } catch (error) {
      console.log('Test speaker error:', error);
      setIsTestPlaying(false);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <div className={`surface-primary rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-primary shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-5">
        <h3 className="text-base sm:text-lg font-bold text-primary">🔊 Speaker Control</h3>
        <button
          onClick={onMuteToggle}
          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl min-w-[44px] sm:min-w-[50px] flex items-center justify-center transition-all cursor-pointer ${
            isMuted ? 'bg-error/10 hover:bg-error/20' : 'bg-tertiary hover:bg-brand/10'
          }`}
        >
          <span
            className={`text-xl sm:text-2xl ${!isMuted ? 'animate-pulse' : ''}`}
          >
            {getVolumeIcon()}
          </span>
        </button>
      </div>

      {/* Volume Control */}
      <div className="mb-4 sm:mb-5">
        <label className="block text-xs sm:text-sm font-semibold text-secondary mb-2">
          Volume
        </label>
        <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
          <span className="text-[10px] sm:text-xs text-secondary w-6 sm:w-8 text-center">0%</span>
          <div className="flex-1 relative">
            {/* Track background */}
            <div className={`absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            {/* Filled track */}
            <div
              className="absolute h-2 top-1/2 -translate-y-1/2 rounded-full bg-brand left-0"
              style={{ width: isMuted ? '0%' : `${volume * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              disabled={isMuted}
              className="volume-slider relative w-full h-2 bg-transparent appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed z-10"
            />
          </div>
          <span className="text-[10px] sm:text-xs text-secondary w-6 sm:w-8 text-center">100%</span>
        </div>
        <div className="text-sm sm:text-base font-bold text-brand text-center">
          {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testSpeaker}
        disabled={isTestPlaying}
        className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl text-white font-bold text-sm sm:text-base mb-3 sm:mb-4 transition-all cursor-pointer ${
          isTestPlaying
            ? 'bg-success cursor-not-allowed'
            : 'bg-brand hover:bg-brand/90 active:scale-[0.98]'
        }`}
      >
        {isTestPlaying ? '▶️ Playing...' : '🎵 Test Speaker'}
      </button>

      {/* Status Bar */}
      <div className="flex items-center justify-center pt-3 sm:pt-4 border-t border-primary">
        <div
          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-2 ${
            isMuted ? 'bg-error' : 'bg-success'
          }`}
        />
        <span className="text-xs sm:text-sm text-secondary font-semibold">
          {isMuted ? 'Audio Muted' : 'Audio Active'}
        </span>
      </div>

      <style>{`
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          margin-top: -4px;
        }
        .volume-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 8px;
          background: transparent;
        }
        .volume-slider::-moz-range-track {
          height: 8px;
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default SpeakerControl;
