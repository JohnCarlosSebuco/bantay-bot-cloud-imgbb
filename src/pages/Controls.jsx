import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  AudioPlayerControl,
  HeadControlPanel
} from '../components/ui';
import CommandService from '../services/CommandService';
import { CONFIG } from '../config/config';

export default function Controls({ language }) {
  const { currentTheme } = useTheme();
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);

  // Audio controls state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [volume, setVolume] = useState(20);
  const [headTargetAngle, setHeadTargetAngle] = useState(0);
  const [headLoadingAngle, setHeadLoadingAngle] = useState(null);

  const texts = {
    en: {
      title: 'Controls',
      subtitle: 'Control your BantayBot',
      lastCommand: 'Last Command',
      executedAt: 'at',
      movementControls: 'Movement',
      alertControls: 'Alerts',
      systemControls: 'System',
      moveArms: 'Move Arms',
      moveArmsDesc: 'Activate arm movement',
      stopMovement: 'Stop All',
      stopMovementDesc: 'Stop all motors',
      soundAlarm: 'Sound Alarm',
      soundAlarmDesc: 'Trigger audio alert',
      testBuzzer: 'Test Buzzer',
      testBuzzerDesc: 'Quick buzzer test',
      calibrateSensors: 'Calibrate',
      calibrateSensorsDesc: 'Recalibrate sensors',
      resetSystem: 'Reset',
      resetSystemDesc: 'Restart BantayBot',
      emergencyStop: 'EMERGENCY STOP',
      emergencyStopDesc: 'Stop all operations immediately',
      confirmReset: 'This will restart the entire BantayBot system. Continue?',
      confirmEmergencyStop: 'This will immediately stop all operations. Continue?',
      success: 'Success',
      failed: 'Failed',
      successMessage: 'completed successfully!',
      failedMessage: 'Please try again.'
    },
    tl: {
      title: 'Mga Kontrol',
      subtitle: 'Kontrolin ang BantayBot',
      lastCommand: 'Huling Utos',
      executedAt: 'noong',
      movementControls: 'Galaw',
      alertControls: 'Alarma',
      systemControls: 'Sistema',
      moveArms: 'Galaw Braso',
      moveArmsDesc: 'I-activate ang braso',
      stopMovement: 'Ihinto',
      stopMovementDesc: 'Ihinto ang motors',
      soundAlarm: 'Alarma',
      soundAlarmDesc: 'I-trigger ang tunog',
      testBuzzer: 'Test Buzzer',
      testBuzzerDesc: 'Mabilis na test',
      calibrateSensors: 'Calibrate',
      calibrateSensorsDesc: 'I-calibrate sensors',
      resetSystem: 'Reset',
      resetSystemDesc: 'I-restart ang BantayBot',
      emergencyStop: 'EMERGENCY STOP',
      emergencyStopDesc: 'Ihinto kaagad ang lahat',
      confirmReset: 'Ire-restart nito ang buong sistema. Magpatuloy?',
      confirmEmergencyStop: 'Ihihinto nito ang lahat ng operasyon. Magpatuloy?',
      success: 'Tagumpay',
      failed: 'Nabigo',
      successMessage: 'matagumpay!',
      failedMessage: 'Subukan muli.'
    }
  };

  const t = texts[language] || texts.en;

  const setLoading = (command, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [command]: isLoading }));
  };

  const showAlert = (title, message) => {
    alert(`${title}\n\n${message}`);
  };

  const getCommandDisplayName = (command) => {
    const names = {
      MOVE_ARMS: t.moveArms,
      STOP_MOVEMENT: t.stopMovement,
      SOUND_ALARM: t.soundAlarm,
      TEST_BUZZER: t.testBuzzer,
      RESET_SYSTEM: t.resetSystem,
      CALIBRATE_SENSORS: t.calibrateSensors
    };
    return names[command] || command;
  };

  const executeCommand = async (command, confirmMsg = null) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setLoading(command, true);
    setLastCommand({ command, timestamp: new Date() });

    try {
      switch (command) {
        case 'MOVE_ARMS':
          await CommandService.moveArms(CONFIG.DEVICE_ID);
          break;
        case 'STOP_MOVEMENT':
          await CommandService.stopMovement(CONFIG.DEVICE_ID);
          break;
        case 'SOUND_ALARM':
          await CommandService.soundAlarm(CONFIG.DEVICE_ID);
          break;
        case 'TEST_BUZZER':
          await CommandService.testBuzzer(CONFIG.DEVICE_ID);
          break;
        case 'RESET_SYSTEM':
          await CommandService.resetSystem(CONFIG.DEVICE_ID);
          break;
        case 'CALIBRATE_SENSORS':
          await CommandService.calibrateSensors(CONFIG.DEVICE_ID);
          break;
        default:
          throw new Error('Unknown command');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      showAlert(t.success, `${getCommandDisplayName(command)} ${t.successMessage}`);
    } catch (error) {
      showAlert(t.failed, `${getCommandDisplayName(command)} ${t.failedMessage}`);
    } finally {
      setLoading(command, false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
  };

  // Audio handlers
  const handleAudioPlay = async () => {
    try {
      await CommandService.playAudio(CONFIG.DEVICE_ID);
      setAudioPlaying(true);
    } catch (error) {
      console.error('Audio play failed:', error);
    }
  };

  const handleAudioStop = async () => {
    try {
      await CommandService.stopAudio(CONFIG.DEVICE_ID);
      setAudioPlaying(false);
    } catch (error) {
      console.error('Audio stop failed:', error);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      await CommandService.setVolume(CONFIG.DEVICE_ID, newVolume);
      setVolume(newVolume);
    } catch (error) {
      console.error('Volume change failed:', error);
    }
  };

  const handleHeadAngleSelect = async (angle) => {
    setHeadLoadingAngle(angle);
    try {
      await CommandService.rotateHeadCommand(CONFIG.DEVICE_ID, angle);
      setHeadTargetAngle(angle);
    } catch (error) {
      console.error('Head rotation failed:', error);
    } finally {
      setHeadLoadingAngle(null);
    }
  };

  // Control Button Component
  const ControlBtn = ({ icon, title, desc, onClick, loading, color = 'brand', danger = false }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left
        ${loading ? 'opacity-60 cursor-wait' : 'hover:shadow-md active:scale-[0.98] cursor-pointer'}
        ${danger
          ? 'bg-error/5 border-error/30 hover:bg-error/10 hover:border-error/50'
          : 'surface-primary border-primary hover:border-brand/30'
        }
      `}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`
          w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0
          ${danger ? 'bg-error/20' : `bg-${color}/20`}
          ${loading ? 'animate-pulse' : ''}
        `}>
          {loading ? '⏳' : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-xs sm:text-sm ${danger ? 'text-error' : 'text-primary'}`}>
            {title}
          </div>
          <div className="text-[10px] sm:text-xs text-secondary truncate">{desc}</div>
        </div>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${danger ? 'bg-error/10' : 'bg-tertiary'}`}>
          <span className="text-secondary text-xs sm:text-sm">→</span>
        </div>
      </div>
    </button>
  );

  // Section Header Component
  const SectionHeader = ({ icon, title, color = 'brand' }) => (
    <div className="flex items-center gap-2 mb-2 sm:mb-3 mt-4 sm:mt-6">
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-${color}/20 flex items-center justify-center`}>
        <span className="text-sm sm:text-base">{icon}</span>
      </div>
      <h2 className="text-sm sm:text-base font-bold text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4 bg-secondary">
          <div className="flex items-center mb-1 sm:mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-xl sm:text-2xl">🎮</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
              <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10">
          {/* Last Command Status */}
          {lastCommand && (
            <div className="surface-primary rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-success shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-success text-sm">✓</span>
                <span className="text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wide">{t.lastCommand}</span>
              </div>
              <div className="font-bold text-sm sm:text-base text-primary">{getCommandDisplayName(lastCommand.command)}</div>
              <div className="text-[10px] sm:text-xs text-secondary font-mono">{t.executedAt} {formatTime(lastCommand.timestamp)}</div>
            </div>
          )}

          {/* Movement Controls */}
          <SectionHeader icon="🦾" title={t.movementControls} color="brand" />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon="🦾"
              title={t.moveArms}
              desc={t.moveArmsDesc}
              onClick={() => executeCommand('MOVE_ARMS')}
              loading={loadingStates.MOVE_ARMS}
              color="brand"
            />
            <HeadControlPanel
              language={language}
              currentAngle={headTargetAngle}
              loadingAngle={headLoadingAngle}
              onAngleSelect={handleHeadAngleSelect}
            />
            <ControlBtn
              icon="⏹️"
              title={t.stopMovement}
              desc={t.stopMovementDesc}
              onClick={() => executeCommand('STOP_MOVEMENT')}
              loading={loadingStates.STOP_MOVEMENT}
              color="warning"
            />
          </div>

          {/* Alert Controls */}
          <SectionHeader icon="🔊" title={t.alertControls} color="warning" />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon="📢"
              title={t.soundAlarm}
              desc={t.soundAlarmDesc}
              onClick={() => executeCommand('SOUND_ALARM')}
              loading={loadingStates.SOUND_ALARM}
              color="error"
            />
            <ControlBtn
              icon="🔔"
              title={t.testBuzzer}
              desc={t.testBuzzerDesc}
              onClick={() => executeCommand('TEST_BUZZER')}
              loading={loadingStates.TEST_BUZZER}
              color="warning"
            />
          </div>

          {/* Audio Controls */}
          <SectionHeader icon="🎵" title="Audio" color="info" />
          <AudioPlayerControl
            isPlaying={audioPlaying}
            isLoading={loadingStates.audio}
            onPlay={handleAudioPlay}
            onStop={handleAudioStop}
            currentVolume={volume}
            onVolumeChange={handleVolumeChange}
            language={language}
          />

          {/* System Controls */}
          <SectionHeader icon="⚙️" title={t.systemControls} color="success" />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon="🔧"
              title={t.calibrateSensors}
              desc={t.calibrateSensorsDesc}
              onClick={() => executeCommand('CALIBRATE_SENSORS')}
              loading={loadingStates.CALIBRATE_SENSORS}
              color="success"
            />
            <ControlBtn
              icon="🔄"
              title={t.resetSystem}
              desc={t.resetSystemDesc}
              onClick={() => executeCommand('RESET_SYSTEM', t.confirmReset)}
              loading={loadingStates.RESET_SYSTEM}
              color="info"
            />
          </div>

          {/* Emergency Stop */}
          <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-2xl bg-error/5 border-2 border-error/30">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl">⚠️</span>
              <span className="font-bold text-error text-sm sm:text-base">Emergency</span>
            </div>
            <button
              onClick={() => executeCommand('STOP_MOVEMENT', t.confirmEmergencyStop)}
              disabled={loadingStates.STOP_MOVEMENT}
              className={`
                w-full py-3 sm:py-4 rounded-xl font-bold text-white transition-all text-sm sm:text-base
                ${loadingStates.STOP_MOVEMENT
                  ? 'bg-error/50 cursor-wait'
                  : 'bg-error hover:bg-error/90 active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-xl'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg sm:text-xl">{loadingStates.STOP_MOVEMENT ? '⏳' : '🛑'}</span>
                <span>{t.emergencyStop}</span>
              </div>
            </button>
            <p className="text-[10px] sm:text-xs text-error/70 text-center mt-2">{t.emergencyStopDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
