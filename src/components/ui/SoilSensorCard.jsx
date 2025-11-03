import React from 'react';

const SoilSensorCard = ({
  humidity = 0,
  temperature = 0,
  conductivity = 0,
  ph = 7.0,
  language = 'tl',
  className = ''
}) => {
  // Status determination functions
  const getHumidityStatus = (val) => {
    if (val < 40) return {
      status: language === 'tl' ? 'Tuyo' : 'Dry',
      color: 'error',
      icon: '🏜️',
      bgColor: 'bg-error/10',
      textColor: 'text-error'
    };
    if (val <= 70) return {
      status: language === 'tl' ? 'Sakto' : 'Optimal',
      color: 'success',
      icon: '🌱',
      bgColor: 'bg-success/10',
      textColor: 'text-success'
    };
    return {
      status: language === 'tl' ? 'Basa' : 'Wet',
      color: 'info',
      icon: '💧',
      bgColor: 'bg-info/10',
      textColor: 'text-info'
    };
  };

  const getTempStatus = (val) => {
    if (val < 20) return {
      status: language === 'tl' ? 'Malamig' : 'Cold',
      color: 'info',
      bgColor: 'bg-info/10',
      textColor: 'text-info'
    };
    if (val <= 30) return {
      status: language === 'tl' ? 'Mabuti' : 'Good',
      color: 'success',
      bgColor: 'bg-success/10',
      textColor: 'text-success'
    };
    return {
      status: language === 'tl' ? 'Mainit' : 'Hot',
      color: 'error',
      bgColor: 'bg-error/10',
      textColor: 'text-error'
    };
  };

  const getConductivityStatus = (val) => {
    if (val < 200) return {
      status: language === 'tl' ? 'Kulang sustansya' : 'Low nutrients',
      color: 'error',
      bgColor: 'bg-error/10',
      textColor: 'text-error'
    };
    if (val <= 2000) return {
      status: language === 'tl' ? 'Sakto' : 'Optimal',
      color: 'success',
      bgColor: 'bg-success/10',
      textColor: 'text-success'
    };
    return {
      status: language === 'tl' ? 'Sobra sustansya' : 'High nutrients',
      color: 'warning',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning'
    };
  };

  const getPHStatus = (val) => {
    if (val < 5.5) return {
      status: language === 'tl' ? 'Masyado asido' : 'Too acidic',
      color: 'error',
      bgColor: 'bg-error/10',
      textColor: 'text-error'
    };
    if (val <= 7.5) return {
      status: language === 'tl' ? 'Balanse' : 'Balanced',
      color: 'success',
      bgColor: 'bg-success/10',
      textColor: 'text-success'
    };
    return {
      status: language === 'tl' ? 'Masyado alkaline' : 'Too alkaline',
      color: 'warning',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning'
    };
  };

  const humidityData = getHumidityStatus(humidity);
  const tempData = getTempStatus(temperature);
  const conductivityData = getConductivityStatus(conductivity);
  const phData = getPHStatus(ph);

  return (
    <div className={`bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center">
          <span className="text-2xl">🌱</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">
            {language === 'tl' ? 'KALAGAYAN NG LUPA' : 'SOIL STATUS'}
          </h3>
          <p className="text-sm text-secondary">
            {language === 'tl' ? 'Real-time na pagsubaybay' : 'Real-time monitoring'}
          </p>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Soil Humidity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {language === 'tl' ? 'Halumigmig' : 'Humidity'}
            </span>
            <span className="text-xs text-tertiary">%</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary">{humidity.toFixed(1)}</span>
            <span className="text-lg">{humidityData.icon}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${humidityData.bgColor} ${humidityData.textColor}`}>
            {humidityData.status}
          </div>
          <div className="w-full bg-tertiary rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-success"
              style={{ width: `${Math.min(humidity, 100)}%` }}
            />
          </div>
        </div>

        {/* Soil Temperature */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {language === 'tl' ? 'Temperatura' : 'Temperature'}
            </span>
            <span className="text-xs text-tertiary">°C</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary">{temperature.toFixed(1)}</span>
            <span className="text-lg">🌡️</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${tempData.bgColor} ${tempData.textColor}`}>
            {tempData.status}
          </div>
          <div className="w-full bg-tertiary rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-info"
              style={{ width: `${Math.min((temperature / 40) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Soil Conductivity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {language === 'tl' ? 'Conductivity' : 'Conductivity'}
            </span>
            <span className="text-xs text-tertiary">µS/cm</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary">{conductivity.toFixed(0)}</span>
            <span className="text-lg">⚡</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${conductivityData.bgColor} ${conductivityData.textColor}`}>
            {conductivityData.status}
          </div>
          <div className="w-full bg-tertiary rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-warning"
              style={{ width: `${Math.min((conductivity / 3000) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Soil pH */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {language === 'tl' ? 'pH Level' : 'pH Level'}
            </span>
            <span className="text-xs text-tertiary">pH</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-primary">{ph.toFixed(1)}</span>
            <span className="text-lg">🧪</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${phData.bgColor} ${phData.textColor}`}>
            {phData.status}
          </div>
          <div className="w-full bg-tertiary rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-secondary"
              style={{ width: `${((ph - 4) / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs text-secondary">
            {language === 'tl' ? 'Live na datos' : 'Live data'}
          </span>
        </div>
        <span className="text-xs text-tertiary">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default SoilSensorCard;