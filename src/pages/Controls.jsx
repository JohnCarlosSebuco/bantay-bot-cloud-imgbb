import React, { useState, useEffect } from 'react';
import { Gamepad2, Check, Cog, Square, Volume2, Megaphone, Settings, Wrench, RefreshCw, AlertTriangle, OctagonX, Loader2, ChevronRight, HelpCircle } from 'lucide-react';
import { useVolume } from '../contexts/VolumeContext';
import { useTour } from '../contexts/TourContext';
import { useNotification } from '../contexts/NotificationContext';
import { HeadControlPanel } from '../components/ui';
import CommandService from '../services/CommandService';
import { CONFIG } from '../config/config';
import { controlsTourSteps } from '../config/tourSteps';

export default function Controls({ language }) {
  const { volume, setVolume, commitVolume } = useVolume();
  const { startTour, isFirstTimeUser, isTourCompleted } = useTour();
  const { showSuccess, showError, confirm } = useNotification();
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);

  const [headTargetAngle, setHeadTargetAngle] = useState(0);
  const [headLoadingAngle, setHeadLoadingAngle] = useState(null);
  const [testingSpeaker, setTestingSpeaker] = useState(false);

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
      warning: 'Warning',
      success: 'Success',
      failed: 'Failed',
      successMessage: 'completed successfully!',
      failedMessage: 'Please try again.',
      headMoved: 'Head position updated!',
      headFailed: 'Head rotation failed. Try again.',
      testSpeaker: 'Test Speaker',
      testSpeakerDesc: 'Play test sound',
      speakerSuccess: 'Speaker test playing!',
      speakerFailed: 'Speaker test failed. Try again.',
      volumeSet: 'Volume set to'
    },
    tl: {
      title: 'Mga Kontrol',
      subtitle: 'Paandarin ang BantayBot',
      lastCommand: 'Huling Ginawa',
      executedAt: 'noong',
      movementControls: 'Galaw',
      alertControls: 'Alarma',
      systemControls: 'Sistema',
      moveArms: 'Igalaw Braso',
      moveArmsDesc: 'Igalaw ang braso',
      stopMovement: 'Itigil',
      stopMovementDesc: 'Itigil ang makina',
      soundAlarm: 'Alarma',
      soundAlarmDesc: 'Patunugin ang alarma',
      calibrateSensors: 'Ayusin',
      calibrateSensorsDesc: 'Ayusin ang sensor',
      resetSystem: 'Ulitin',
      resetSystemDesc: 'Simulan muli',
      emergencyStop: 'ITIGIL LAHAT',
      emergencyStopDesc: 'Itigil kaagad ang lahat',
      confirmReset: 'Uulitin nito ang sistema. Ituloy?',
      confirmEmergencyStop: 'Ititigil nito ang lahat. Ituloy?',
      warning: 'Babala',
      success: 'Tapos na',
      failed: 'Hindi nagawa',
      successMessage: 'ay tapos na!',
      failedMessage: 'Subukan muli.',
      headMoved: 'Na-update ang posisyon ng ulo!',
      headFailed: 'Hindi umiikot ang ulo. Subukan muli.',
      testSpeaker: 'Subukan Speaker',
      testSpeakerDesc: 'Patunugin ang speaker',
      speakerSuccess: 'Tumutunog ang speaker!',
      speakerFailed: 'Hindi gumana ang speaker. Subukan muli.',
      volumeSet: 'Lakas ng tunog:'
    }
  };

  const t = texts[language] || texts.en;

  // Auto-start tour for first-time users on this page
  useEffect(() => {
    if (isFirstTimeUser && !isTourCompleted('controls')) {
      const timer = setTimeout(() => {
        startTour('controls', controlsTourSteps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTourCompleted, startTour]);

  const setLoading = (command, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [command]: isLoading }));
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

  const executeCommand = async (command, confirmMsg = null, isDangerous = false) => {
    if (confirmMsg) {
      const confirmed = await confirm(t.warning || 'Warning', confirmMsg, { isDangerous });
      if (!confirmed) return;
    }

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
      showSuccess(t.success, `${getCommandDisplayName(command)} ${t.successMessage}`);
    } catch (error) {
      showError(t.failed, `${getCommandDisplayName(command)} ${t.failedMessage}`);
    } finally {
      setLoading(command, false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  const handleVolumeCommit = async () => {
    const result = await commitVolume();
    if (result.success) {
      showSuccess(t.success, `${t.volumeSet} ${volume}%`);
    } else {
      showError(t.failed, t.failedMessage);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return '🔇';
    if (volume < 30) return '🔈';
    if (volume < 70) return '🔉';
    return '🔊';
  };

  const handleHeadAngleSelect = async (angle) => {
    setHeadLoadingAngle(angle);
    try {
      await CommandService.rotateHeadCommand(CONFIG.DEVICE_ID, angle);
      setHeadTargetAngle(angle);
      showSuccess(t.success, t.headMoved);
    } catch (error) {
      console.error('Head rotation failed:', error);
      showError(t.failed, t.headFailed);
    } finally {
      setHeadLoadingAngle(null);
    }
  };

  const handleTestSpeaker = async () => {
    setTestingSpeaker(true);
    try {
      await CommandService.soundAlarm(CONFIG.DEVICE_ID);
      showSuccess(t.success, t.speakerSuccess);
    } catch (error) {
      console.error('Speaker test failed:', error);
      showError(t.failed, t.speakerFailed);
    } finally {
      setTimeout(() => setTestingSpeaker(false), 1000);
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
        <div data-tour="controls-header" className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4 bg-secondary">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
                <Gamepad2 size={24} className="text-brand" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
              </div>
            </div>
            {/* Info Button for Tour */}
            <button
              onClick={() => startTour('controls', controlsTourSteps)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-info/20 flex items-center justify-center hover:bg-info/30 transition-colors"
              aria-label={language === 'tl' ? 'Gabay sa paggamit' : 'Help guide'}
            >
              <HelpCircle size={20} className="text-info" />
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10">
          {/* Last Command Status */}
          {lastCommand && (
            <div data-tour="controls-last-command" className="surface-primary rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-success shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Check size={14} className="text-success" />
                <span className="text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wide">{t.lastCommand}</span>
              </div>
              <div className="font-bold text-sm sm:text-base text-primary">{getCommandDisplayName(lastCommand.command)}</div>
              <div className="text-[10px] sm:text-xs text-secondary font-mono">{t.executedAt} {formatTime(lastCommand.timestamp)}</div>
            </div>
          )}

          {/* Movement Controls */}
          <div data-tour="controls-movement">
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
              <div data-tour="controls-head-position">
                <HeadControlPanel
                  language={language}
                  currentAngle={headTargetAngle}
                  loadingAngle={headLoadingAngle}
                  onAngleSelect={handleHeadAngleSelect}
                />
              </div>
              <ControlBtn
                icon={Square}
                title={t.stopMovement}
                desc={t.stopMovementDesc}
                onClick={() => executeCommand('STOP_MOVEMENT')}
                loading={loadingStates.STOP_MOVEMENT}
                color="warning"
              />
            </div>
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
            {/* Volume Control */}
            <div className="surface-primary rounded-xl p-4 sm:p-5 border-2 border-primary">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-secondary">
                  {language === 'tl' ? 'Lakas ng tunog' : 'Volume'}
                </span>
                <span className="text-sm text-tertiary">{volume}%</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">{getVolumeIcon()}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  onPointerUp={handleVolumeCommit}
                  onKeyUp={(e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) handleVolumeCommit(); }}
                  className="flex-1 h-2 bg-tertiary rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--primary-500) 0%, var(--primary-500) ${volume}%, var(--bg-tertiary) ${volume}%, var(--bg-tertiary) 100%)`
                  }}
                />
                <span className="text-xs text-tertiary w-8 text-right">100</span>
              </div>
              {/* Test Speaker Button */}
              <button
                onClick={handleTestSpeaker}
                disabled={testingSpeaker}
                className={`
                  w-full py-2.5 sm:py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                  ${testingSpeaker
                    ? 'bg-tertiary text-secondary cursor-wait'
                    : 'bg-warning/20 text-warning hover:bg-warning/30 cursor-pointer'
                  }
                `}
              >
                {testingSpeaker ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Volume2 size={18} />
                )}
                <span>{t.testSpeaker}</span>
              </button>
            </div>
          </div>

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
              onClick={() => executeCommand('RESET_SYSTEM', t.confirmReset, true)}
              loading={loadingStates.RESET_SYSTEM}
              color="info"
            />
          </div>

          {/* Emergency Stop */}
          <div data-tour="controls-emergency-stop" className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-2xl bg-error/5 border-2 border-error/30">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertTriangle size={22} className="text-error" />
              <span className="font-bold text-error text-sm sm:text-base">Emergency</span>
            </div>
            <button
              onClick={() => executeCommand('STOP_MOVEMENT', t.confirmEmergencyStop, true)}
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
