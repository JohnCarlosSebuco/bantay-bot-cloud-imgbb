import React, { useState, useCallback } from 'react';
import { Gamepad2, Check, Cog, Square, Volume2, Megaphone, Music, Settings, Wrench, RefreshCw, AlertTriangle, OctagonX, Loader2, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useVolume } from '../contexts/VolumeContext';
import {
  AudioPlayerControl,
  HeadControlPanel
} from '../components/ui';
import CommandService from '../services/CommandService';
import { CONFIG } from '../config/config';

export default function Controls({ language }) {
  const { currentTheme } = useTheme();
  const { volume, setVolume } = useVolume();
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);

  // Audio controls state
  const [audioPlaying, setAudioPlaying] = useState(false);
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

  const handleVolumeChange = (newVolume) => {
    // VolumeContext handles debounce and sending to device
    setVolume(newVolume);
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
  const ControlBtn = ({ icon: IconComponent, title, desc, onClick, loading, color = 'brand', danger = false }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative w-full p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 text-left
        ${loading ? 'opacity-60 cursor-wait' : 'hover:shadow-md active:scale-[0.98] cursor-pointer'}
        ${danger
          ? 'bg-error/5 border-error/30 hover:bg-error/10 hover:border-error/50'
          : 'surface-primary border-primary hover:border-brand/30'
        }
      `}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0
          ${danger ? 'bg-error/20' : `bg-${color}/20`}
          ${loading ? 'animate-pulse' : ''}
        `}>
          {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <IconComponent size={24} className={danger ? 'text-error' : `text-${color}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm sm:text-base ${danger ? 'text-error' : 'text-primary'}`}>
            {title}
          </div>
          <div className="text-xs sm:text-sm text-secondary truncate">{desc}</div>
        </div>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${danger ? 'bg-error/10' : 'bg-tertiary'}`}>
          <ChevronRight size={18} className="text-secondary" />
        </div>
      </div>
    </button>
  );

  // Section Header Component
  const SectionHeader = ({ icon: IconComponent, title, color = 'brand', first = false }) => (
    <div className={`flex items-center gap-2 mb-2 sm:mb-3 ${first ? 'mt-0' : 'mt-4 sm:mt-6'}`}>
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-${color}/20 flex items-center justify-center`}>
        <IconComponent size={16} className={`text-${color}`} />
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
              <Gamepad2 size={24} className="text-brand" />
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
                <Check size={14} className="text-success" />
                <span className="text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wide">{t.lastCommand}</span>
              </div>
              <div className="font-bold text-sm sm:text-base text-primary">{getCommandDisplayName(lastCommand.command)}</div>
              <div className="text-[10px] sm:text-xs text-secondary font-mono">{t.executedAt} {formatTime(lastCommand.timestamp)}</div>
            </div>
          )}

          {/* Movement Controls */}
          <SectionHeader icon={Cog} title={t.movementControls} color="brand" first={!lastCommand} />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon={Cog}
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
              icon={Square}
              title={t.stopMovement}
              desc={t.stopMovementDesc}
              onClick={() => executeCommand('STOP_MOVEMENT')}
              loading={loadingStates.STOP_MOVEMENT}
              color="warning"
            />
          </div>

          {/* Alert Controls */}
          <SectionHeader icon={Volume2} title={t.alertControls} color="warning" />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon={Megaphone}
              title={t.soundAlarm}
              desc={t.soundAlarmDesc}
              onClick={() => executeCommand('SOUND_ALARM')}
              loading={loadingStates.SOUND_ALARM}
              color="error"
            />
          </div>

          {/* Audio Controls */}
          <SectionHeader icon={Music} title="Audio" color="info" />
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
          <SectionHeader icon={Settings} title={t.systemControls} color="success" />
          <div className="space-y-2 sm:space-y-3">
            <ControlBtn
              icon={Wrench}
              title={t.calibrateSensors}
              desc={t.calibrateSensorsDesc}
              onClick={() => executeCommand('CALIBRATE_SENSORS')}
              loading={loadingStates.CALIBRATE_SENSORS}
              color="success"
            />
            <ControlBtn
              icon={RefreshCw}
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
              <AlertTriangle size={22} className="text-error" />
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
                {loadingStates.STOP_MOVEMENT ? <Loader2 size={20} className="animate-spin" /> : <OctagonX size={20} />}
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
