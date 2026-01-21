import React, { useState, useEffect } from 'react';
import SoilSensorCard from './SoilSensorCard';
import SoilSensorToggle from './SoilSensorToggle';
import { Sprout } from 'lucide-react';

// LocalStorage helper for persisting view preference
const STORAGE_KEY = 'bantaybot_soil_display_mode';
const DEFAULT_MODE = 'average';

const getStoredViewMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Only return stored value if it's a valid mode, otherwise return default
    if (stored === 'dual' || stored === 'average') {
      return stored;
    }
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
};

const setStoredViewMode = (mode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
};

/**
 * DualSoilSensorDisplay - Container component that displays either:
 * - Two SoilSensorCards side by side (dual mode)
 * - One SoilSensorCard with averaged values (average mode)
 *
 * Props:
 * - sensorData: Object containing sensor1, sensor2, and average data
 *   Expected format: { sensor1: {...}, sensor2: {...}, average: {...} }
 *   Or legacy format: { soilHumidity, soilTemperature, soilConductivity, ph }
 * - language: 'en' or 'tl' for localization
 */
export default function DualSoilSensorDisplay({
  sensorData,
  language = 'en',
  showTitle = true
}) {
  // Always start with 'average' as default, then check localStorage
  const [viewMode, setViewMode] = useState('average');

  // Persist view mode preference
  useEffect(() => {
    setStoredViewMode(viewMode);
  }, [viewMode]);

  // Handle both new dual sensor format and legacy single sensor format
  // Check for raw Firebase fields (soil1Humidity, soil2Humidity) instead of nested objects
  const hasDualSensorData = sensorData?.soil1Humidity !== undefined && sensorData?.soil2Humidity !== undefined;

  // Extract sensor values - prioritize sensor-specific values over averaged values
  const sensor1 = {
    humidity: sensorData?.soil1Humidity ?? sensorData?.soilHumidity ?? 0,
    temperature: sensorData?.soil1Temperature ?? sensorData?.soilTemperature ?? 0,
    conductivity: sensorData?.soil1Conductivity ?? sensorData?.soilConductivity ?? 0,
    ph: sensorData?.soil1PH ?? sensorData?.ph ?? 7
  };

  const sensor2 = {
    humidity: sensorData?.soil2Humidity ?? sensorData?.soilHumidity ?? 0,
    temperature: sensorData?.soil2Temperature ?? sensorData?.soilTemperature ?? 0,
    conductivity: sensorData?.soil2Conductivity ?? sensorData?.soilConductivity ?? 0,
    ph: sensorData?.soil2PH ?? sensorData?.ph ?? 7
  };

  // Average values from Firebase (soilHumidity, soilTemperature, etc. are the averaged values)
  const average = {
    humidity: sensorData?.soilHumidity ?? 0,
    temperature: sensorData?.soilTemperature ?? 0,
    conductivity: sensorData?.soilConductivity ?? 0,
    ph: sensorData?.ph ?? 7
  };

  const texts = {
    en: {
      title: 'Soil Conditions',
      sensor1: 'Sensor 1',
      sensor2: 'Sensor 2'
    },
    tl: {
      title: 'Kalagayan ng Lupa',
      sensor1: 'Sensor 1',
      sensor2: 'Sensor 2'
    }
  };

  const t = texts[language] || texts.en;

  return (
    <div className="space-y-3">
      {/* Header with Toggle */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout size={20} className="text-brand" />
            <h2 className="text-base sm:text-lg font-bold text-primary">{t.title}</h2>
          </div>
          <SoilSensorToggle
            viewMode={viewMode}
            onToggle={setViewMode}
            language={language}
          />
        </div>
      )}

      {/* Sensor Cards */}
      {viewMode === 'dual' ? (
        <div className="flex flex-col gap-3">
          <SoilSensorCard
            humidity={sensor1.humidity}
            temperature={sensor1.temperature}
            conductivity={sensor1.conductivity}
            ph={sensor1.ph}
            language={language}
            sensorLabel={t.sensor1}
            compact
          />
          <SoilSensorCard
            humidity={sensor2.humidity}
            temperature={sensor2.temperature}
            conductivity={sensor2.conductivity}
            ph={sensor2.ph}
            language={language}
            sensorLabel={t.sensor2}
            compact
          />
        </div>
      ) : (
        <SoilSensorCard
          humidity={average.humidity}
          temperature={average.temperature}
          conductivity={average.conductivity}
          ph={average.ph}
          language={language}
        />
      )}
    </div>
  );
}
