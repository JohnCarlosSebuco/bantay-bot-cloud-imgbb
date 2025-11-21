import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  ControlButton,
  AudioPlayerControl,
  // ServoArmControl,
  // DetectionControls,
  // CameraSettings,
  HeadControlPanel
} from '../components/ui';
import CommandService from '../services/CommandService';
import { CONFIG } from '../config/config';

export default function Controls({ language }) {
  const { currentTheme } = useTheme();
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Manual control states
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(1);
  const [volume, setVolume] = useState(20);
  const [leftArmAngle, setLeftArmAngle] = useState(90);
  const [rightArmAngle, setRightArmAngle] = useState(90);
  const [oscillating, setOscillating] = useState(false);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [detectionSensitivity, setDetectionSensitivity] = useState(2);
  const [birdsDetectedToday, setBirdsDetectedToday] = useState(0);
  const [cameraBrightness, setCameraBrightness] = useState(0);
  const [cameraContrast, setCameraContrast] = useState(0);
  const [grayscaleMode, setGrayscaleMode] = useState(false);
  const [headTargetAngle, setHeadTargetAngle] = useState(0);
  const [headLoadingAngle, setHeadLoadingAngle] = useState(null);

  const t = {
    en: {
      title: 'Remote Controls',
      subtitle: 'Control your BantayBot',
      lastCommand: 'Last Command',
      executedAt: 'Executed at',
      movementControls: 'Movement Controls',
      alertControls: 'Alert Controls',
      systemControls: 'System Controls',
      emergencyControls: 'Emergency Controls',
      emergencyDescription: 'Use these controls only in emergency situations',
      moveArms: 'Move Arms',
      moveArmsDesc: 'Activate arm movement sequence',
      rotateHead: 'Rotate Head',
      rotateHeadDesc: 'Perform head rotation',
      stopMovement: 'Stop Movement',
      stopMovementDesc: 'Stop all servo movements immediately',
      soundAlarm: 'Sound Alarm',
      soundAlarmDesc: 'Trigger security alarm',
      testBuzzer: 'Test Buzzer',
      testBuzzerDesc: 'Quick buzzer test',
      calibrateSensors: 'Calibrate Sensors',
      calibrateSensorsDesc: 'Recalibrate all sensor readings',
      resetSystem: 'Reset System',
      resetSystemDesc: 'Restart the entire system',
      emergencyStop: 'Emergency Stop',
      emergencyStopDesc: 'Immediately stop all operations',
      confirmAction: 'Confirm Action',
      confirmReset: 'This will restart the entire BantayBot system. Are you sure you want to continue?',
      confirmEmergencyStop: 'This will immediately stop all BantayBot operations. Continue?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      success: 'Success',
      failed: 'Failed',
      successMessage: 'completed successfully!',
      failedMessage: 'Please try again.',
      processing: 'Processing...'
    },
    tl: {
      title: 'Mga Kontrol',
      subtitle: 'Kontrolin ang inyong BantayBot',
      lastCommand: 'Huling Utos',
      executedAt: 'Isinagawa noong',
      movementControls: 'Mga Kontrol ng Galaw',
      alertControls: 'Mga Kontrol ng Alarm',
      systemControls: 'Mga Kontrol ng Sistema',
      emergencyControls: 'Emergency na Kontrol',
      emergencyDescription: 'Gamitin lamang ang mga kontrol na ito sa emergency na sitwasyon',
      moveArms: 'Galawin ang Braso',
      moveArmsDesc: 'Simulan ang paggalaw ng braso',
      rotateHead: 'Ikutin ang Ulo',
      rotateHeadDesc: 'Isagawa ang pag-ikot ng ulo',
      stopMovement: 'Ihinto ang Galaw',
      stopMovementDesc: 'Ihinto kaagad ang lahat ng galaw',
      soundAlarm: 'Tumugtog ng Alarm',
      soundAlarmDesc: 'I-trigger ang alarm ng seguridad',
      testBuzzer: 'Test ng Buzzer',
      testBuzzerDesc: 'Mabilis na pagsubok ng buzzer',
      calibrateSensors: 'I-calibrate ang Sensor',
      calibrateSensorsDesc: 'I-calibrate muli ang lahat ng sensor',
      resetSystem: 'I-reset ang Sistema',
      resetSystemDesc: 'I-restart ang buong sistema',
      emergencyStop: 'Emergency Stop',
      emergencyStopDesc: 'Ihinto kaagad ang lahat ng operasyon',
      confirmAction: 'Kumpirmahin ang Aksyon',
      confirmReset: 'Ire-restart nito ang buong BantayBot system. Sigurado ka ba na magpatuloy?',
      confirmEmergencyStop: 'Ihihinto kaagad nito ang lahat ng BantayBot operations. Magpatuloy?',
      cancel: 'Kanselahin',
      confirm: 'Kumpirmahin',
      success: 'Tagumpay',
      failed: 'Nabigo',
      successMessage: 'matagumpay na naisakatuparan!',
      failedMessage: 'Subukan muli.',
      processing: 'Pinoproseso...'
    }
  };

  const texts = t[language] || t.en;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const setLoading = (command, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [command]: isLoading }));
  };

  const showConfirmDialog = (message, onConfirm) => {
    if (window.confirm(`${texts.confirmAction}\n\n${message}`)) {
      onConfirm();
    }
  };

  const showAlert = (title, message) => {
    alert(`${title}\n\n${message}`);
  };

  const getCommandDisplayName = (command) => {
    const names = {
      MOVE_ARMS: texts.moveArms,
      ROTATE_HEAD: texts.rotateHead,
      STOP_MOVEMENT: texts.stopMovement,
      SOUND_ALARM: texts.soundAlarm,
      TEST_BUZZER: texts.testBuzzer,
      RESET_SYSTEM: texts.resetSystem,
      CALIBRATE_SENSORS: texts.calibrateSensors
    };
    return names[command] || command;
  };

  const executeCommand = async (command) => {
    setLoading(command, true);
    setLastCommand({ command, timestamp: new Date() });

    try {
      let result;
      switch (command) {
        case 'MOVE_ARMS':
          result = await CommandService.moveArms(CONFIG.DEVICE_ID);
          break;
        case 'STOP_MOVEMENT':
          result = await CommandService.stopMovement(CONFIG.DEVICE_ID);
          break;
        case 'SOUND_ALARM':
          result = await CommandService.soundAlarm(CONFIG.DEVICE_ID);
          break;
        case 'TEST_BUZZER':
          result = await CommandService.testBuzzer(CONFIG.DEVICE_ID);
          break;
        case 'RESET_SYSTEM':
          result = await CommandService.resetSystem(CONFIG.DEVICE_ID);
          break;
        case 'CALIBRATE_SENSORS':
          result = await CommandService.calibrateSensors(CONFIG.DEVICE_ID);
          break;
        default:
          throw new Error('Unknown command');
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      showAlert(
        texts.success,
        `${getCommandDisplayName(command)} ${texts.successMessage}`
      );
    } catch (error) {
      showAlert(
        texts.failed,
        `${texts.failed} ${getCommandDisplayName(command)}. ${texts.failedMessage}`
      );
    } finally {
      setLoading(command, false);
    }
  };

  const sendCommand = (command, confirmationMessage = null) => {
    if (confirmationMessage) {
      showConfirmDialog(confirmationMessage, () => executeCommand(command));
    } else {
      executeCommand(command);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Manual Control Handlers
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

  const handleTrackChange = async (track) => {
    try {
      await CommandService.setTrack(CONFIG.DEVICE_ID, track);
      setCurrentTrack(track);
    } catch (error) {
      console.error('Track change failed:', error);
    }
  };

  const handleLeftArmChange = async (angle) => {
    try {
      await CommandService.moveServo(CONFIG.DEVICE_ID, angle, rightArmAngle);
      setLeftArmAngle(angle);
    } catch (error) {
      console.error('Left arm movement failed:', error);
    }
  };

  const handleRightArmChange = async (angle) => {
    try {
      await CommandService.moveServo(CONFIG.DEVICE_ID, leftArmAngle, angle);
      setRightArmAngle(angle);
    } catch (error) {
      console.error('Right arm movement failed:', error);
    }
  };

  const handleToggleOscillation = async () => {
    try {
      if (oscillating) {
        await CommandService.stopOscillate(CONFIG.DEVICE_ID);
      } else {
        await CommandService.oscillateArms(CONFIG.DEVICE_ID);
      }
      setOscillating(!oscillating);
    } catch (error) {
      console.error('Oscillation toggle failed:', error);
    }
  };

  const handleDetectionToggle = async (enabled) => {
    try {
      if (enabled) {
        await CommandService.enableDetection(CONFIG.DEVICE_ID);
      } else {
        await CommandService.disableDetection(CONFIG.DEVICE_ID);
      }
      setDetectionEnabled(enabled);
    } catch (error) {
      console.error('Detection toggle failed:', error);
    }
  };

  const handleSensitivityChange = async (sensitivity) => {
    try {
      await CommandService.setSensitivity(CONFIG.DEVICE_ID, sensitivity);
      setDetectionSensitivity(sensitivity);
    } catch (error) {
      console.error('Sensitivity change failed:', error);
    }
  };

  const handleResetDetectionCount = () => {
    setBirdsDetectedToday(0);
  };

  const handleBrightnessChange = async (brightness) => {
    try {
      await CommandService.setBrightness(CONFIG.DEVICE_ID, brightness);
      setCameraBrightness(brightness);
    } catch (error) {
      console.error('Brightness change failed:', error);
    }
  };

  const handleContrastChange = async (contrast) => {
    try {
      await CommandService.setContrast(CONFIG.DEVICE_ID, contrast);
      setCameraContrast(contrast);
    } catch (error) {
      console.error('Contrast change failed:', error);
    }
  };

  const handleGrayscaleToggle = async () => {
    try {
      await CommandService.toggleGrayscale(CONFIG.DEVICE_ID);
      setGrayscaleMode(!grayscaleMode);
    } catch (error) {
      console.error('Grayscale toggle failed:', error);
    }
  };

  const handleHeadAngleSelect = async (angle) => {
    setHeadLoadingAngle(angle);
    try {
      await CommandService.rotateHeadCommand(CONFIG.DEVICE_ID, angle);
      setHeadTargetAngle(angle);
      showAlert(texts.success, `${texts.rotateHead} ${texts.successMessage}`);
    } catch (error) {
      console.error('Head rotation failed:', error);
      showAlert(texts.failed, `${texts.failed} ${texts.rotateHead}. ${texts.failedMessage}`);
    } finally {
      setHeadLoadingAngle(null);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: currentTheme.colors.background,
    overflowY: 'auto',
    opacity: 1
  };

  const headerStyle = {
    paddingTop: '60px',
    paddingBottom: currentTheme.spacing['6'] + 'px',
    paddingLeft: currentTheme.spacing['4'] + 'px',
    paddingRight: currentTheme.spacing['4'] + 'px',
    backgroundColor: currentTheme.colors.background
  };

  const headerTopStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const brandSectionStyle = {
    flex: 1
  };

  const brandRowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['1'] + 'px'
  };

  const logoIconStyle = {
    marginRight: currentTheme.spacing['2'] + 'px',
    fontSize: '28px',
    color: currentTheme.colors.primary
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    letterSpacing: '-0.5px'
  };

  const subtitleStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    fontWeight: currentTheme.typography.weights.medium
  };

  const contentStyle = {
    padding: currentTheme.spacing['4'] + 'px'
  };

  const lastCommandCardStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['4'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`,
    borderLeft: `4px solid ${currentTheme.colors.primary}`
  };

  const lastCommandHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['2'] + 'px'
  };

  const lastCommandTitleStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    fontWeight: currentTheme.typography.weights.semibold,
    color: currentTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const lastCommandNameStyle = {
    fontSize: currentTheme.typography.sizes.lg,
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing['1'] + 'px'
  };

  const lastCommandTimeStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    fontFamily: 'monospace'
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['3'] + 'px',
    marginTop: currentTheme.spacing['2'] + 'px'
  };

  const sectionTitleStyle = {
    fontSize: currentTheme.typography.sizes.lg,
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const emergencySectionStyle = {
    backgroundColor: currentTheme.colors.error + '10',
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginTop: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['6'] + 'px',
    border: `2px solid ${currentTheme.colors.error}30`
  };

  const emergencyHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const emergencyTitleStyle = {
    fontSize: currentTheme.typography.sizes.lg,
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.error,
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const emergencyDescriptionStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.error,
    marginBottom: currentTheme.spacing['3'] + 'px',
    fontStyle: 'italic'
  };

  return (
    <div style={containerStyle}>
      <div style={{ opacity: 1 }}>
        {/* Modern Header */}
        <div style={headerStyle}>
          <div style={headerTopStyle}>
            <div style={brandSectionStyle}>
              <div style={brandRowStyle}>
                <span style={logoIconStyle}>🎮</span>
                <h1 style={titleStyle}>{texts.title}</h1>
              </div>
              <p style={subtitleStyle}>{texts.subtitle}</p>
            </div>
          </div>
        </div>

        <div style={contentStyle}>
          {/* Last Command Status */}
          {lastCommand && (
            <div style={lastCommandCardStyle}>
              <div style={lastCommandHeaderStyle}>
                <span style={{ fontSize: '16px', color: currentTheme.colors.primary }}>✓</span>
                <span style={lastCommandTitleStyle}>{texts.lastCommand}</span>
              </div>
              <div style={lastCommandNameStyle}>
                {getCommandDisplayName(lastCommand.command)}
              </div>
              <div style={lastCommandTimeStyle}>
                {texts.executedAt} {formatTime(lastCommand.timestamp)}
              </div>
            </div>
          )}

          {/* Manual Control Panels */}

          {/* Audio Player Control */}
          <AudioPlayerControl
            isPlaying={audioPlaying}
            isLoading={loadingStates.audio}
            onPlay={handleAudioPlay}
            onStop={handleAudioStop}
            currentTrack={currentTrack}
            onTrackChange={handleTrackChange}
            currentVolume={volume}
            onVolumeChange={handleVolumeChange}
            language={language}
            className="mb-6"
          />

          {/*
          <ServoArmControl
            leftArmAngle={leftArmAngle}
            rightArmAngle={rightArmAngle}
            oscillating={oscillating}
            onLeftChange={handleLeftArmChange}
            onRightChange={handleRightArmChange}
            onToggleOscillation={handleToggleOscillation}
            lang={language}
            className="mb-6"
          />
          */}

          {/* Detection Controls */}
          {/*
          <DetectionControls
            detectionEnabled={detectionEnabled}
            onDetectionToggle={handleDetectionToggle}
            sensitivity={detectionSensitivity}
            onSensitivityChange={handleSensitivityChange}
            birdsDetectedToday={birdsDetectedToday}
            onResetCount={handleResetDetectionCount}
            className="mb-6"
          />

          <CameraSettings
            brightness={cameraBrightness}
            onBrightnessChange={handleBrightnessChange}
            contrast={cameraContrast}
            onContrastChange={handleContrastChange}
            grayscaleMode={grayscaleMode}
            onGrayscaleToggle={handleGrayscaleToggle}
            language={language}
            className="mb-6"
          />
          */}

          {/* Movement Controls Section */}
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: '20px', color: currentTheme.colors.primary }}>↔️</span>
            <h2 style={sectionTitleStyle}>{texts.movementControls}</h2>
          </div>

          <ControlButton
            command="MOVE_ARMS"
            title={texts.moveArms}
            description={texts.moveArmsDesc}
            icon="🦾"
            iconColor={currentTheme.colors.primary}
            onPress={sendCommand}
            isLoading={loadingStates.MOVE_ARMS}
          />

          <HeadControlPanel
            language={language}
            currentAngle={headTargetAngle}
            loadingAngle={headLoadingAngle}
            onAngleSelect={handleHeadAngleSelect}
            className="mb-6"
          />

          <ControlButton
            command="STOP_MOVEMENT"
            title={texts.stopMovement}
            description={texts.stopMovementDesc}
            icon="⏹️"
            iconColor={currentTheme.colors.warning}
            onPress={sendCommand}
            isLoading={loadingStates.STOP_MOVEMENT}
          />

          {/* Alert Controls Section */}
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: '20px', color: currentTheme.colors.error }}>🚨</span>
            <h2 style={sectionTitleStyle}>{texts.alertControls}</h2>
          </div>

          <ControlButton
            command="SOUND_ALARM"
            title={texts.soundAlarm}
            description={texts.soundAlarmDesc}
            icon="📢"
            iconColor={currentTheme.colors.error}
            onPress={sendCommand}
            isLoading={loadingStates.SOUND_ALARM}
          />

          <ControlButton
            command="TEST_BUZZER"
            title={texts.testBuzzer}
            description={texts.testBuzzerDesc}
            icon="🔊"
            iconColor={currentTheme.colors.warning}
            onPress={sendCommand}
            isLoading={loadingStates.TEST_BUZZER}
          />

          {/* System Controls Section */}
          <div style={sectionHeaderStyle}>
            <span style={{ fontSize: '20px', color: currentTheme.colors.success }}>⚙️</span>
            <h2 style={sectionTitleStyle}>{texts.systemControls}</h2>
          </div>

          <ControlButton
            command="CALIBRATE_SENSORS"
            title={texts.calibrateSensors}
            description={texts.calibrateSensorsDesc}
            icon="🔧"
            iconColor={currentTheme.colors.success}
            onPress={sendCommand}
            isLoading={loadingStates.CALIBRATE_SENSORS}
          />

          <ControlButton
            command="RESET_SYSTEM"
            title={texts.resetSystem}
            description={texts.resetSystemDesc}
            icon="🔄"
            iconColor={currentTheme.colors.info}
            onPress={sendCommand}
            confirmationMessage={texts.confirmReset}
            isLoading={loadingStates.RESET_SYSTEM}
          />

          {/* Emergency Section */}
          <div style={emergencySectionStyle}>
            <div style={emergencyHeaderStyle}>
              <span style={{ fontSize: '24px', color: currentTheme.colors.error }}>⚠️</span>
              <h2 style={emergencyTitleStyle}>{texts.emergencyControls}</h2>
            </div>
            <p style={emergencyDescriptionStyle}>{texts.emergencyDescription}</p>
            <ControlButton
              command="STOP_MOVEMENT"
              title={texts.emergencyStop}
              description={texts.emergencyStopDesc}
              icon="🛑"
              iconColor={currentTheme.colors.error}
              onPress={sendCommand}
              confirmationMessage={texts.confirmEmergencyStop}
              isLoading={loadingStates.STOP_MOVEMENT}
            />
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}