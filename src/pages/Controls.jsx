import React, { useState, useEffect } from 'react';
import CommandService from '../services/CommandService';
import DeviceService from '../services/DeviceService';
import { DEVICE_CONFIG, AUDIO_CONFIG } from '../config/hardware.config';
import { translations } from '../i18n/translations';
import {
  AudioPlayerControl,
  ServoArmControl,
  MotorControlPanel,
  StatusIndicator
} from '../components/ui';

export default function Controls({ language }) {
  const [mainData, setMainData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [servoMoving, setServoMoving] = useState(false);
  const [motorStatus, setMotorStatus] = useState({
    waterPump: false,
    fan: false
  });
  const t = translations[language];

  useEffect(() => {
    const unsub = DeviceService.subscribeToSensorData(
      DEVICE_CONFIG.MAIN_DEVICE_ID,
      setMainData
    );
    return unsub;
  }, []);

  // Enhanced audio control handlers
  const handleAudioPlay = async () => {
    setIsLoading(true);
    try {
      await CommandService.playAudio(DEVICE_CONFIG.MAIN_DEVICE_ID);
      setAudioPlaying(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioStop = async () => {
    setIsLoading(true);
    try {
      await CommandService.stopAudio(DEVICE_CONFIG.MAIN_DEVICE_ID);
      setAudioPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeChange = async (volume) => {
    try {
      await CommandService.setVolume(DEVICE_CONFIG.MAIN_DEVICE_ID, volume);
    } catch (error) {
      console.error('Volume control not implemented:', error);
    }
  };

  // Enhanced servo control handlers
  const handleServoPositionChange = async (position) => {
    setServoMoving(true);
    try {
      if (position === 0) {
        await CommandService.rotateLeft(DEVICE_CONFIG.MAIN_DEVICE_ID);
      } else if (position === 90) {
        await CommandService.rotateCenter(DEVICE_CONFIG.MAIN_DEVICE_ID);
      } else if (position === 180) {
        await CommandService.rotateRight(DEVICE_CONFIG.MAIN_DEVICE_ID);
      }
    } finally {
      setTimeout(() => setServoMoving(false), 2000); // Simulate movement time
    }
  };

  const handleServoPresetMove = async (position, name) => {
    setServoMoving(true);
    try {
      if (name === (language === 'tl' ? 'Kaliwa' : 'Left')) {
        await CommandService.rotateLeft(DEVICE_CONFIG.MAIN_DEVICE_ID);
      } else if (name === (language === 'tl' ? 'Gitna' : 'Center')) {
        await CommandService.rotateCenter(DEVICE_CONFIG.MAIN_DEVICE_ID);
      } else if (name === (language === 'tl' ? 'Kanan' : 'Right')) {
        await CommandService.rotateRight(DEVICE_CONFIG.MAIN_DEVICE_ID);
      }
    } finally {
      setTimeout(() => setServoMoving(false), 2000);
    }
  };

  // Enhanced motor control handlers
  const handleWaterPumpToggle = async () => {
    setIsLoading(true);
    try {
      if (motorStatus.waterPump) {
        await CommandService.stopMotor(DEVICE_CONFIG.MAIN_DEVICE_ID, 'water_pump');
      } else {
        await CommandService.startMotor(DEVICE_CONFIG.MAIN_DEVICE_ID, 'water_pump');
      }
      setMotorStatus(prev => ({ ...prev, waterPump: !prev.waterPump }));
    } catch (error) {
      console.error('Water pump control not implemented:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFanToggle = async () => {
    setIsLoading(true);
    try {
      if (motorStatus.fan) {
        await CommandService.stopMotor(DEVICE_CONFIG.MAIN_DEVICE_ID, 'fan');
      } else {
        await CommandService.startMotor(DEVICE_CONFIG.MAIN_DEVICE_ID, 'fan');
      }
      setMotorStatus(prev => ({ ...prev, fan: !prev.fan }));
    } catch (error) {
      console.error('Fan control not implemented:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllStop = async () => {
    setIsLoading(true);
    try {
      await CommandService.stopAllMotors(DEVICE_CONFIG.MAIN_DEVICE_ID);
      setMotorStatus({ waterPump: false, fan: false });
    } catch (error) {
      console.error('All stop not implemented:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Arms control handlers
  const handleArmsOscillate = async () => {
    setServoMoving(true);
    try {
      await CommandService.oscillateArms(DEVICE_CONFIG.MAIN_DEVICE_ID);
    } finally {
      setTimeout(() => setServoMoving(false), 5000); // Longer for oscillation
    }
  };

  const handleArmsStop = async () => {
    await CommandService.stopOscillate(DEVICE_CONFIG.MAIN_DEVICE_ID);
    setServoMoving(false);
  };

  const handleArmsRest = async () => {
    setServoMoving(true);
    try {
      await CommandService.armsRest(DEVICE_CONFIG.MAIN_DEVICE_ID);
    } finally {
      setTimeout(() => setServoMoving(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-secondary p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          🎮 {language === 'tl' ? 'MGA KONTROL' : 'CONTROLS'}
        </h1>
        <p className="text-secondary">
          {language === 'tl' ? 'Remote device management' : 'Remote device management'}
        </p>
      </div>

      {/* System Status */}
      <div className="mb-6">
        <StatusIndicator
          status="online"
          label={language === 'tl' ? 'BantayBot Main System' : 'BantayBot Main System'}
          lastUpdate={new Date().toISOString()}
          connectionStrength={95}
          batteryLevel={82}
          temperature={32}
          language={language}
          size="large"
          className="w-full"
        />
      </div>

      {/* Control Panels */}
      <div className="space-y-6">
        {/* Audio Control */}
        <AudioPlayerControl
          isPlaying={audioPlaying}
          isLoading={isLoading}
          onPlay={handleAudioPlay}
          onStop={handleAudioStop}
          currentVolume={mainData.volume || AUDIO_CONFIG.DEFAULT_VOLUME}
          onVolumeChange={handleVolumeChange}
          language={language}
          className="w-full"
        />

        {/* Servo Arm Control */}
        <ServoArmControl
          currentPosition={mainData.head_position || 90}
          isMoving={servoMoving}
          onPositionChange={handleServoPositionChange}
          onPresetMove={handleServoPresetMove}
          language={language}
          className="w-full"
        />

        {/* Motor Control Panel */}
        <MotorControlPanel
          waterPumpStatus={motorStatus.waterPump}
          fanStatus={motorStatus.fan}
          onWaterPumpToggle={handleWaterPumpToggle}
          onFanToggle={handleFanToggle}
          onAllStop={handleAllStop}
          isLoading={isLoading}
          language={language}
          className="w-full"
        />

        {/* Advanced Servo Arms Control */}
        <div className="bg-primary rounded-2xl p-6 shadow-lg border border-primary hover-lift transition-all animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center">
              <span className="text-2xl">🦾</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">
                {language === 'tl' ? 'ADVANCED ARMS CONTROL' : 'ADVANCED ARMS CONTROL'}
              </h3>
              <p className="text-sm text-secondary">
                {language === 'tl' ? 'Servo arms oscillation control' : 'Servo arms oscillation control'}
              </p>
            </div>
          </div>

          {/* Arms Status */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-tertiary rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-lg font-bold text-primary">{mainData.left_arm_angle || 90}°</div>
              <div className="text-xs text-secondary">
                {language === 'tl' ? 'Kaliwang kamay' : 'Left Arm'}
              </div>
            </div>
            <div className="bg-tertiary rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-lg font-bold text-primary">{mainData.right_arm_angle || 90}°</div>
              <div className="text-xs text-secondary">
                {language === 'tl' ? 'Kanang kamay' : 'Right Arm'}
              </div>
            </div>
          </div>

          {/* Arms Control Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleArmsOscillate}
              disabled={isLoading || servoMoving}
              className="p-4 bg-success text-white rounded-xl font-semibold hover:bg-success/90 transition-all focus-ring disabled:opacity-50 hover-lift"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xl">🔄</span>
                <span className="text-sm">
                  {language === 'tl' ? 'Oscillate' : 'Oscillate'}
                </span>
              </div>
            </button>
            <button
              onClick={handleArmsStop}
              disabled={isLoading}
              className="p-4 bg-error text-white rounded-xl font-semibold hover:bg-error/90 transition-all focus-ring disabled:opacity-50 hover-lift"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xl">⏹️</span>
                <span className="text-sm">
                  {language === 'tl' ? 'Tigil' : 'Stop'}
                </span>
              </div>
            </button>
            <button
              onClick={handleArmsRest}
              disabled={isLoading || servoMoving}
              className="p-4 bg-info text-white rounded-xl font-semibold hover:bg-info/90 transition-all focus-ring disabled:opacity-50 hover-lift"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xl">😴</span>
                <span className="text-sm">
                  {language === 'tl' ? 'Pahinga' : 'Rest'}
                </span>
              </div>
            </button>
          </div>

          {/* Status indicator */}
          {servoMoving && (
            <div className="mt-4 p-3 bg-warning/10 rounded-xl border border-warning/20">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin"></div>
                <span className="text-warning font-medium">
                  {language === 'tl' ? 'Gumagalaw ang mga braso...' : 'Arms are moving...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
