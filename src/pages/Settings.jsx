import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Wifi, Volume2, Smartphone, Info, Shield, CheckCircle, RefreshCw, Camera, Radio, Wrench, Timer, Globe, Bell, Moon, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useVolume } from '../contexts/VolumeContext';
import { useTour } from '../contexts/TourContext';
import { translations } from '../i18n/translations';
import {
  InputCard,
  ToggleCard,
  ConnectionTestCard,
  SpeakerControl,
  NotificationPreferences,
  ConnectionModeSelector,
  ConnectionStatusBanner
} from '../components/ui';
import ConfigService from '../services/ConfigService';
import ConnectionManager from '../services/ConnectionManager';
import NetworkDiscoveryService from '../services/NetworkDiscoveryService';
import OfflineModeService, { CONNECTION_MODES } from '../services/OfflineModeService';
import { settingsTourSteps } from '../config/tourSteps';

export default function Settings({ language, onLanguageChange }) {
  const { currentTheme, isDark, toggleTheme } = useTheme();
  const { volume, setVolume, isMuted, setIsMuted } = useVolume();
  const { startTour, isFirstTimeUser, isTourCompleted, resetAllTours } = useTour();
  const t = translations[language];

  // Configuration state (volume is now managed by VolumeContext)
  const [config, setConfig] = useState({
    cameraIP: '',
    cameraPort: '',
    mainBoardIP: '',
    mainBoardPort: '',
    updateInterval: '',
    notifications: true,
    autoReconnect: true
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    camera: 'Not tested',
    mainBoard: 'Not tested'
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [foundDevices, setFoundDevices] = useState([]);
  const [errors, setErrors] = useState({});

  // Offline Mode state
  const [connectionMode, setConnectionMode] = useState(CONNECTION_MODES.AUTO);
  const [botStatus, setBotStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const texts = {
    en: {
      title: 'Settings',
      subtitle: 'Configure BantayBot',
      connectionSettings: 'Connection',
      cameraIP: 'Camera IP',
      cameraIPDesc: 'Camera ESP32-CAM IP',
      cameraPort: 'Camera Port',
      cameraPortDesc: 'Camera Board Port',
      mainIP: 'Main Board IP',
      mainIPDesc: 'Main Control ESP32 IP',
      mainPort: 'Main Port',
      mainPortDesc: 'Main Board Port',
      updateInterval: 'Update Interval',
      updateIntervalDesc: 'Sensor update frequency (ms)',
      autoDiscovery: 'Auto-Discovery',
      autoDiscoveryDesc: 'Scan network for devices',
      scanNetwork: 'Scan',
      connectionTest: 'Test Connection',
      connectionTestDesc: 'Test ESP32 connection',
      testConnections: 'Test',
      speakerAudio: 'Audio',
      appPreferences: 'Preferences',
      language: 'Language',
      switchToTagalog: 'Switch to Tagalog',
      switchToEnglish: 'Switch to English',
      notifications: 'Notifications',
      notificationsDesc: 'Motion detection alerts',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Dark theme',
      autoReconnect: 'Auto Reconnect',
      autoReconnectDesc: 'Auto reconnect on disconnect',
      systemInfo: 'About',
      aboutBantayBot: 'BantayBot',
      aboutDesc: 'Solar-powered automated scarecrow with sensors and mobile monitoring.',
      developedBy: 'PUP-Lopez BSIT',
      saveSettings: 'Save Settings',
      saving: 'Saving...',
      resetDefaults: 'Reset',
      success: 'Saved',
      successMsg: 'Settings saved!',
      failed: 'Failed',
      failedMsg: 'Save failed. Try again.',
      connectionSuccess: 'Connected',
      connectionSuccessMsg: 'Connected to Camera and Main Board!',
      connectionFailed: 'Failed',
      devicesFound: 'Found!',
      noDevicesFound: 'Not Found',
      noDevicesMsg: 'No devices found. Check ESP32 power.',
      scanError: 'Scan Error',
      languageUpdated: 'Language Updated',
      resetConfirm: 'Reset all settings?',
      resetTour: 'Reset App Guide',
      resetTourDesc: 'Show guided tour again',
      tourReset: 'Guide Reset',
      tourResetMsg: 'The app guide will show again on all pages.',
      offlineMode: 'Connection Mode',
      offlineModeDesc: 'Control how the bot connects to the cloud',
      syncNow: 'Sync Now',
      syncSuccess: 'Sync Complete',
      syncFailed: 'Sync Failed'
    },
    tl: {
      title: 'Settings',
      subtitle: 'Ayusin ang BantayBot',
      connectionSettings: 'Koneksyon sa Internet',
      cameraIP: 'Camera IP',
      cameraIPDesc: 'IP ng Camera',
      cameraPort: 'Port ng Camera',
      cameraPortDesc: 'Port ng Camera',
      mainIP: 'Main Board IP',
      mainIPDesc: 'IP ng Main Board',
      mainPort: 'Port ng Main',
      mainPortDesc: 'Port ng Main Board',
      updateInterval: 'Bilis ng Update',
      updateIntervalDesc: 'Gaano kadalas mag-update (ms)',
      autoDiscovery: 'Hanapin Devices',
      autoDiscoveryDesc: 'Hanapin sa network',
      scanNetwork: 'Hanapin',
      connectionTest: 'Subukan Koneksyon',
      connectionTestDesc: 'Subukan kung nakakonekta',
      testConnections: 'Subukan',
      speakerAudio: 'Tunog',
      appPreferences: 'Mga Kagustuhan',
      language: 'Wika',
      switchToTagalog: 'Tagalog',
      switchToEnglish: 'English',
      notifications: 'Abiso',
      notificationsDesc: 'Babala sa galaw',
      darkMode: 'Madilim na Kulay',
      darkModeDesc: 'Madilim na tema',
      autoReconnect: 'Auto Reconnect',
      autoReconnectDesc: 'Kusang kumonekta muli',
      systemInfo: 'Tungkol Dito',
      aboutBantayBot: 'BantayBot',
      aboutDesc: 'Panakot na de-araw na may sensor at cellphone monitoring.',
      developedBy: 'PUP-Lopez BSIT',
      saveSettings: 'I-save',
      saving: 'Sandali lang...',
      resetDefaults: 'Ibalik sa Dati',
      success: 'Na-save',
      successMsg: 'Na-save na!',
      failed: 'Hindi Nagawa',
      failedMsg: 'Hindi nagawa. Subukan muli.',
      connectionSuccess: 'Nakakonekta',
      connectionSuccessMsg: 'Nakakonekta na!',
      connectionFailed: 'Hindi Nakakonekta',
      devicesFound: 'Nakita!',
      noDevicesFound: 'Walang Nakita',
      noDevicesMsg: 'Walang nakitang device. Tingnan ang ESP32.',
      scanError: 'May Problema',
      languageUpdated: 'Na-update na',
      resetConfirm: 'Ibalik sa dati ang lahat?',
      resetTour: 'Ulitin ang Gabay',
      resetTourDesc: 'Ipakita muli ang gabay',
      tourReset: 'Na-reset na',
      tourResetMsg: 'Ipapakita muli ang gabay sa lahat ng pages.',
      offlineMode: 'Connection Mode',
      offlineModeDesc: 'Kontrolin kung paano kumokonekta sa cloud',
      syncNow: 'I-sync Ngayon',
      syncSuccess: 'Tapos na ang Sync',
      syncFailed: 'Hindi Nagawa ang Sync'
    }
  };

  const txt = texts[language] || texts.en;

  // Auto-start tour for first-time users on this page
  useEffect(() => {
    if (isFirstTimeUser && !isTourCompleted('settings')) {
      const timer = setTimeout(() => {
        startTour('settings', settingsTourSteps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTourCompleted, startTour]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Initialize Offline Mode Service
  useEffect(() => {
    const initOfflineMode = async () => {
      const mode = await OfflineModeService.initialize();
      setConnectionMode(mode);
    };
    initOfflineMode();

    // Subscribe to status changes
    const unsubscribe = OfflineModeService.onStatusChange(({ mode, botStatus }) => {
      setConnectionMode(mode);
      setBotStatus(botStatus);
    });

    // Start polling bot status
    const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
    const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
    OfflineModeService.startPolling(mainBoardIP, mainBoardPort, 10000);

    return () => {
      unsubscribe();
      OfflineModeService.stopPolling();
    };
  }, []);

  const loadSettings = async () => {
    try {
      await ConfigService.initialize();
      const currentConfig = ConfigService.get();

      setConfig({
        cameraIP: currentConfig.cameraIP,
        cameraPort: currentConfig.cameraPort.toString(),
        mainBoardIP: currentConfig.mainBoardIP,
        mainBoardPort: currentConfig.mainBoardPort.toString(),
        updateInterval: currentConfig.updateInterval.toString(),
        notifications: currentConfig.notifications,
        autoReconnect: currentConfig.autoReconnect
      });
      // Volume is now managed by VolumeContext and synced from device
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const updateConfig = {
        cameraIP: config.cameraIP,
        cameraPort: parseInt(config.cameraPort),
        mainBoardIP: config.mainBoardIP,
        mainBoardPort: parseInt(config.mainBoardPort),
        updateInterval: parseInt(config.updateInterval),
        notifications: config.notifications,
        autoReconnect: config.autoReconnect
        // Volume is managed by VolumeContext and sent directly to device
      };

      const validation = ConfigService.validate(updateConfig);
      if (!validation.isValid) {
        setErrors({ general: validation.errors.join(', ') });
        return;
      }

      await ConfigService.update(updateConfig);
      setErrors({});
      showAlert(txt.success, txt.successMsg);
    } catch (error) {
      showAlert(txt.failed, txt.failedMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setConnectionStatus({ camera: 'Testing...', mainBoard: 'Testing...' });

    try {
      const testConfig = {
        cameraIP: config.cameraIP,
        cameraPort: parseInt(config.cameraPort),
        mainBoardIP: config.mainBoardIP,
        mainBoardPort: parseInt(config.mainBoardPort)
      };

      const [cameraResult, mainResult] = await Promise.allSettled([
        ConnectionManager.testConnection(testConfig.cameraIP, testConfig.cameraPort, '/stream'),
        ConnectionManager.testConnection(testConfig.mainBoardIP, testConfig.mainBoardPort, '/status')
      ]);

      const cameraSuccess = cameraResult.status === 'fulfilled' && cameraResult.value.success;
      const mainSuccess = mainResult.status === 'fulfilled' && mainResult.value.success;

      setConnectionStatus({
        camera: cameraSuccess ? 'Connected' : 'Failed',
        mainBoard: mainSuccess ? 'Connected' : 'Failed'
      });

      if (cameraSuccess && mainSuccess) {
        showAlert(txt.connectionSuccess, txt.connectionSuccessMsg);
      } else {
        const failedBoards = [];
        if (!cameraSuccess) failedBoards.push('Camera');
        if (!mainSuccess) failedBoards.push('Main Board');
        showAlert(txt.connectionFailed, `Failed: ${failedBoards.join(', ')}`);
      }
    } catch (error) {
      setConnectionStatus({ camera: 'Failed', mainBoard: 'Failed' });
      showAlert(txt.connectionFailed, 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const scanNetwork = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setFoundDevices([]);

    try {
      const baseIP = NetworkDiscoveryService.getBaseIP(config.cameraIP);
      const devices = await NetworkDiscoveryService.smartDiscover(baseIP, (progress) => {
        setScanProgress(progress);
      });

      setFoundDevices(devices);

      if (devices.length > 0) {
        const cameraDevice = devices.find(d => d.type === 'camera');
        const mainDevice = devices.find(d => d.type === 'main');

        if (cameraDevice) {
          setConfig(prev => ({ ...prev, cameraIP: cameraDevice.ip }));
        }
        if (mainDevice) {
          setConfig(prev => ({ ...prev, mainBoardIP: mainDevice.ip }));
        }

        showAlert(txt.devicesFound, `Found ${devices.length} device(s)!`);
      } else {
        showAlert(txt.noDevicesFound, txt.noDevicesMsg);
      }
    } catch (error) {
      showAlert(txt.scanError, 'Scan error');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm(txt.resetConfirm)) {
      ConfigService.reset().then((defaults) => {
        setConfig({
          cameraIP: defaults.cameraIP,
          cameraPort: defaults.cameraPort.toString(),
          mainBoardIP: defaults.mainBoardIP,
          mainBoardPort: defaults.mainBoardPort.toString(),
          updateInterval: defaults.updateInterval.toString(),
          notifications: defaults.notifications,
          autoReconnect: defaults.autoReconnect
        });
        // Reset volume to default (70%) through context
        setVolume(70);
        setIsMuted(false);
        setConnectionStatus({ camera: 'Not tested', mainBoard: 'Not tested' });
        setErrors({});
      });
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'tl' ? 'en' : 'tl';
    onLanguageChange?.(newLang);
  };

  const showAlert = (title, message) => {
    alert(`${title}\n\n${message}`);
  };

  // Handle connection mode change
  const handleModeChange = async (mode) => {
    const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
    const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
    await OfflineModeService.setMode(mode, mainBoardIP, mainBoardPort);
  };

  // Handle force sync
  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
      const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
      const result = await OfflineModeService.forceSync(mainBoardIP, mainBoardPort);
      showAlert(txt.syncSuccess, `${result.synced || 0} items synced`);
    } catch (error) {
      showAlert(txt.syncFailed, error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle retry connection
  const handleRetryConnection = async () => {
    const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
    const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
    await OfflineModeService.fetchBotStatus(mainBoardIP, mainBoardPort);
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

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
    <div className="min-h-screen bg-secondary pb-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div data-tour="settings-header" className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
                <SettingsIcon size={24} className="text-brand" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{txt.title}</h1>
                <p className="text-xs sm:text-sm text-secondary">{txt.subtitle}</p>
              </div>
            </div>
            {/* Info Button for Tour */}
            <button
              onClick={() => startTour('settings', settingsTourSteps)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-info/20 flex items-center justify-center hover:bg-info/30 transition-colors"
              aria-label={language === 'tl' ? 'Gabay sa paggamit' : 'Help guide'}
            >
              <HelpCircle size={20} className="text-info" />
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-4">
          {/* Connection Settings Section - COMMENTED OUT
          <div data-tour="settings-connection">
            <SectionHeader icon={Wifi} title={txt.connectionSettings} color="info" first={true} />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <InputCard
              title={txt.cameraIP}
              value={config.cameraIP}
              onChangeText={(value) => updateConfig('cameraIP', value)}
              placeholder="172.24.26.144"
              keyboardType="text"
              description={txt.cameraIPDesc}
              icon="📷"
              error={errors.cameraIP}
            />

            <InputCard
              title={txt.cameraPort}
              value={config.cameraPort}
              onChangeText={(value) => updateConfig('cameraPort', value)}
              placeholder="80"
              keyboardType="numeric"
              description={txt.cameraPortDesc}
              icon="📻"
              error={errors.cameraPort}
            />

            <InputCard
              title={txt.mainIP}
              value={config.mainBoardIP}
              onChangeText={(value) => updateConfig('mainBoardIP', value)}
              placeholder="172.24.26.193"
              keyboardType="text"
              description={txt.mainIPDesc}
              icon="🔧"
              error={errors.mainBoardIP}
            />

            <InputCard
              title={txt.mainPort}
              value={config.mainBoardPort}
              onChangeText={(value) => updateConfig('mainBoardPort', value)}
              placeholder="81"
              keyboardType="numeric"
              description={txt.mainPortDesc}
              icon="📻"
              error={errors.mainBoardPort}
            />

            <InputCard
              title={txt.updateInterval}
              value={config.updateInterval}
              onChangeText={(value) => updateConfig('updateInterval', value)}
              placeholder="1000"
              keyboardType="numeric"
              description={txt.updateIntervalDesc}
              icon="⏱️"
              error={errors.updateInterval}
            />

            <div data-tour="settings-auto-discovery">
              <ConnectionTestCard
                title={txt.autoDiscovery}
                description={txt.autoDiscoveryDesc}
                buttonText={txt.scanNetwork}
                onTest={scanNetwork}
                isLoading={isScanning}
              />
            </div>

            <ConnectionTestCard
              title={txt.connectionTest}
              description={txt.connectionTestDesc}
              buttonText={txt.testConnections}
              onTest={testConnection}
              testResults={connectionStatus}
              isLoading={isLoading}
            />
          </div>
          END Connection Settings Section */}

          {/* Connection Mode Section */}
          <div data-tour="settings-connection-mode">
            <SectionHeader icon={Wifi} title={txt.offlineMode} color="info" first={true} />
            <div className="surface-primary rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-primary shadow-sm mb-3">
              {/* Status Banner */}
              {botStatus && (
                <div className="mb-4">
                  <ConnectionStatusBanner
                    connectionState={botStatus.connectionState}
                    queuedDetections={botStatus.queuedDetections}
                    offlineDuration={botStatus.offlineDuration}
                    userModePreference={botStatus.userModePreference}
                    onRetry={handleRetryConnection}
                    onSync={handleForceSync}
                    syncing={syncing}
                    language={language}
                  />
                </div>
              )}
              {/* Mode Selector */}
              <ConnectionModeSelector
                currentMode={connectionMode}
                onModeChange={handleModeChange}
                language={language}
              />
              <p className="text-[10px] sm:text-xs text-secondary mt-2">{txt.offlineModeDesc}</p>
            </div>
          </div>

          {/* Speaker & Audio Section */}
          <div data-tour="settings-audio">
            <SectionHeader icon={Volume2} title={txt.speakerAudio} color="warning" />
            <SpeakerControl
              volume={volume}
              onVolumeChange={setVolume}
              isMuted={isMuted}
              onMuteToggle={() => setIsMuted(!isMuted)}
            />
          </div>

          {/* Push Notifications Section */}
          <div data-tour="settings-notifications">
            <SectionHeader icon={Bell} title={language === 'tl' ? 'Push Notifications' : 'Push Notifications'} color="error" />
            <NotificationPreferences language={language} />
          </div>

          {/* App Preferences Section */}
          <SectionHeader icon={Smartphone} title={txt.appPreferences} color="brand" />

          <div className="space-y-2 sm:space-y-3">
            {/* Language Toggle */}
            <div data-tour="settings-language" className="surface-primary rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-primary shadow-sm">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">🌐</span>
                  <span className="text-xs sm:text-sm text-secondary">{txt.language}</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {language === 'tl' ? 'Tagalog' : 'English'}
                </span>
              </div>
              <button
                onClick={toggleLanguage}
                className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-tertiary border border-primary rounded-lg sm:rounded-xl text-brand font-semibold text-xs sm:text-sm transition-all hover:bg-brand/10 cursor-pointer"
              >
                {language === 'tl' ? txt.switchToEnglish : txt.switchToTagalog}
              </button>
            </div>

            <div data-tour="settings-dark-mode">
              <ToggleCard
                title={txt.darkMode}
                value={isDark}
                onValueChange={toggleTheme}
                description={txt.darkModeDesc}
                icon="🌙"
              />
            </div>

            {/* Auto Reconnect - COMMENTED OUT
            <ToggleCard
              title={txt.autoReconnect}
              value={config.autoReconnect}
              onValueChange={(value) => updateConfig('autoReconnect', value)}
              description={txt.autoReconnectDesc}
              icon="🔄"
            />
            */}
          </div>

          {/* System Information Section */}
          <SectionHeader icon={Info} title={txt.systemInfo} color="success" />

          <div className="surface-primary rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-primary shadow-sm mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Shield size={24} className="text-brand" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-primary">{txt.aboutBantayBot}</h3>
            </div>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-3 sm:mb-4">
              {txt.aboutDesc}
            </p>
            <div className="pt-3 sm:pt-4 border-t border-primary text-center">
              <div className="text-xs sm:text-sm font-semibold text-brand">{txt.developedBy}</div>
              <div className="text-[10px] sm:text-xs text-secondary mt-1">Version 1.3.5</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
            <div data-tour="settings-save">
              <button
                onClick={saveSettings}
                disabled={isLoading}
                className={`
                  w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg text-white transition-all shadow-md
                  ${isLoading
                    ? 'bg-tertiary text-secondary cursor-not-allowed opacity-60'
                    : 'bg-success hover:bg-success/90 cursor-pointer hover:shadow-lg active:scale-[0.98]'
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} />
                  <span>{isLoading ? txt.saving : txt.saveSettings}</span>
                </span>
              </button>
            </div>

            <button
              onClick={resetToDefaults}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base surface-primary border-2 border-primary text-secondary hover:bg-tertiary transition-all cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={18} />
                <span>{txt.resetDefaults}</span>
              </span>
            </button>

            {/* Reset Tour Button */}
            <div data-tour="settings-reset-tour">
              <button
                onClick={() => {
                  resetAllTours();
                  showAlert(txt.tourReset, txt.tourResetMsg);
                }}
                className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base surface-primary border-2 border-info/30 text-info hover:bg-info/10 transition-all cursor-pointer"
              >
                <span className="flex items-center justify-center gap-2">
                  <HelpCircle size={18} />
                  <span>{txt.resetTour}</span>
                </span>
              </button>
              <p className="text-[10px] sm:text-xs text-secondary text-center mt-1">{txt.resetTourDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
