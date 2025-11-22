import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  SoilSensorCard,
  // AudioPlayerControl,
  // ServoArmControl,
  // StatusIndicator,
  // DetectionControls,
  // CameraSettings
} from '../components/ui';
import ConnectionManager from '../services/ConnectionManager';
import CommandService from '../services/CommandService';
import FirebaseService from '../services/FirebaseService';
import { CONFIG } from '../config/config';

export default function Dashboard({ language }) {
  const { currentTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const fadeOpacity = useRef(1);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Quick action loading states
  const [loadingAction, setLoadingAction] = useState(null);

  // Sensor data state matching React Native
  const [sensorData, setSensorData] = useState({
    motion: 0,
    headPosition: 90,
    dhtTemperature: 25.5,
    dhtHumidity: 60,
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
      birds: 'Birds',
      soil: 'Soil',
      quickControls: 'Quick Controls',
      moveArms: 'Move Arms',
      moveArmsDesc: 'Activate arm movement',
      moveHead: 'Move Head',
      moveHeadDesc: 'Rotate head position',
      soundAlarm: 'Sound Alarm',
      soundAlarmDesc: 'Trigger audio alert',
      detection: 'Detection',
      detectionOn: 'Active',
      detectionOff: 'Inactive',
      systemStatus: 'System Status',
      lastUpdated: 'Last updated',
      birdsToday: 'birds detected today',
      soilConditions: 'Soil Conditions',
    },
    tl: {
      title: 'BantayBot',
      subtitle: 'Pangbantay ng Pananim',
      connected: 'Konektado',
      offline: 'Offline',
      birds: 'Ibon',
      soil: 'Lupa',
      quickControls: 'Mabilis na Kontrol',
      moveArms: 'Galaw Braso',
      moveArmsDesc: 'I-activate ang braso',
      moveHead: 'Galaw Ulo',
      moveHeadDesc: 'I-ikot ang ulo',
      soundAlarm: 'Alarma',
      soundAlarmDesc: 'I-trigger ang tunog',
      detection: 'Deteksyon',
      detectionOn: 'Aktibo',
      detectionOff: 'Hindi Aktibo',
      systemStatus: 'Katayuan ng Sistema',
      lastUpdated: 'Huling update',
      birdsToday: 'ibon na nakita ngayon',
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
        console.log('✅ Firebase ready for remote commands');
      } catch (error) {
        console.warn('⚠️ Firebase initialization warning:', error);
      }
      ConnectionManager.initialize();
    };

    initServices();
    ConnectionManager.onConnectionChange(handleConnection);
    ConnectionManager.onStatusUpdate(handleData);

    return () => {
      ConnectionManager.disconnect();
    };
  }, [language]);

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

  const handleToggleDetection = async () => {
    setLoadingAction('detection');
    try {
      await ConnectionManager.sendCommand('TOGGLE_DETECTION');
    } catch (e) {
      console.error('Toggle detection failed:', e);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  // Quick Action Button Component
  const QuickActionButton = ({ icon, title, subtitle, onClick, loading, color = 'brand', status = null }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative overflow-hidden w-full p-4 rounded-2xl border-2 transition-all duration-300
        ${loading ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer'}
        ${status === 'active'
          ? 'bg-success/10 border-success shadow-md'
          : status === 'inactive'
          ? 'bg-error/10 border-error/50'
          : `bg-${color}/5 border-${color}/20 hover:border-${color}/40 hover:bg-${color}/10`
        }
        surface-primary
      `}
    >
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}
      <div className="flex flex-col items-center text-center gap-2">
        <div className={`
          w-14 h-14 rounded-xl flex items-center justify-center text-2xl
          ${status === 'active'
            ? 'bg-success/20'
            : status === 'inactive'
            ? 'bg-error/20'
            : `bg-${color}/20`
          }
          ${loading ? 'animate-pulse' : ''}
        `}>
          {loading ? '⏳' : icon}
        </div>
        <div>
          <div className={`font-bold text-sm ${status === 'active' ? 'text-success' : status === 'inactive' ? 'text-error' : 'text-primary'}`}>
            {title}
          </div>
          <div className="text-xs text-secondary mt-0.5">{subtitle}</div>
        </div>
        {status && (
          <div className={`
            px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide
            ${status === 'active' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}
          `}>
            {status === 'active' ? t.detectionOn : t.detectionOff}
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <div className="opacity-100">
        {/* Modern Header */}
        <div className="pt-16 pb-4 px-4 bg-secondary">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-3">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
                  <p className="text-sm text-secondary">{t.subtitle}</p>
                </div>
              </div>
            </div>
            <div className={`flex items-center px-3 py-2 rounded-xl shadow-sm border ${
              isConnected
                ? 'bg-success/10 border-success/30'
                : 'bg-error/10 border-error/30'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
                isConnected ? 'bg-success animate-pulse' : 'bg-error'
              }`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isConnected ? 'text-success' : 'text-error'
              }`}>
                {isConnected ? t.connected : t.offline}
              </span>
            </div>
          </div>

          {/* Status Cards Row */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            {/* Birds Detected Today */}
            <div className="surface-primary rounded-xl p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-warning/20 flex items-center justify-center">
                  <span className="text-xl">🐦</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{sensorData.birdsDetectedToday}</div>
                  <div className="text-xs text-secondary">{t.birdsToday}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="surface-primary rounded-xl p-4 shadow-sm border border-primary">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-info/20 flex items-center justify-center">
                  <span className="text-xl">🕐</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{formatTime(lastUpdate)}</div>
                  <div className="text-xs text-secondary">{t.lastUpdated}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-24">
          {/* Soil Sensor Section */}
          {sensorData.hasRS485Sensor && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🌱</span>
                <h2 className="text-lg font-bold text-primary">{t.soilConditions}</h2>
              </div>
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
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚡</span>
              <h2 className="text-lg font-bold text-primary">{t.quickControls}</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
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

          {/* Commented out sections for future use

          {sensorData.hasDFPlayer && (
            <AudioPlayerControl
              currentTrack={sensorData.currentTrack}
              isPlaying={sensorData.audioPlaying}
              onPlay={() => playTrack(sensorData.currentTrack)}
              onStop={stopAudio}
              onNext={nextTrack}
              currentVolume={sensorData.volume}
              onVolumeChange={setAudioVolume}
              language={language}
              className="mb-6"
            />
          )}

          {sensorData.hasServos && (
            <ServoArmControl
              leftArmAngle={sensorData.leftArmAngle}
              rightArmAngle={sensorData.rightArmAngle}
              oscillating={sensorData.oscillating}
              onLeftChange={setLeftServo}
              onRightChange={setRightServo}
              onToggleOscillation={toggleOscillation}
              lang={language}
              className="mb-6"
            />
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-primary">{t.headDirection}</h2>
              <span className="text-sm text-secondary">
                {Math.round(sensorData.headPosition)}°
              </span>
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
