import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../i18n/translations';
import {
  InputCard,
  ToggleCard,
  ConnectionTestCard,
  SpeakerControl
} from '../components/ui';
import ConfigService from '../services/ConfigService';
import ConnectionManager from '../services/ConnectionManager';
import NetworkDiscoveryService from '../services/NetworkDiscoveryService';

export default function Settings({ language, onLanguageChange }) {
  const { currentTheme, isDark, toggleTheme } = useTheme();
  const t = translations[language];

  // Configuration state
  const [config, setConfig] = useState({
    cameraIP: '',
    cameraPort: '',
    mainBoardIP: '',
    mainBoardPort: '',
    updateInterval: '',
    notifications: true,
    autoReconnect: true,
    volume: 1.0,
    isMuted: false
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
      resetConfirm: 'Reset all settings?'
    },
    tl: {
      title: 'Settings',
      subtitle: 'I-configure ang BantayBot',
      connectionSettings: 'Koneksyon',
      cameraIP: 'Camera IP',
      cameraIPDesc: 'Camera ESP32-CAM IP',
      cameraPort: 'Camera Port',
      cameraPortDesc: 'Port ng Camera',
      mainIP: 'Main Board IP',
      mainIPDesc: 'Main Control ESP32 IP',
      mainPort: 'Main Port',
      mainPortDesc: 'Port ng Main Board',
      updateInterval: 'Update Interval',
      updateIntervalDesc: 'Sensor update (ms)',
      autoDiscovery: 'Auto-Discovery',
      autoDiscoveryDesc: 'I-scan ang network',
      scanNetwork: 'Scan',
      connectionTest: 'Test Koneksyon',
      connectionTestDesc: 'Test ESP32 connection',
      testConnections: 'Test',
      speakerAudio: 'Audio',
      appPreferences: 'Preferences',
      language: 'Wika',
      switchToTagalog: 'Tagalog',
      switchToEnglish: 'English',
      notifications: 'Notifications',
      notificationsDesc: 'Motion alerts',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Madilim na tema',
      autoReconnect: 'Auto Reconnect',
      autoReconnectDesc: 'Auto reconnect',
      systemInfo: 'Tungkol',
      aboutBantayBot: 'BantayBot',
      aboutDesc: 'Solar-powered scarecrow na may sensors at mobile monitoring.',
      developedBy: 'PUP-Lopez BSIT',
      saveSettings: 'I-save',
      saving: 'Sine-save...',
      resetDefaults: 'Reset',
      success: 'Saved',
      successMsg: 'Na-save!',
      failed: 'Nabigo',
      failedMsg: 'Nabigo. Subukan muli.',
      connectionSuccess: 'Konektado',
      connectionSuccessMsg: 'Nakakonekta!',
      connectionFailed: 'Nabigo',
      devicesFound: 'Nakita!',
      noDevicesFound: 'Walang Nakita',
      noDevicesMsg: 'Walang devices. Check ESP32.',
      scanError: 'Error',
      languageUpdated: 'Na-update',
      resetConfirm: 'Reset lahat?'
    }
  };

  const txt = texts[language] || texts.en;

  useEffect(() => {
    loadSettings();
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
        autoReconnect: currentConfig.autoReconnect,
        volume: currentConfig.volume,
        isMuted: currentConfig.isMuted
      });
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
        autoReconnect: config.autoReconnect,
        volume: config.volume,
        isMuted: config.isMuted
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
          autoReconnect: defaults.autoReconnect,
          volume: defaults.volume,
          isMuted: defaults.isMuted
        });
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

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  // Section Header Component
  const SectionHeader = ({ icon, title, color = 'brand', first = false }) => (
    <div className={`flex items-center gap-2 mb-2 sm:mb-3 ${first ? 'mt-0' : 'mt-4 sm:mt-6'}`}>
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-${color}/20 flex items-center justify-center`}>
        <span className="text-sm sm:text-base">{icon}</span>
      </div>
      <h2 className="text-sm sm:text-base font-bold text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary pb-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4">
          <div className="flex items-center mb-1 sm:mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-xl sm:text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{txt.title}</h1>
              <p className="text-xs sm:text-sm text-secondary">{txt.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4">
          {/* Connection Settings Section */}
          <SectionHeader icon="📡" title={txt.connectionSettings} color="info" first={true} />

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

            {/* Network Discovery */}
            <ConnectionTestCard
              title={txt.autoDiscovery}
              description={txt.autoDiscoveryDesc}
              buttonText={txt.scanNetwork}
              onTest={scanNetwork}
              isLoading={isScanning}
            />

            {/* Connection Test */}
            <ConnectionTestCard
              title={txt.connectionTest}
              description={txt.connectionTestDesc}
              buttonText={txt.testConnections}
              onTest={testConnection}
              testResults={connectionStatus}
              isLoading={isLoading}
            />
          </div>

          {/* Speaker & Audio Section */}
          <SectionHeader icon="🔊" title={txt.speakerAudio} color="warning" />
          <SpeakerControl
            volume={config.volume}
            onVolumeChange={(value) => updateConfig('volume', value)}
            isMuted={config.isMuted}
            onMuteToggle={() => updateConfig('isMuted', !config.isMuted)}
          />

          {/* App Preferences Section */}
          <SectionHeader icon="📱" title={txt.appPreferences} color="brand" />

          <div className="space-y-2 sm:space-y-3">
            {/* Language Toggle */}
            <div className="surface-primary rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-primary shadow-sm">
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

            <ToggleCard
              title={txt.notifications}
              value={config.notifications}
              onValueChange={(value) => updateConfig('notifications', value)}
              description={txt.notificationsDesc}
              icon="🔔"
            />

            <ToggleCard
              title={txt.darkMode}
              value={isDark}
              onValueChange={toggleTheme}
              description={txt.darkModeDesc}
              icon="🌙"
            />

            <ToggleCard
              title={txt.autoReconnect}
              value={config.autoReconnect}
              onValueChange={(value) => updateConfig('autoReconnect', value)}
              description={txt.autoReconnectDesc}
              icon="🔄"
            />
          </div>

          {/* System Information Section */}
          <SectionHeader icon="ℹ️" title={txt.systemInfo} color="success" />

          <div className="surface-primary rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-primary shadow-sm mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-primary">{txt.aboutBantayBot}</h3>
            </div>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-3 sm:mb-4">
              {txt.aboutDesc}
            </p>
            <div className="pt-3 sm:pt-4 border-t border-primary text-center">
              <div className="text-xs sm:text-sm font-semibold text-brand">{txt.developedBy}</div>
              <div className="text-[10px] sm:text-xs text-secondary mt-1">Version 1.0.0</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
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
                <span>✅</span>
                <span>{isLoading ? txt.saving : txt.saveSettings}</span>
              </span>
            </button>

{/*             <button
              onClick={resetToDefaults}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base surface-primary border-2 border-primary text-secondary hover:bg-tertiary transition-all cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🔄</span>
                <span>{txt.resetDefaults}</span>
              </span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
