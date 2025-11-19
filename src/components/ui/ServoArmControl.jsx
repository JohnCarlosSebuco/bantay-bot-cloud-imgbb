import React, { useState, useEffect } from 'react';

const ServoArmControl = ({
  currentPosition = 90,
  isMoving = false,
  onPositionChange,
  onPresetMove,
  language = 'tl',
  className = ''
}) => {
  const [targetPosition, setTargetPosition] = useState(currentPosition);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setTargetPosition(currentPosition);
    }
  }, [currentPosition, isDragging]);

  const handlePositionChange = (e) => {
    const newPosition = parseInt(e.target.value);
    setTargetPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  const handlePresetClick = (position, name) => {
    setTargetPosition(position);
    if (onPresetMove) {
      onPresetMove(position, name);
    }
  };

  const presetPositions = [
    { position: 0, name: language === 'tl' ? 'Kaliwa' : 'Left', icon: '⬅️' },
    { position: 90, name: language === 'tl' ? 'Gitna' : 'Center', icon: '⬆️' },
    { position: 180, name: language === 'tl' ? 'Kanan' : 'Right', icon: '➡️' }
  ];

  const getPositionStatus = () => {
    if (targetPosition < 45) return { status: language === 'tl' ? 'Kaliwa' : 'Left', color: 'info' };
    if (targetPosition <= 135) return { status: language === 'tl' ? 'Gitna' : 'Center', color: 'success' };
    return { status: language === 'tl' ? 'Kanan' : 'Right', color: 'warning' };
  };

  const positionStatus = getPositionStatus();

  return (
    <div className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center">
          <span className="text-2xl">🦾</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'KONTROL NG SERVO' : 'SERVO CONTROL'}
          </h3>
          <p className="text-sm text-secondary">
            {language === 'tl' ? 'Kontrolin ang servo arm' : 'Control servo arm movement'}
          </p>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isMoving ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
          <span className="text-sm text-secondary">
            {isMoving
              ? (language === 'tl' ? 'Gumagalaw' : 'Moving')
              : (language === 'tl' ? 'Nakatigil' : 'Stopped')
            }
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${positionStatus.color}/10 text-${positionStatus.color}`}>
          {positionStatus.status}
        </div>
      </div>

      {/* Position Display */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-primary mb-2">{targetPosition}°</div>
        <div className="text-sm text-secondary">
          {language === 'tl' ? 'Kasalukuyang posisyon' : 'Current position'}
        </div>
      </div>

      {/* Visual Servo Representation */}
      <div className="relative mb-6 bg-tertiary rounded-xl p-4">
        <div className="relative w-full h-16 flex items-center justify-center">
          {/* Servo Base */}
          <div className="w-8 h-8 bg-secondary rounded-full border-2 border-primary relative">
            {/* Servo Arm */}
            <div
              className="absolute w-12 h-1 bg-warning rounded-full transition-transform duration-500 origin-left"
              style={{
                transform: `rotate(${targetPosition - 90}deg)`,
                left: '50%',
                top: '50%',
                transformOrigin: '0 50%'
              }}
            />
          </div>

          {/* Position Markers */}
          <div className="absolute left-0 top-0 text-xs text-tertiary">0°</div>
          <div className="absolute right-0 top-0 text-xs text-tertiary">180°</div>
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 text-xs text-tertiary">90°</div>
        </div>
      </div>

      {/* Position Slider */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-secondary">
            {language === 'tl' ? 'Posisyon' : 'Position'}
          </span>
          <span className="text-sm text-tertiary">{targetPosition}°</span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="0"
            max="180"
            value={targetPosition}
            onChange={handlePositionChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            disabled={isMoving}
            className="w-full h-2 bg-tertiary rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, var(--warning-500) 0%, var(--warning-500) ${(targetPosition/180)*100}%, var(--bg-tertiary) ${(targetPosition/180)*100}%, var(--bg-tertiary) 100%)`
            }}
          />
          {/* Position markers */}
          <div className="flex justify-between mt-1 px-1">
            <span className="text-xs text-tertiary">0°</span>
            <span className="text-xs text-tertiary">90°</span>
            <span className="text-xs text-tertiary">180°</span>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {presetPositions.map((preset) => (
          <button
            key={preset.position}
            onClick={() => handlePresetClick(preset.position, preset.name)}
            disabled={isMoving}
            className={`p-3 rounded-xl border-2 transition-all duration-300 focus-ring ${
              targetPosition === preset.position
                ? 'border-warning bg-warning/10 text-warning'
                : 'border-secondary hover:border-warning hover:bg-warning/5 text-secondary hover:text-warning'
            } ${isMoving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover-lift'}`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{preset.icon}</span>
              <span className="text-xs font-medium">{preset.name}</span>
              <span className="text-xs text-tertiary">{preset.position}°</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isMoving ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
          <span className="text-xs text-secondary">
            {language === 'tl' ? 'Servo status' : 'Servo status'}
          </span>
        </div>
        <span className="text-xs text-tertiary">
          {language === 'tl' ? 'Mechanical' : 'Mechanical'}
        </span>
      </div>
    </div>
  );
};

export default ServoArmControl;