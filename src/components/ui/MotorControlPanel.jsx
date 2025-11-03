import React, { useState } from 'react';

const MotorControlPanel = ({
  waterPumpStatus = false,
  fanStatus = false,
  onWaterPumpToggle,
  onFanToggle,
  onAllStop,
  isLoading = false,
  language = 'tl',
  className = ''
}) => {
  const [lastActivated, setLastActivated] = useState(null);

  const handleWaterPumpToggle = () => {
    setLastActivated('water');
    onWaterPumpToggle?.();
  };

  const handleFanToggle = () => {
    setLastActivated('fan');
    onFanToggle?.();
  };

  const handleAllStop = () => {
    setLastActivated(null);
    onAllStop?.();
  };

  const getStatusText = (isActive) => {
    if (isActive) {
      return language === 'tl' ? 'Naka-on' : 'On';
    }
    return language === 'tl' ? 'Naka-off' : 'Off';
  };

  const anyMotorRunning = waterPumpStatus || fanStatus;

  return (
    <div className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-info rounded-xl flex items-center justify-center">
          <span className="text-2xl">⚙️</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'KONTROL NG MOTOR' : 'MOTOR CONTROL'}
          </h3>
          <p className="text-sm text-secondary">
            {language === 'tl' ? 'Kontrolin ang water pump at fan' : 'Control water pump and fan'}
          </p>
        </div>
      </div>

      {/* Overall Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${anyMotorRunning ? 'bg-success animate-pulse' : 'bg-tertiary'}`}></div>
          <span className="text-sm text-secondary">
            {anyMotorRunning
              ? (language === 'tl' ? 'May tumatakbo' : 'Running')
              : (language === 'tl' ? 'Lahat nakatigil' : 'All stopped')
            }
          </span>
        </div>
        <div className="text-xs text-tertiary">
          {language === 'tl' ? 'Sistema' : 'System'}
        </div>
      </div>

      {/* Motor Controls Grid */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Water Pump Control */}
        <div className="border border-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${waterPumpStatus ? 'bg-info/20' : 'bg-tertiary'}`}>
                <span className="text-xl">💧</span>
              </div>
              <div>
                <h4 className="font-semibold text-primary">
                  {language === 'tl' ? 'Water Pump' : 'Water Pump'}
                </h4>
                <p className="text-xs text-secondary">
                  {language === 'tl' ? 'Pantubig sa halaman' : 'Plant watering system'}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              waterPumpStatus ? 'bg-info/10 text-info' : 'bg-tertiary text-secondary'
            }`}>
              {getStatusText(waterPumpStatus)}
            </div>
          </div>

          <button
            onClick={handleWaterPumpToggle}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 focus-ring ${
              waterPumpStatus
                ? 'bg-error text-white hover:bg-error/90'
                : 'bg-info text-white hover:bg-info/90 hover-lift'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{waterPumpStatus ? '⏹️' : '▶️'}</span>
              <span>
                {waterPumpStatus
                  ? (language === 'tl' ? 'Itigil' : 'Stop')
                  : (language === 'tl' ? 'Simulan' : 'Start')
                }
              </span>
            </div>
          </button>

          {/* Water pump activity indicator */}
          {waterPumpStatus && (
            <div className="flex items-center justify-center gap-1">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="w-2 h-2 bg-info rounded-full animate-pulse"
                  style={{
                    animationDelay: `${index * 200}ms`,
                    animationDuration: '1s'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fan Control */}
        <div className="border border-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fanStatus ? 'bg-success/20' : 'bg-tertiary'}`}>
                <span className="text-xl">🌀</span>
              </div>
              <div>
                <h4 className="font-semibold text-primary">
                  {language === 'tl' ? 'Bentilador' : 'Fan'}
                </h4>
                <p className="text-xs text-secondary">
                  {language === 'tl' ? 'Sirkulasyon ng hangin' : 'Air circulation system'}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              fanStatus ? 'bg-success/10 text-success' : 'bg-tertiary text-secondary'
            }`}>
              {getStatusText(fanStatus)}
            </div>
          </div>

          <button
            onClick={handleFanToggle}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 focus-ring ${
              fanStatus
                ? 'bg-error text-white hover:bg-error/90'
                : 'bg-success text-white hover:bg-success/90 hover-lift'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{fanStatus ? '⏹️' : '▶️'}</span>
              <span>
                {fanStatus
                  ? (language === 'tl' ? 'Itigil' : 'Stop')
                  : (language === 'tl' ? 'Simulan' : 'Start')
                }
              </span>
            </div>
          </button>

          {/* Fan spinning indicator */}
          {fanStatus && (
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-success border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Stop */}
      {anyMotorRunning && (
        <div className="border-2 border-error rounded-xl p-4 mb-4">
          <button
            onClick={handleAllStop}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-error text-white rounded-lg font-bold text-lg hover:bg-error/90 transition-all duration-300 focus-ring hover-lift"
          >
            <div className="flex items-center justify-center gap-2">
              <span>🛑</span>
              <span>
                {language === 'tl' ? 'EMERGENCY STOP' : 'EMERGENCY STOP'}
              </span>
            </div>
          </button>
          <p className="text-xs text-error text-center mt-2">
            {language === 'tl' ? 'Ihinto lahat ng motor' : 'Stop all motors immediately'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${anyMotorRunning ? 'bg-success animate-pulse' : 'bg-tertiary'}`}></div>
          <span className="text-xs text-secondary">
            {language === 'tl' ? 'Motor status' : 'Motor status'}
          </span>
        </div>
        <span className="text-xs text-tertiary">
          {anyMotorRunning ? (language === 'tl' ? 'Aktibo' : 'Active') : (language === 'tl' ? 'Idle' : 'Idle')}
        </span>
      </div>
    </div>
  );
};

export default MotorControlPanel;