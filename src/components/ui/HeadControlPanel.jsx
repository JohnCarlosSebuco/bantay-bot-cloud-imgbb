import React from 'react';
import { STEPPER_CONFIG } from '../../config/hardware.config';

const HEAD_POSITIONS = [
  { angle: -90, icon: '⬅️', labelEn: 'Left', labelTl: 'Kaliwa' },
  { angle: 0, icon: '⬆️', labelEn: 'Center', labelTl: 'Gitna' },
  { angle: 90, icon: '➡️', labelEn: 'Right', labelTl: 'Kanan' },
];

const HeadControlPanel = ({
  currentAngle = 0,
  loadingAngle = null,
  onAngleSelect,
  language = 'en',
  className = '',
}) => {
  const min = STEPPER_CONFIG.MIN_ANGLE;
  const max = STEPPER_CONFIG.MAX_ANGLE;

  const getLabel = (position) =>
    language === 'tl' ? position.labelTl : position.labelEn;

  const isDisabled = (angle) =>
    angle < min || angle > max || typeof onAngleSelect !== 'function';

  return (
    <div
      className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary/40 animate-fade-in ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'KONTROL NG ULO' : 'HEAD CONTROL'}
          </h3>
          <p className="text-xs text-secondary">
            {language === 'tl'
              ? 'Piliin ang direksyon ng ulo'
              : 'Select head direction'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {HEAD_POSITIONS.map((position) => {
          const { angle, icon } = position;
          const active = currentAngle === angle;
          const buttonDisabled = isDisabled(angle) || loadingAngle !== null;

          return (
            <button
              key={angle}
              type="button"
              disabled={buttonDisabled}
              onClick={() => onAngleSelect(angle)}
              className={`rounded-xl border px-3 py-4 flex flex-col items-center gap-2 transition-all duration-200 focus-ring ${
                active
                  ? 'border-info bg-info/10 text-info shadow-lg'
                  : 'border-secondary bg-surface text-primary hover:border-info/60 hover:bg-info/5'
              } ${buttonDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover-lift'}`}
            >
              <span className="text-2xl">{loadingAngle === angle ? '⏳' : icon}</span>
              <span className="text-sm font-semibold">{getLabel(position)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HeadControlPanel;

