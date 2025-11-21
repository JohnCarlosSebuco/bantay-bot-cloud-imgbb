import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  SoilSensorCard,
  AudioPlayerControl,
  ServoArmControl,
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
  const fadeOpacity = useRef(1); // Start visible, then animate if needed

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
      liveCamera: 'Live Camera',
      cameraDisabled: 'Camera Temporarily Disabled',
      detectionActive: 'Detection still active',
      birdDetection: 'Bird Detection',
      birdsToday: 'birds today',
      headDirection: 'Head Direction',
      quickActions: 'Quick Actions',
      systemStatus: 'System Status',
      live: 'LIVE',
      disabled: 'DISABLED'
    },
    tl: {
      title: 'BantayBot',
      subtitle: 'Pangbantay ng Pananim',
      connected: 'Konektado',
      offline: 'Offline',
      birds: 'Ibon',
      soil: 'Lupa',
      liveCamera: 'Kamera',
      cameraDisabled: 'Kamera Pansamantala ay Hindi Aktibo',
      detectionActive: 'Pagdetekta ay gumagana pa rin',
      birdDetection: 'Pagbabantay ng Ibon',
      birdsToday: 'ibon ngayong araw',
      headDirection: 'Direksyon ng Ulo',
      quickActions: 'Mabilis na Aksyon',
      systemStatus: 'Katayuan ng Sistema',
      live: 'BUHAY',
      disabled: 'HINDI AKTIBO'
    }
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    // Fade in animation
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

    // Real ConnectionManager integration (matching React Native)
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

    // Initialize services
    const initServices = async () => {
      // Ensure Firebase is initialized for remote command support
      try {
        await FirebaseService.initialize();
        console.log('✅ Firebase ready for remote commands');
      } catch (error) {
        console.warn('⚠️ Firebase initialization warning:', error);
      }

      // Initialize ConnectionManager (auto-detects local or remote mode)
      ConnectionManager.initialize();
    };

    initServices();

    // Listen for connection changes
    ConnectionManager.onConnectionChange(handleConnection);

    // Listen for status updates (sensor data, alerts)
    ConnectionManager.onStatusUpdate(handleData);

    return () => {
      ConnectionManager.disconnect();
    };
  }, [language]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Command handlers (matching React Native)
  const sendCommand = async (command, value = 0) => {
    try {
      await ConnectionManager.sendCommand(command, value);
    } catch (e) {
      console.error('Command failed:', e);
      alert(language === 'tl' ? 'Hindi naipadala ang utos' : 'Could not send command');
    }
  };

  // Audio controls
  const playTrack = (track) => sendCommand('PLAY_TRACK', track);
  const stopAudio = () => sendCommand('STOP_AUDIO');
  const nextTrack = () => sendCommand('NEXT_TRACK');
  const setAudioVolume = (vol) => sendCommand('SET_VOLUME', vol);

  // Servo controls
  const setLeftServo = (angle) => ConnectionManager.sendCommand('SET_SERVO_ANGLE', { servo: 0, value: angle });
  const setRightServo = (angle) => ConnectionManager.sendCommand('SET_SERVO_ANGLE', { servo: 1, value: angle });
  const toggleOscillation = () => sendCommand('TOGGLE_SERVO_OSCILLATION');

  // Now using CSS classes instead of inline styles for better theme reliability

  return (
    <div className="min-h-screen bg-secondary">
      <div className="opacity-100">
        {/* Modern Header */}
        <div className="pt-16 pb-6 px-4 bg-secondary">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-3xl text-brand mr-2">🛡️</span>
                <h1 className="text-4xl font-bold text-primary">{t.title}</h1>
              </div>
              <p className="text-sm text-secondary font-medium">{t.subtitle}</p>
            </div>
            <div className={`flex items-center px-3 py-2 rounded-full shadow-sm ${
              isConnected ? 'bg-success/20' : 'bg-error/20'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-success' : 'bg-error'
              }`}></div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                isConnected ? 'text-success' : 'text-error'
              }`}>
                {isConnected ? t.connected : t.offline}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/*
            <div className="surface-primary rounded-lg p-4 shadow-sm border border-primary text-center">
              <div className="w-10 h-10 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xl mx-auto mb-2">
                🐦
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{sensorData.birdsDetectedToday}</div>
              <div className="text-xs text-secondary font-medium uppercase tracking-wide">{t.birds}</div>
            </div>
            */}
            <div className="surface-primary rounded-lg p-4 shadow-sm border border-primary text-center">
              <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center text-xl mx-auto mb-2">
                🌱
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{sensorData.ph.toFixed(1)}</div>
              <div className="text-xs text-secondary font-medium uppercase tracking-wide">pH</div>
            </div>
            <div className="surface-primary rounded-lg p-4 shadow-sm border border-primary text-center">
              <div className="w-10 h-10 rounded-full bg-info/20 text-info flex items-center justify-center text-xl mx-auto mb-2">
                💧
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{Math.round(sensorData.soilHumidity)}%</div>
              <div className="text-xs text-secondary font-medium uppercase tracking-wide">{t.soil}</div>
            </div>
          </div>
        </div>

        <div className="p-4 pb-24">
          {/*
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-primary">{t.liveCamera}</h2>
              <button
                onClick={refreshStream}
                className="p-2 rounded-md bg-border border-0 text-lg text-secondary cursor-pointer"
              >
                🔄
              </button>
            </div>

            <div className="surface-primary rounded-xl p-4 shadow-md border border-primary">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center px-2 py-1 rounded-md bg-secondary/20">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wide">{t.disabled}</span>
                </div>
                <span className="text-xs text-secondary">
                  {formatTime(lastUpdate)}
                </span>
              </div>

              <div className="rounded-lg overflow-hidden bg-border aspect-video mb-3 flex flex-col items-center justify-center">
                <span className="text-6xl text-secondary">📷</span>
                <span className="text-base font-semibold mt-3 text-secondary text-center">{t.cameraDisabled}</span>
                <span className="text-xs mt-2 text-secondary text-center">
                  {t.detectionActive}
                </span>
              </div>

              <div className="flex items-center text-xs text-secondary">
                <span className="mr-1">📶</span>
                <span>{CONFIG.ESP32_IP}:81/stream</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <StatusIndicator
              status={sensorData.birdDetectionEnabled ? 'online' : 'warning'}
              label={t.birdDetection}
              value={`${sensorData.birdsDetectedToday} ${t.birdsToday}`}
              lastUpdate={lastUpdate.toISOString()}
              language={language}
              size="medium"
              className="w-full"
            />
          </div>

          <DetectionControls
            detectionEnabled={sensorData.birdDetectionEnabled}
            onDetectionToggle={() => sendCommand('TOGGLE_DETECTION')}
            sensitivity={sensorData.detectionSensitivity}
            onSensitivityChange={(value) => sendCommand('SET_SENSITIVITY', value)}
            birdsDetectedToday={sensorData.birdsDetectedToday}
            onResetCount={() => sendCommand('RESET_BIRD_COUNT')}
            className="mb-6"
          />

          <CameraSettings
            brightness={cameraBrightness}
            contrast={cameraContrast}
            onBrightnessChange={(value) => {
              setCameraBrightness(value);
              sendCommand('SET_BRIGHTNESS', value);
            }}
            onContrastChange={(value) => {
              setCameraContrast(value);
              sendCommand('SET_CONTRAST', value);
            }}
            grayscaleMode={grayscaleMode}
            onGrayscaleToggle={() => {
              setGrayscaleMode(!grayscaleMode);
              sendCommand('TOGGLE_GRAYSCALE');
            }}
            language={language}
            className="mb-6"
          />
          */}

          {/* Soil Sensor */}
          {sensorData.hasRS485Sensor && (
            <SoilSensorCard
              humidity={sensorData.soilHumidity}
              temperature={sensorData.soilTemperature}
              conductivity={sensorData.soilConductivity}
              ph={sensorData.ph}
              language={language}
              className="mb-6"
            />
          )}

          {/* Audio Player */}
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

          {/* Servo Arms */}
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

          {/* Head Direction */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-primary">{t.headDirection}</h2>
              <span className="text-sm text-secondary">
                {Math.round(sensorData.headPosition)}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}