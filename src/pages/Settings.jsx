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
      subtitle: 'Configure your BantayBot',
      connectionSettings: 'Connection Settings',
      cameraIP: 'Camera Board IP Address',
      cameraIPDesc: 'The IP address of Camera ESP32-CAM',
      cameraPort: 'Camera Board Port',
      cameraPortDesc: 'Camera Board Port',
      mainIP: 'Main Board IP Address',
      mainIPDesc: 'The IP address of Main Control ESP32',
      mainPort: 'Main Board Port',
      mainPortDesc: 'Main Board Port',
      updateInterval: 'Update Interval (ms)',
      updateIntervalDesc: 'How often to request sensor updates',
      autoDiscovery: 'Auto-Discovery',
      autoDiscoveryDesc: 'Scan network to find BantayBot devices automatically',
      scanNetwork: 'Scan Network',
      connectionTest: 'Connection Test',
      connectionTestDesc: 'Test connection to ESP32 boards',
      testConnections: 'Test Connections',
      speakerAudio: 'Speaker & Audio',
      appPreferences: 'App Preferences',
      language: 'Language',
      switchToTagalog: 'Switch to Tagalog',
      switchToEnglish: 'Switch to English',
      notifications: 'Push Notifications',
      notificationsDesc: 'Receive alerts when motion is detected',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Switch to dark theme',
      autoReconnect: 'Auto Reconnect',
      autoReconnectDesc: 'Automatically try to reconnect when connection is lost',
      systemInfo: 'System Information',
      aboutBantayBot: 'About BantayBot',
      aboutDesc: 'A solar-powered automated scarecrow with integrated sensors and mobile monitoring for crop protection.',
      developedBy: 'Developed by PUP-Lopez BSIT Students',
      saveSettings: 'Save Settings',
      saving: 'Saving...',
      resetDefaults: 'Reset to Defaults',
      success: 'Settings Saved',
      successMsg: 'Your settings have been saved successfully!',
      failed: 'Save Failed',
      failedMsg: 'Failed to save settings. Please try again.',
      connectionSuccess: 'Connection Success',
      connectionSuccessMsg: 'Successfully connected to Camera and Main Board!',
      connectionFailed: 'Connection Failed',
      devicesFound: 'Devices Found!',
      noDevicesFound: 'No Devices Found',
      noDevicesMsg: 'No BantayBot devices found. Make sure ESP32 boards are powered on.',
      scanError: 'Scan Error',
      languageUpdated: 'Language Updated',
      resetConfirm: 'This will reset all settings to default values. Continue?'
    },
    tl: {
      title: 'Mga Setting',
      subtitle: 'I-configure ang inyong BantayBot',
      connectionSettings: 'Mga Setting ng Koneksyon',
      cameraIP: 'Camera Board IP Address',
      cameraIPDesc: 'Ang IP address ng Camera ESP32-CAM',
      cameraPort: 'Camera Board Port',
      cameraPortDesc: 'Port ng Camera Board',
      mainIP: 'Main Board IP Address',
      mainIPDesc: 'Ang IP address ng Main Control ESP32',
      mainPort: 'Main Board Port',
      mainPortDesc: 'Port ng Main Board',
      updateInterval: 'Update Interval (ms)',
      updateIntervalDesc: 'Gaano kadalas hilingin ang sensor updates',
      autoDiscovery: 'Auto-Discovery',
      autoDiscoveryDesc: 'I-scan ang network para hanapin ang BantayBot devices',
      scanNetwork: 'I-scan ang Network',
      connectionTest: 'Test ng Koneksyon',
      connectionTestDesc: 'Subukan ang koneksyon sa mga ESP32 boards',
      testConnections: 'Subukan ang Koneksyon',
      speakerAudio: 'Speaker & Audio',
      appPreferences: 'Mga Preference ng App',
      language: 'Wika',
      switchToTagalog: 'Lumipat sa Tagalog',
      switchToEnglish: 'Lumipat sa English',
      notifications: 'Push Notifications',
      notificationsDesc: 'Makatanggap ng alerts kapag may motion',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Lumipat sa madilim na tema',
      autoReconnect: 'Auto Reconnect',
      autoReconnectDesc: 'Awtomatikong subukang muling kumonekta kapag nawala ang koneksyon',
      systemInfo: 'Impormasyon ng Sistema',
      aboutBantayBot: 'Tungkol sa BantayBot',
      aboutDesc: 'Isang solar-powered automated scarecrow na may integrated sensors at mobile monitoring para sa proteksyon ng pananim.',
      developedBy: 'Ginawa ng PUP-Lopez BSIT Students',
      saveSettings: 'I-save ang Settings',
      saving: 'Sine-save...',
      resetDefaults: 'I-reset sa Defaults',
      success: 'Tagumpay',
      successMsg: 'Matagumpay na nai-save ang inyong mga setting!',
      failed: 'Nabigo',
      failedMsg: 'Nabigong i-save ang mga setting. Subukan muli.',
      connectionSuccess: 'Tagumpay ang Koneksyon',
      connectionSuccessMsg: 'Matagumpay na nakakonekta sa Camera at Main Board!',
      connectionFailed: 'Nabigong Koneksyon',
      devicesFound: 'Nakita!',
      noDevicesFound: 'Walang Nakita',
      noDevicesMsg: 'Walang BantayBot devices na nakita. Siguraduhing naka-on ang ESP32 boards.',
      scanError: 'Error sa Scan',
      languageUpdated: 'Na-update ang Wika',
      resetConfirm: 'Ire-reset nito ang lahat ng settings sa default values. Magpatuloy?'
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
      showAlert('Error', 'Failed to load settings');
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
      console.error('Save settings error:', error);
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
        if (!cameraSuccess) failedBoards.push('Camera Board');
        if (!mainSuccess) failedBoards.push('Main Board');
        showAlert(txt.connectionFailed, `Could not connect to ${failedBoards.join(' and ')}.`);
      }
    } catch (error) {
      setConnectionStatus({ camera: 'Failed', mainBoard: 'Failed' });
      showAlert(txt.connectionFailed, 'Error testing connection');
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

        showAlert(txt.devicesFound, `Found ${devices.length} BantayBot device(s)!`);
      } else {
        showAlert(txt.noDevicesFound, txt.noDevicesMsg);
      }
    } catch (error) {
      showAlert(txt.scanError, 'Error scanning network');
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
    showAlert(txt.languageUpdated, `Language set to ${newLang === 'tl' ? 'Tagalog' : 'English'}`);
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
  const SectionHeader = ({ icon, title, color = 'brand' }) => (
    <div className="flex items-center gap-2 mb-4 mt-8">
      <div className={`w-8 h-8 rounded-lg bg-${color}/20 flex items-center justify-center`}>
        <span className="text-base">{icon}</span>
      </div>
      <h2 className="text-base font-bold text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary pb-24">
      {/* Header */}
      <div className="pt-16 pb-4 px-4">
        <div className="flex items-center mb-2">
          <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-3">
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{txt.title}</h1>
            <p className="text-sm text-secondary">{txt.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Connection Settings Section */}
        <SectionHeader icon="📡" title={txt.connectionSettings} color="info" />

        <div className="space-y-3">
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
            style={{ borderLeft: '4px solid var(--color-warning)' }}
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

        <div className="space-y-3">
          {/* Language Toggle */}
          <div className="surface-primary rounded-2xl p-4 border border-primary shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌐</span>
                <span className="text-sm text-secondary">{txt.language}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                {language === 'tl' ? 'Tagalog' : 'English'}
              </span>
            </div>
            <button
              onClick={toggleLanguage}
              className="w-full py-3 px-4 bg-tertiary border border-primary rounded-xl text-brand font-semibold transition-all hover:bg-brand/10 cursor-pointer"
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

        <div className="surface-primary rounded-2xl p-5 border border-primary shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-primary">{txt.aboutBantayBot}</h3>
          </div>
          <p className="text-sm text-secondary leading-relaxed mb-4">
            {txt.aboutDesc}
          </p>
          <div className="pt-4 border-t border-primary text-center">
            <div className="text-sm font-semibold text-brand">{txt.developedBy}</div>
            <div className="text-xs text-secondary mt-1">Version 1.0.0</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <button
            onClick={saveSettings}
            disabled={isLoading}
            className={`
              w-full py-4 px-6 rounded-2xl font-bold text-lg text-white transition-all shadow-md
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

          <button
            onClick={resetToDefaults}
            className="w-full py-4 px-6 rounded-2xl font-semibold surface-primary border-2 border-primary text-secondary hover:bg-tertiary transition-all cursor-pointer"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🔄</span>
              <span>{txt.resetDefaults}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
