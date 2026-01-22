import React, { useState, useEffect } from 'react';
import { Droplets, Thermometer, Zap, FlaskConical } from 'lucide-react';
import SoilSensorToggle from './SoilSensorToggle';

// Storage key for view mode preference
const STORAGE_KEY = 'bantaybot_soil_health_view_mode';

const getStoredViewMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'average';
  } catch {
    return 'average';
  }
};

const setStoredViewMode = (mode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
};

export default function SoilHealthCard({ sensorData, language }) {
  const [viewMode, setViewMode] = useState(getStoredViewMode);

  // Persist view mode preference
  useEffect(() => {
    setStoredViewMode(viewMode);
  }, [viewMode]);

  // Check if dual sensor data is available
  const hasDualSensors = !!(
    sensorData?.soil1Humidity !== undefined ||
    sensorData?.sensor1?.humidity !== undefined
  );

  // Extract sensor data for both sensors
  const getSensorValues = (sensorNum) => {
    if (sensorNum === 1) {
      return {
        humidity: sensorData?.sensor1?.humidity ?? sensorData?.soil1Humidity ?? sensorData?.soilHumidity ?? 0,
        temperature: sensorData?.sensor1?.temperature ?? sensorData?.soil1Temperature ?? sensorData?.soilTemperature ?? 0,
        conductivity: sensorData?.sensor1?.conductivity ?? sensorData?.soil1Conductivity ?? sensorData?.soilConductivity ?? 0,
        ph: sensorData?.sensor1?.ph ?? sensorData?.soil1PH ?? sensorData?.ph ?? 7
      };
    } else if (sensorNum === 2) {
      return {
        humidity: sensorData?.sensor2?.humidity ?? sensorData?.soil2Humidity ?? sensorData?.soilHumidity ?? 0,
        temperature: sensorData?.sensor2?.temperature ?? sensorData?.soil2Temperature ?? sensorData?.soilTemperature ?? 0,
        conductivity: sensorData?.sensor2?.conductivity ?? sensorData?.soil2Conductivity ?? sensorData?.soilConductivity ?? 0,
        ph: sensorData?.sensor2?.ph ?? sensorData?.soil2PH ?? sensorData?.ph ?? 7
      };
    }
    // Average
    return {
      humidity: sensorData?.average?.humidity ?? sensorData?.soilHumidity ?? 0,
      temperature: sensorData?.average?.temperature ?? sensorData?.soilTemperature ?? 0,
      conductivity: sensorData?.average?.conductivity ?? sensorData?.soilConductivity ?? 0,
      ph: sensorData?.average?.ph ?? sensorData?.ph ?? 7
    };
  };
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

  const getOverallStatus = (score) => {
    if (score >= 80) return { label: language === 'tl' ? 'Napakahusay' : 'Excellent', color: 'success' };
    if (score >= 60) return { label: language === 'tl' ? 'Mabuti' : 'Good', color: 'success' };
    if (score >= 40) return { label: language === 'tl' ? 'Babala' : 'Warning', color: 'warning' };
    return { label: language === 'tl' ? 'Kritikal' : 'Critical', color: 'error' };
  };

  // Calculate health scores for a sensor
  const calculateHealthScores = (values) => {
    const humidityScore = getSensorScore(values.humidity, 0, 40, 70, 100);
    const temperatureScore = getSensorScore(values.temperature, 10, 20, 30, 45);
    const conductivityScore = getSensorScore(values.conductivity, 0, 200, 2000, 4000);
    const phScore = getSensorScore(values.ph, 3, 5.5, 7.5, 10);
    const overallHealthScore = Math.round((humidityScore * 0.3 + temperatureScore * 0.25 + conductivityScore * 0.25 + phScore * 0.2));

    return {
      humidity: { score: humidityScore, status: getSensorStatus(humidityScore) },
      temperature: { score: temperatureScore, status: getSensorStatus(temperatureScore) },
      conductivity: { score: conductivityScore, status: getSensorStatus(conductivityScore) },
      ph: { score: phScore, status: getSensorStatus(phScore) },
      overall: { score: overallHealthScore, status: getOverallStatus(overallHealthScore) }
    };
  };

  // Get scores for display based on view mode
  const sensor1Values = getSensorValues(1);
  const sensor2Values = getSensorValues(2);
  const averageValues = getSensorValues('average');

  const sensor1Health = calculateHealthScores(sensor1Values);
  const sensor2Health = calculateHealthScores(sensor2Values);
  const averageHealth = calculateHealthScores(averageValues);

  // Legacy compatibility - use average for non-dual mode or when in average view
  const humidityScore = averageHealth.humidity.score;
  const temperatureScore = averageHealth.temperature.score;
  const conductivityScore = averageHealth.conductivity.score;
  const phScore = averageHealth.ph.score;
  const overallHealthScore = averageHealth.overall.score;
  const overallStatus = averageHealth.overall.status;

  // Circular progress component for reuse
  const CircularProgress = ({ score, status, size = 'normal', label }) => {
    const sizeClasses = size === 'small'
      ? 'w-16 h-16 sm:w-18 sm:h-18'
      : 'w-20 h-20 sm:w-24 sm:h-24';
    const textSize = size === 'small' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
    const labelSize = size === 'small' ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[10px]';

    return (
      <div className={`relative ${sizeClasses}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${score * 2.64} ${100 * 2.64}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${textSize} font-bold text-${status.color}`}>{score}%</span>
          <span className={`${labelSize} text-secondary`}>{label}</span>
        </div>
      </div>
    );
  };

  // Sensor status grid component for reuse
  const SensorStatusGrid = ({ health, compact = false }) => (
    <div className={`grid grid-cols-2 gap-2 ${compact ? 'gap-1.5' : ''}`}>
      {/* Humidity */}
      <div className="flex items-center gap-2">
        <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-lg flex items-center justify-center bg-${health.humidity.status.color}/20`}>
          <Droplets size={compact ? 14 : 16} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-secondary truncate`}>{language === 'tl' ? 'Basa' : 'Moisture'}</div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs sm:text-sm'} font-semibold text-${health.humidity.status.color}`}>{health.humidity.status.label}</div>
        </div>
      </div>
      {/* Temperature */}
      <div className="flex items-center gap-2">
        <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-lg flex items-center justify-center bg-${health.temperature.status.color}/20`}>
          <Thermometer size={compact ? 14 : 16} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-secondary truncate`}>{language === 'tl' ? 'Init' : 'Temp'}</div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs sm:text-sm'} font-semibold text-${health.temperature.status.color}`}>{health.temperature.status.label}</div>
        </div>
      </div>
      {/* Conductivity */}
      <div className="flex items-center gap-2">
        <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-lg flex items-center justify-center bg-${health.conductivity.status.color}/20`}>
          <Zap size={compact ? 14 : 16} className="text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-secondary truncate`}>{language === 'tl' ? 'Sustansya' : 'Nutrients'}</div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs sm:text-sm'} font-semibold text-${health.conductivity.status.color}`}>{health.conductivity.status.label}</div>
        </div>
      </div>
      {/* pH */}
      <div className="flex items-center gap-2">
        <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-lg flex items-center justify-center bg-${health.ph.status.color}/20`}>
          <FlaskConical size={compact ? 14 : 16} className="text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-secondary truncate`}>pH</div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs sm:text-sm'} font-semibold text-${health.ph.status.color}`}>{health.ph.status.label}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-sm sm:text-lg font-bold text-primary whitespace-nowrap">{language === 'tl' ? 'Kalusugan ng Lupa' : 'Soil Health'}</h3>
          {viewMode === 'average' && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-${overallStatus.color}/20 text-${overallStatus.color}`}>
              {overallStatus.label}
            </span>
          )}
        </div>
        {hasDualSensors && (
          <SoilSensorToggle viewMode={viewMode} onToggle={setViewMode} language={language} />
        )}
      </div>

      {/* Dual Sensor View */}
      {viewMode === 'dual' && hasDualSensors ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Sensor 1 */}
          <div className="bg-tertiary rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary">Sensor 1</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-${sensor1Health.overall.status.color}/20 text-${sensor1Health.overall.status.color}`}>
                {sensor1Health.overall.score}%
              </span>
            </div>
            <SensorStatusGrid health={sensor1Health} compact />
          </div>
          {/* Sensor 2 */}
          <div className="bg-tertiary rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary">Sensor 2</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-${sensor2Health.overall.status.color}/20 text-${sensor2Health.overall.status.color}`}>
                {sensor2Health.overall.score}%
              </span>
            </div>
            <SensorStatusGrid health={sensor2Health} compact />
          </div>
        </div>
      ) : (
        /* Average View (Original Layout) */
        <div className="flex justify-between items-start">
          {/* Left side - Status info */}
          <div className="flex-1">
            <SensorStatusGrid health={averageHealth} />
          </div>

          {/* Right side - Circular Progress */}
          <div className="ml-4 flex-shrink-0">
            <CircularProgress
              score={overallHealthScore}
              status={overallStatus}
              label={language === 'tl' ? 'Kalusugan' : 'Health'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
