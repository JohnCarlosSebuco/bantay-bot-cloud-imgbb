import React, { useState, useRef, useEffect } from 'react';

const AudioPlayerControl = ({
  isPlaying = false,
  isLoading = false,
  onPlay,
  onStop,
  currentVolume = 50,
  onVolumeChange,
  language = 'tl',
  className = ''
}) => {
  const [localVolume, setLocalVolume] = useState(currentVolume);
  const [isDragging, setIsDragging] = useState(false);
  const volumeRef = useRef(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalVolume(currentVolume);
    }
  }, [currentVolume, isDragging]);

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setLocalVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      onStop?.();
    } else {
      onPlay?.();
    }
  };

  const getVolumeIcon = () => {
    if (localVolume === 0) return '🔇';
    if (localVolume < 30) return '🔈';
    if (localVolume < 70) return '🔉';
    return '🔊';
  };

  const getPlayButtonText = () => {
    if (isLoading) {
      return language === 'tl' ? 'Nagloloas...' : 'Loading...';
    }
    if (isPlaying) {
      return language === 'tl' ? 'Itigil' : 'Stop';
    }
    return language === 'tl' ? 'Maglaro' : 'Play';
  };

  return (
    <div className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
          <span className="text-2xl">🎵</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'KONTROL NG AUDIO' : 'AUDIO CONTROL'}
          </h3>
          <p className="text-sm text-secondary">
            {language === 'tl' ? 'I-play ang audio sa device' : 'Play audio on device'}
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-success animate-pulse' : 'bg-tertiary'}`}></div>
        <span className="text-sm text-secondary">
          {isPlaying
            ? (language === 'tl' ? 'Tumutugtog' : 'Playing')
            : (language === 'tl' ? 'Nakatigil' : 'Stopped')
          }
        </span>
      </div>

      {/* Play Control */}
      <div className="space-y-4">
        <button
          onClick={handlePlayToggle}
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 focus-ring ${
            isPlaying
              ? 'bg-error text-white hover:bg-error/90 shadow-lg'
              : 'bg-success text-white hover:bg-success/90 shadow-lg hover-lift'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">
              {isLoading ? '⏳' : isPlaying ? '⏹️' : '▶️'}
            </span>
            <span>{getPlayButtonText()}</span>
          </div>
        </button>

        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {language === 'tl' ? 'Lakas ng tunog' : 'Volume'}
            </span>
            <span className="text-sm text-tertiary">{localVolume}%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg">{getVolumeIcon()}</span>
            <div className="flex-1 relative">
              <input
                ref={volumeRef}
                type="range"
                min="0"
                max="100"
                value={localVolume}
                onChange={handleVolumeChange}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                className="w-full h-2 bg-tertiary rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, var(--primary-500) 0%, var(--primary-500) ${localVolume}%, var(--bg-tertiary) ${localVolume}%, var(--bg-tertiary) 100%)`
                }}
              />
            </div>
            <span className="text-xs text-tertiary w-8 text-right">100</span>
          </div>
        </div>

        {/* Audio Levels Visualization */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-1 h-8">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className={`w-1 bg-success rounded-full animate-pulse`}
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${index * 100}ms`,
                  animationDuration: `${800 + Math.random() * 400}ms`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-success animate-pulse' : 'bg-tertiary'}`}></div>
          <span className="text-xs text-secondary">
            {language === 'tl' ? 'Device status' : 'Device status'}
          </span>
        </div>
        <span className="text-xs text-tertiary">
          {language === 'tl' ? 'Audio' : 'Audio'}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayerControl;