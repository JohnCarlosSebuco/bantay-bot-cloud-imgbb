import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTour } from '../contexts/TourContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  DualSoilSensorDisplay,
  SoilHealthCard,
  SmartRecommendations,
} from '../components/ui';
import { Shield, Bird, Clock, Sprout, Zap, Cog, RefreshCw, Volume2, Loader2, HelpCircle } from 'lucide-react';
import ConnectionManager from '../services/ConnectionManager';
import CommandService from '../services/CommandService';
import FirebaseService from '../services/FirebaseService';
import DeviceService from '../services/DeviceService';
import notificationService from '../services/NotificationService';
import { CONFIG } from '../config/config';
import { dashboardTourSteps } from '../config/tourSteps';

// Parse timestamp from various formats (number, string like "December 10, 2025 12:03:01 PM")
const parseTimestamp = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'string') {
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

// Count detections that occurred today
const countTodayDetections = (detections) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return detections.filter(detection => {
    const detectionDate = parseTimestamp(detection.timestamp);
    return detectionDate && detectionDate >= todayStart;
  }).length;
};

export default function Dashboard({ language }) {
  const { currentTheme } = useTheme();
  const { startTour, isFirstTimeUser, isTourCompleted } = useTour();
  const { showSuccess, showError } = useNotification();
  const [refreshing, setRefreshing] = useState(false);
  const fadeOpacity = useRef(1);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const lastDataRef = useRef(null); // Track last received sensor data for staleness check

  // Quick action loading states
  const [loadingAction, setLoadingAction] = useState(null);

  // Sensor data state (with dual sensor support)
  const [sensorData, setSensorData] = useState({
    motion: 0,
    headPosition: 90,
    dhtTemperature: 25.5,
    dhtHumidity: 60,
    // Sensor 1 values
    soil1Humidity: 45,
    soil1Temperature: 24.2,
    soil1Conductivity: 850,
    soil1PH: 6.8,
    // Sensor 2 values
    soil2Humidity: 45,
    soil2Temperature: 24.2,
    soil2Conductivity: 850,
    soil2PH: 6.8,
    // Averaged values (backward compatibility)
    soilHumidity: 45,
    soilTemperature: 24.2,
    soilConductivity: 850,
    ph: 6.8,
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
      success: 'Success',
      failed: 'Failed',
      armsSuccess: 'Arms moving!',
      headSuccess: 'Head rotating!',
      alarmSuccess: 'Alarm triggered!',
      commandFailed: 'Command failed. Try again.',
    },
    tl: {
      title: 'BantayBot',
      subtitle: 'Tagabantay ng Tanim',
      connected: 'Nakakonekta',
      offline: 'Wala sa Linya',
      quickControls: 'Mabilisang Kontrol',
      moveArms: 'Braso',
      moveArmsDesc: 'Igalaw braso',
      moveHead: 'Ulo',
      moveHeadDesc: 'Ikutin ulo',
      soundAlarm: 'Alarma',
      soundAlarmDesc: 'Patunugin',
      lastUpdated: 'Huling update',
      birdsToday: 'ibon ngayong araw',
      soilConditions: 'Kalagayan ng Lupa',
      success: 'Tapos na',
      failed: 'Hindi nagawa',
      armsSuccess: 'Gumagalaw ang braso!',
      headSuccess: 'Umiikot ang ulo!',
      alarmSuccess: 'Tumutunog ang alarma!',
      commandFailed: 'Hindi nagawa. Subukan muli.',
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
      setIsConnected(status.connected);
    };

    const handleData = (data) => {
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
      setSensorData({
        motion: data?.motion ? 1 : 0,
        headPosition: safeNumber(data?.headPosition, 0),
        dhtTemperature: safeNumber(data?.dhtTemperature, 0),
        dhtHumidity: safeNumber(data?.dhtHumidity, 0),
        soilHumidity: safeNumber(data?.soilHumidity, 0),
        soilTemperature: safeNumber(data?.soilTemperature, 0),
        soilConductivity: safeNumber(data?.soilConductivity, 0),
        ph: safeNumber(data?.ph, 7.0),
        currentTrack: safeNumber(data?.currentTrack, 1),
        volume: safeNumber(data?.volume, 20),
        audioPlaying: data?.audioPlaying || false,
        leftArmAngle: safeNumber(data?.leftArmAngle, 90),
        rightArmAngle: safeNumber(data?.rightArmAngle, 90),
        oscillating: data?.oscillating || false,
        birdDetectionEnabled: data?.birdDetectionEnabled !== undefined ? data.birdDetectionEnabled : true,
        birdsDetectedToday: safeNumber(data?.birdsDetectedToday, 0),
        detectionSensitivity: safeNumber(data?.detectionSensitivity, 2),
        hasDFPlayer: data?.hasDFPlayer || false,
        hasRS485Sensor: data?.hasRS485Sensor || false,
        hasServos: data?.hasServos || false,
      });
      setLastUpdate(new Date());
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
    const unsubscribeSensor = DeviceService.subscribeToSensorData(CONFIG.DEVICE_ID, (data) => {
      if (data) {
        console.log('📡 Firebase sensor data received:', data);
        const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
        const updatedData = {
          // Sensor 1 values
          soil1Humidity: safeNumber(data.soil1Humidity, data.soilHumidity ?? 0),
          soil1Temperature: safeNumber(data.soil1Temperature, data.soilTemperature ?? 0),
          soil1Conductivity: safeNumber(data.soil1Conductivity, data.soilConductivity ?? 0),
          soil1PH: safeNumber(data.soil1PH, data.ph ?? 7.0),
          // Sensor 2 values
          soil2Humidity: safeNumber(data.soil2Humidity, data.soilHumidity ?? 0),
          soil2Temperature: safeNumber(data.soil2Temperature, data.soilTemperature ?? 0),
          soil2Conductivity: safeNumber(data.soil2Conductivity, data.soilConductivity ?? 0),
          soil2PH: safeNumber(data.soil2PH, data.ph ?? 7.0),
          // Averaged values (backward compatibility)
          soilHumidity: safeNumber(data.soilHumidity, 0),
          soilTemperature: safeNumber(data.soilTemperature, 0),
          soilConductivity: safeNumber(data.soilConductivity, 0),
          ph: safeNumber(data.ph, 7.0),
        };
        setSensorData(prev => ({
          ...prev,
          ...updatedData,
          currentTrack: safeNumber(data.currentTrack, prev.currentTrack),
          volume: safeNumber(data.volume, prev.volume),
          headPosition: safeNumber(data.headPosition, prev.headPosition),
          oscillating: data.servoActive || false,
          hasRS485Sensor: true,
        }));

        // Check if data actually changed (device is sending new readings)
        const dataFingerprint = JSON.stringify({
          s1h: data.soil1Humidity, s1t: data.soil1Temperature,
          s2h: data.soil2Humidity, s2t: data.soil2Temperature,
          last_seen: data.last_seen,
        });
        const prevFingerprint = lastDataRef.current?.fingerprint;

        if (prevFingerprint === undefined) {
          // First snapshot - just store it, don't mark as connected yet
          lastDataRef.current = { fingerprint: dataFingerprint, time: Date.now(), isFirst: true };
        } else if (prevFingerprint !== dataFingerprint) {
          // Data changed after first load - device is actively sending
          lastDataRef.current = { fingerprint: dataFingerprint, time: Date.now() };
          setLastUpdate(new Date());
          setIsConnected(true);
        }

        // Check sensor data for notification triggers (use averaged values)
        notificationService.checkAndNotify(updatedData, language);
        notificationService.checkRecommendations(updatedData, language);
      }
    });

    // Subscribe to Firebase detection history for bird count (only today's detections)
    const unsubscribeDetection = DeviceService.subscribeToDetectionHistory((detections) => {
      const todayCount = countTodayDetections(detections);
      console.log('🐦 Firebase detection history received:', detections.length, 'total,', todayCount, 'today');
      setSensorData(prev => ({
        ...prev,
        birdsDetectedToday: todayCount,
      }));
    }, 500);

    // Staleness check: if no data change in 60s, mark offline
    const stalenessInterval = setInterval(() => {
      if (lastDataRef.current) {
        const elapsed = Date.now() - lastDataRef.current.time;
        if (elapsed > 60000) {
          setIsConnected(false);
        }
      }
    }, 15000);

    return () => {
      ConnectionManager.disconnect();
      if (unsubscribeSensor) unsubscribeSensor();
      if (unsubscribeDetection) unsubscribeDetection();
      clearInterval(stalenessInterval);
    };
  }, [language]);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (isFirstTimeUser && !isTourCompleted('dashboard')) {
      const timer = setTimeout(() => {
        startTour('dashboard', dashboardTourSteps);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTourCompleted, startTour]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Quick Action Handlers
  const handleMoveArms = async () => {
    setLoadingAction('arms');
    try {
      await CommandService.moveArms(CONFIG.DEVICE_ID);
      showSuccess(t.success, t.armsSuccess);
    } catch (e) {
      console.error('Move arms failed:', e);
      showError(t.failed, t.commandFailed);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const handleMoveHead = async () => {
    setLoadingAction('head');
    try {
      await CommandService.rotateHeadCommand(CONFIG.DEVICE_ID);
      showSuccess(t.success, t.headSuccess);
    } catch (e) {
      console.error('Move head failed:', e);
      showError(t.failed, t.commandFailed);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const handleSoundAlarm = async () => {
    setLoadingAction('sound');
    try {
      await CommandService.soundAlarm(CONFIG.DEVICE_ID);
      showSuccess(t.success, t.alarmSuccess);
    } catch (e) {
      console.error('Sound alarm failed:', e);
      showError(t.failed, t.commandFailed);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  // Quick Action Button Component - Compact for 3-column layout
  const QuickActionButton = ({ icon: IconComponent, title, subtitle, onClick, loading, color = 'brand' }) => (
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
          w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center
          bg-${color}/20
          ${loading ? 'animate-pulse' : ''}
        `}>
          {loading ? <Loader2 size={24} className="animate-spin" /> : <IconComponent size={24} />}
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
  const SectionHeader = ({ icon: IconComponent, title }) => (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      <IconComponent size={20} className="text-brand" />
      <h2 className="text-base sm:text-lg font-bold text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div data-tour="dashboard-header" className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4 bg-secondary">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="flex items-center mb-1 sm:mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
                  <Shield size={24} className="text-brand" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                  <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Info Button for Tour */}
              <button
                onClick={() => startTour('dashboard', dashboardTourSteps)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-info/20 flex items-center justify-center hover:bg-info/30 transition-colors"
                aria-label={language === 'tl' ? 'Gabay sa paggamit' : 'Help guide'}
              >
                <HelpCircle size={20} className="text-info" />
              </button>
              {/* Connection Status */}
              <div data-tour="dashboard-connection-status" className={`flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-sm border ${
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
          </div>

          {/* Status Cards Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Birds Detected Today */}
            <div data-tour="dashboard-bird-count" className="surface-primary rounded-xl p-3 sm:p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Bird size={22} className="text-warning" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-primary">{sensorData.birdsDetectedToday}</div>
                  <div className="text-[10px] sm:text-xs text-secondary">{t.birdsToday}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div data-tour="dashboard-last-update" className="surface-primary rounded-xl p-3 sm:p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-info/20 flex items-center justify-center">
                  <Clock size={22} className="text-info" />
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
          {/* Soil Sensor Section - Dual Sensor Display */}
          {sensorData.hasRS485Sensor && (
            <div data-tour="dashboard-soil-sensors" className="mb-4 sm:mb-6">
              <DualSoilSensorDisplay
                sensorData={sensorData}
                language={language}
                showTitle={true}
              />
            </div>
          )}

          {/* Quick Controls Section */}
          <div data-tour="dashboard-quick-controls" className="mb-4 sm:mb-6">
            <SectionHeader icon={Zap} title={t.quickControls} />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <QuickActionButton
                icon={Cog}
                title={t.moveArms}
                subtitle={t.moveArmsDesc}
                onClick={handleMoveArms}
                loading={loadingAction === 'arms'}
                color="brand"
              />
              <QuickActionButton
                icon={RefreshCw}
                title={t.moveHead}
                subtitle={t.moveHeadDesc}
                onClick={handleMoveHead}
                loading={loadingAction === 'head'}
                color="info"
              />
              <QuickActionButton
                icon={Volume2}
                title={t.soundAlarm}
                subtitle={t.soundAlarmDesc}
                onClick={handleSoundAlarm}
                loading={loadingAction === 'sound'}
                color="warning"
              />
            </div>
          </div>

          {/* Soil Health Score Card */}
          <div data-tour="dashboard-soil-health" className="mb-4 sm:mb-6">
            <SoilHealthCard sensorData={sensorData} language={language} />
          </div>

          {/* Smart Recommendations Card */}
          <div data-tour="dashboard-recommendations" className="mb-4 sm:mb-6">
            <SmartRecommendations sensorData={sensorData} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
}
