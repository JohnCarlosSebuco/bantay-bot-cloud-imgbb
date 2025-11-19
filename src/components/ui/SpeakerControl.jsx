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
  const { currentTheme } = useTheme();
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isDragging, setIsDragging] = useState(false);

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
    <div className={`bg-white rounded-2xl p-5 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-bold text-gray-800">🔊 Speaker Control</h3>
        <button
          onClick={onMuteToggle}
          className={`p-3 rounded-xl min-w-[50px] flex items-center justify-center transition-all ${
            isMuted ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <span
            className={`text-2xl ${!isMuted ? 'animate-pulse' : ''}`}
          >
            {getVolumeIcon()}
          </span>
        </button>
      </div>

      {/* Volume Control */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Volume
        </label>
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-xs text-gray-500 w-8 text-center">0%</span>
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              disabled={isMuted}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-center">100%</span>
        </div>
        <div className="text-base font-bold text-blue-600 text-center">
          {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testSpeaker}
        disabled={isTestPlaying}
        className={`w-full p-4 rounded-xl text-white font-bold text-base mb-4 transition-all ${
          isTestPlaying
            ? 'bg-green-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isTestPlaying ? '▶️ Playing...' : '🎵 Test Speaker'}
      </button>

      {/* Status Bar */}
      <div className="flex items-center justify-center pt-4 border-t border-gray-200">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            isMuted ? 'bg-red-500' : 'bg-green-500'
          }`}
        />
        <span className="text-sm text-gray-600 font-semibold">
          {isMuted ? 'Audio Muted' : 'Audio Active'}
        </span>
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

export default SpeakerControl;