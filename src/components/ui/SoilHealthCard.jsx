import React from 'react';

export default function SoilHealthCard({ sensorData, language }) {
  // Soil Health Calculation Functions
  const getSensorScore = (value, min, optimalMin, optimalMax, max) => {
    if (value >= optimalMin && value <= optimalMax) return 100;
    if (value < min || value > max) return 0;
    if (value < optimalMin) return Math.round(((value - min) / (optimalMin - min)) * 100);
    return Math.round(((max - value) / (max - optimalMax)) * 100);
  };

  const getSensorStatus = (score) => {
    if (score >= 80) return { status: 'optimal', color: 'success', label: language === 'tl' ? 'Sakto' : 'Optimal' };
    if (score >= 50) return { status: 'warning', color: 'warning', label: language === 'tl' ? 'Babala' : 'Warning' };
    return { status: 'critical', color: 'error', label: language === 'tl' ? 'Kritikal' : 'Critical' };
  };

  // Calculate individual sensor scores
  const humidityScore = getSensorScore(sensorData.soilHumidity, 0, 40, 70, 100);
  const temperatureScore = getSensorScore(sensorData.soilTemperature, 10, 20, 30, 45);
  const conductivityScore = getSensorScore(sensorData.soilConductivity, 0, 200, 2000, 4000);
  const phScore = getSensorScore(sensorData.ph, 3, 5.5, 7.5, 10);

  // Overall health score (weighted average)
  const overallHealthScore = Math.round((humidityScore * 0.3 + temperatureScore * 0.25 + conductivityScore * 0.25 + phScore * 0.2));

  const getOverallStatus = (score) => {
    if (score >= 80) return { label: language === 'tl' ? 'Napakahusay' : 'Excellent', color: 'success' };
    if (score >= 60) return { label: language === 'tl' ? 'Mabuti' : 'Good', color: 'success' };
    if (score >= 40) return { label: language === 'tl' ? 'Babala' : 'Warning', color: 'warning' };
    return { label: language === 'tl' ? 'Kritikal' : 'Critical', color: 'error' };
  };

  const overallStatus = getOverallStatus(overallHealthScore);

  return (
    <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
      <div className="flex justify-between items-start">
        {/* Left side - Status info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Kalusugan ng Lupa' : 'Soil Health'}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-${overallStatus.color}/20 text-${overallStatus.color}`}>
              {overallStatus.label}
            </span>
          </div>

          {/* Sensor Status Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Humidity */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(humidityScore).color}/20`}>
                <span className="text-sm sm:text-base">💧</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Halumigmig' : 'Humidity'}</div>
                <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(humidityScore).color}`}>{getSensorStatus(humidityScore).label}</div>
              </div>
            </div>
            {/* Temperature */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(temperatureScore).color}/20`}>
                <span className="text-sm sm:text-base">🌡️</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Temperatura' : 'Temperature'}</div>
                <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(temperatureScore).color}`}>{getSensorStatus(temperatureScore).label}</div>
              </div>
            </div>
            {/* Conductivity */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(conductivityScore).color}/20`}>
                <span className="text-sm sm:text-base">⚡</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Sustansya' : 'Nutrients'}</div>
                <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(conductivityScore).color}`}>{getSensorStatus(conductivityScore).label}</div>
              </div>
            </div>
            {/* pH */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(phScore).color}/20`}>
                <span className="text-sm sm:text-base">🧪</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-secondary truncate">pH Level</div>
                <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(phScore).color}`}>{getSensorStatus(phScore).label}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Circular Progress */}
        <div className="ml-4 flex-shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={overallHealthScore >= 60 ? '#22c55e' : overallHealthScore >= 40 ? '#eab308' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${overallHealthScore * 2.64} ${100 * 2.64}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg sm:text-xl font-bold text-${overallStatus.color}`}>{overallHealthScore}%</span>
              <span className="text-[8px] sm:text-[10px] text-secondary">{language === 'tl' ? 'Kalusugan' : 'Health'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
