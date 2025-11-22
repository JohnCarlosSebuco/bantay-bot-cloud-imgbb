import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  SoilSensorCard,
} from '../components/ui';
import ConnectionManager from '../services/ConnectionManager';
import CommandService from '../services/CommandService';
import FirebaseService from '../services/FirebaseService';
import DeviceService from '../services/DeviceService';
import { CONFIG } from '../config/config';

export default function Dashboard({ language }) {
  const { currentTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const fadeOpacity = useRef(1);

  // Connection state - temp demo: default to connected
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Quick action loading states
  const [loadingAction, setLoadingAction] = useState(null);

  // Sensor data state - temp demo data
  const [sensorData, setSensorData] = useState({
    motion: 0,
    headPosition: 90,
    dhtTemperature: 25.5,
    dhtHumidity: 60,
    soilHumidity: 15,
    soilTemperature: 25,
    soilConductivity: 150,
    ph: 8.3,
    currentTrack: 1,
    volume: 20,
    audioPlaying: false,
    leftArmAngle: 90,
    rightArmAngle: 90,
    oscillating: false,
    birdDetectionEnabled: true,
    birdsDetectedToday: 3,
    detectionSensitivity: 2,
    hasDFPlayer: true,
    hasRS485Sensor: true,
    hasServos: true,
  });

  const texts = {
    en: {
      title: 'BantayBot',
      subtitle: 'Smart Crop Protection',
      connected: 'Connected',
      offline: 'Offline',
      quickControls: 'Quick Controls',
      moveArms: 'Arms',
      moveArmsDesc: 'Move arms',
      moveHead: 'Head',
      moveHeadDesc: 'Rotate head',
      soundAlarm: 'Alarm',
      soundAlarmDesc: 'Sound alert',
      lastUpdated: 'Last updated',
      birdsToday: 'birds today',
      soilConditions: 'Soil Conditions',
    },
    tl: {
      title: 'BantayBot',
      subtitle: 'Pangbantay ng Pananim',
      connected: 'Konektado',
      offline: 'Offline',
      quickControls: 'Mabilis na Kontrol',
      moveArms: 'Braso',
      moveArmsDesc: 'Galaw braso',
      moveHead: 'Ulo',
      moveHeadDesc: 'Ikot ulo',
      soundAlarm: 'Alarma',
      soundAlarmDesc: 'Tunog',
      lastUpdated: 'Huling update',
      birdsToday: 'ibon ngayon',
      soilConditions: 'Kondisyon ng Lupa',
    }
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 500, 1);
      fadeOpacity.current = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();

    const handleConnection = (status) => {
      // Temp demo: always show connected
      setIsConnected(true);
    };

    const handleData = (data) => {
      // Temp demo: keep demo sensor values, only update non-soil data
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
      setSensorData(prev => ({
        ...prev,
        motion: data?.motion ? 1 : 0,
        headPosition: safeNumber(data?.headPosition, prev.headPosition),
        dhtTemperature: safeNumber(data?.dhtTemperature, prev.dhtTemperature),
        dhtHumidity: safeNumber(data?.dhtHumidity, prev.dhtHumidity),
        // Keep demo values for soil sensors
        // soilHumidity: safeNumber(data?.soilHumidity, prev.soilHumidity),
        // soilTemperature: safeNumber(data?.soilTemperature, prev.soilTemperature),
        // soilConductivity: safeNumber(data?.soilConductivity, prev.soilConductivity),
        // ph: safeNumber(data?.ph, prev.ph),
        currentTrack: safeNumber(data?.currentTrack, prev.currentTrack),
        volume: safeNumber(data?.volume, prev.volume),
        audioPlaying: data?.audioPlaying || false,
        leftArmAngle: safeNumber(data?.leftArmAngle, prev.leftArmAngle),
        rightArmAngle: safeNumber(data?.rightArmAngle, prev.rightArmAngle),
        oscillating: data?.oscillating || false,
        birdDetectionEnabled: data?.birdDetectionEnabled !== undefined ? data.birdDetectionEnabled : true,
        birdsDetectedToday: safeNumber(data?.birdsDetectedToday, prev.birdsDetectedToday),
        detectionSensitivity: safeNumber(data?.detectionSensitivity, prev.detectionSensitivity),
        hasDFPlayer: data?.hasDFPlayer || false,
        hasRS485Sensor: true, // Keep true for demo
        hasServos: data?.hasServos || false,
      }));
    };

    const initServices = async () => {
      try {
        await FirebaseService.initialize();
        console.log('Firebase ready for remote commands');
      } catch (error) {
        console.warn('Firebase initialization warning:', error);
      }
      ConnectionManager.initialize();
    };

    initServices();
    ConnectionManager.onConnectionChange(handleConnection);
    ConnectionManager.onStatusUpdate(handleData);

    // Subscribe to Firebase sensor data for real-time updates
    // Temp demo: commented out to keep demo sensor values
    const unsubscribeSensor = DeviceService.subscribeToSensorData(CONFIG.DEVICE_ID, (data) => {
      if (data) {
        console.log('📡 Firebase sensor data received:', data);
        const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
        setSensorData(prev => ({
          ...prev,
          // Keep demo values for soil sensors
          // soilHumidity: safeNumber(data.soilHumidity, prev.soilHumidity),
          // soilTemperature: safeNumber(data.soilTemperature, prev.soilTemperature),
          // soilConductivity: safeNumber(data.soilConductivity, prev.soilConductivity),
          // ph: safeNumber(data.ph, prev.ph),
          currentTrack: safeNumber(data.currentTrack, prev.currentTrack),
          volume: safeNumber(data.volume, prev.volume),
          headPosition: safeNumber(data.headPosition, prev.headPosition),
          oscillating: data.servoActive || false,
          hasRS485Sensor: true,
        }));
        setIsConnected(true);
      }
    });

    return () => {
      ConnectionManager.disconnect();
      if (unsubscribeSensor) unsubscribeSensor();
    };
  }, [language]);

  const formatTime = (date) => {
    // Temp demo: always show 5:49 AM
    return '5:51 AM';
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

  // Generate recommendations based on sensor values
  const getRecommendations = () => {
    const recommendations = [];

    // Humidity recommendations
    if (sensorData.soilHumidity < 40) {
      recommendations.push({
        icon: '💧',
        action: language === 'tl' ? 'Diligan ang bukid' : 'Irrigate field',
        reason: language === 'tl' ? 'Tuyo ang lupa' : 'Soil is dry',
        priority: 'high',
        color: 'error'
      });
    } else if (sensorData.soilHumidity > 70) {
      recommendations.push({
        icon: '🚰',
        action: language === 'tl' ? 'Patubigan ang bukid' : 'Drain excess water',
        reason: language === 'tl' ? 'Sobrang basa' : 'Too wet',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Temperature recommendations
    if (sensorData.soilTemperature > 30) {
      recommendations.push({
        icon: '🌡️',
        action: language === 'tl' ? 'Maglagay ng pantakip' : 'Add mulch/shade',
        reason: language === 'tl' ? 'Mainit ang lupa' : 'Soil too hot',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilTemperature < 20) {
      recommendations.push({
        icon: '❄️',
        action: language === 'tl' ? 'Protektahan sa lamig' : 'Protect from cold',
        reason: language === 'tl' ? 'Malamig ang lupa' : 'Soil too cold',
        priority: 'low',
        color: 'info'
      });
    }

    // Conductivity recommendations
    if (sensorData.soilConductivity < 200) {
      recommendations.push({
        icon: '🌿',
        action: language === 'tl' ? 'Maglagay ng pataba' : 'Apply fertilizer',
        reason: language === 'tl' ? 'Kulang sa sustansya' : 'Low nutrients',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilConductivity > 2000) {
      recommendations.push({
        icon: '⚡',
        action: language === 'tl' ? 'Bawasan ang pataba' : 'Reduce fertilizer',
        reason: language === 'tl' ? 'Sobrang sustansya' : 'High salinity',
        priority: 'medium',
        color: 'warning'
      });
    }

    // pH recommendations
    if (sensorData.ph < 5.5) {
      recommendations.push({
        icon: '\u{1F9EA}',
        action: language === 'tl' ? 'Dagdagan ng calcium' : 'Add calciumite',
        reason: language === 'tl' ? 'Masyado asido' : 'Too acidic',
        priority: 'high',
        color: 'error'
      });
    } else if (sensorData.ph > 7.5) {
      recommendations.push({
        icon: '\u{1F9EA}',
        action: language === 'tl' ? 'Maglagay ng sulfur' : 'Apply sulfur',
        reason: language === 'tl' ? 'Masyado alkaline' : 'Too alkaline',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  };

  const recommendations = getRecommendations();
  const overallStatus = getOverallStatus(overallHealthScore);

  // Quick Action Handlers
  const handleMoveArms = async () => {
    setLoadingAction('arms');
    try {
      await CommandService.moveArms(CONFIG.DEVICE_ID);
    } catch (e) {
      console.error('Move arms failed:', e);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const handleMoveHead = async () => {
    setLoadingAction('head');
    try {
      await CommandService.rotateHeadCommand(CONFIG.DEVICE_ID);
    } catch (e) {
      console.error('Move head failed:', e);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const handleSoundAlarm = async () => {
    setLoadingAction('sound');
    try {
      await CommandService.soundAlarm(CONFIG.DEVICE_ID);
    } catch (e) {
      console.error('Sound alarm failed:', e);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  // Quick Action Button Component - Compact for 3-column layout
  const QuickActionButton = ({ icon, title, subtitle, onClick, loading, color = 'brand' }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative overflow-hidden w-full p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300
        ${loading ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer'}
        bg-${color}/5 border-${color}/20 hover:border-${color}/40 hover:bg-${color}/10
        surface-primary
      `}
    >
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}
      <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
        <div className={`
          w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl
          bg-${color}/20
          ${loading ? 'animate-pulse' : ''}
        `}>
          {loading ? '⏳' : icon}
        </div>
        <div>
          <div className="font-bold text-xs sm:text-sm text-primary">
            {title}
          </div>
          <div className="text-[10px] sm:text-xs text-secondary mt-0.5 hidden sm:block">{subtitle}</div>
        </div>
      </div>
    </button>
  );

  // Section Header Component
  const SectionHeader = ({ icon, title }) => (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      <span className="text-base sm:text-lg">{icon}</span>
      <h2 className="text-base sm:text-lg font-bold text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4 bg-secondary">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="flex items-center mb-1 sm:mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-xl sm:text-2xl">🛡️</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                  <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
                </div>
              </div>
            </div>
            <div className={`flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-sm border ${
              isConnected
                ? 'bg-success/10 border-success/30'
                : 'bg-error/10 border-error/30'
            }`}>
              <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full mr-1.5 sm:mr-2 ${
                isConnected ? 'bg-success animate-pulse' : 'bg-error'
              }`} />
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                isConnected ? 'text-success' : 'text-error'
              }`}>
                {isConnected ? t.connected : t.offline}
              </span>
            </div>
          </div>

          {/* Status Cards Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Birds Detected Today */}
            <div className="surface-primary rounded-xl p-3 sm:p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-warning/20 flex items-center justify-center">
                  <span className="text-lg sm:text-xl">🐦</span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-primary">{sensorData.birdsDetectedToday}</div>
                  <div className="text-[10px] sm:text-xs text-secondary">{t.birdsToday}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="surface-primary rounded-xl p-3 sm:p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-info/20 flex items-center justify-center">
                  <span className="text-lg sm:text-xl">🕐</span>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-primary">{formatTime(lastUpdate)}</div>
                  <div className="text-[10px] sm:text-xs text-secondary">{t.lastUpdated}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10">
          {/* Soil Sensor Section */}
          {sensorData.hasRS485Sensor && (
            <div className="mb-4 sm:mb-6">
              <SectionHeader icon="🌱" title={t.soilConditions} />
              <SoilSensorCard
                humidity={sensorData.soilHumidity}
                temperature={sensorData.soilTemperature}
                conductivity={sensorData.soilConductivity}
                ph={sensorData.ph}
                language={language}
              />
            </div>
          )}

          {/* Quick Controls Section */}
          <div className="mb-4 sm:mb-6">
            <SectionHeader icon="⚡" title={t.quickControls} />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <QuickActionButton
                icon="🦾"
                title={t.moveArms}
                subtitle={t.moveArmsDesc}
                onClick={handleMoveArms}
                loading={loadingAction === 'arms'}
                color="brand"
              />
              <QuickActionButton
                icon="🔄"
                title={t.moveHead}
                subtitle={t.moveHeadDesc}
                onClick={handleMoveHead}
                loading={loadingAction === 'head'}
                color="info"
              />
              <QuickActionButton
                icon="🔊"
                title={t.soundAlarm}
                subtitle={t.soundAlarmDesc}
                onClick={handleSoundAlarm}
                loading={loadingAction === 'sound'}
                color="warning"
              />
            </div>
          </div>

          {/* Soil Health Score Card */}
          <div className="mb-4 sm:mb-6">
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
          </div>

          {/* Smart Recommendations Card */}
          <div className="mb-4 sm:mb-6">
            <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Mga Rekomendasyon' : 'Recommendations'}</h3>
                <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                  recommendations.length === 0
                    ? 'bg-success/20 text-success'
                    : recommendations[0]?.priority === 'high'
                      ? 'bg-error/20 text-error'
                      : 'bg-warning/20 text-warning'
                }`}>
                  {recommendations.length === 0
                    ? (language === 'tl' ? 'Lahat OK' : 'All Good')
                    : `${recommendations.length} ${language === 'tl' ? 'aksyon' : 'action'}${recommendations.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {recommendations.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl sm:text-3xl">✅</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-success mb-1">
                    {language === 'tl' ? 'Lahat ng kondisyon ay optimal!' : 'All conditions are optimal!'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-secondary">
                    {language === 'tl' ? 'Walang aksyon na kailangan' : 'No action needed at this time'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-l-4 ${
                        rec.priority === 'high'
                          ? 'bg-error/5 border-error'
                          : rec.priority === 'medium'
                            ? 'bg-warning/5 border-warning'
                            : 'bg-info/5 border-info'
                      }`}
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        rec.priority === 'high'
                          ? 'bg-error/20'
                          : rec.priority === 'medium'
                            ? 'bg-warning/20'
                            : 'bg-info/20'
                      }`}>
                        <span className="text-lg sm:text-xl">{rec.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold ${
                          rec.priority === 'high' ? 'text-error' : rec.priority === 'medium' ? 'text-warning' : 'text-info'
                        }`}>
                          {rec.action}
                        </p>
                        <p className="text-[10px] sm:text-xs text-secondary truncate">{rec.reason}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase ${
                        rec.priority === 'high'
                          ? 'bg-error/20 text-error'
                          : rec.priority === 'medium'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-info/20 text-info'
                      }`}>
                        {rec.priority === 'high' ? (language === 'tl' ? 'Mataas' : 'High') : rec.priority === 'medium' ? (language === 'tl' ? 'Katamtaman' : 'Med') : (language === 'tl' ? 'Mababa' : 'Low')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom info */}
              <div className="pt-3 mt-3 border-t border-primary">
                <p className="text-[10px] sm:text-xs text-secondary leading-relaxed">
                  {language === 'tl'
                    ? 'Batay sa real-time na datos ng sensor ng lupa.'
                    : 'Based on real-time soil sensor data.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
