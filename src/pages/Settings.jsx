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

      // Validate configuration
      const validation = ConfigService.validate(updateConfig);
      if (!validation.isValid) {
        setErrors({ general: validation.errors.join(', ') });
        return;
      }

      await ConfigService.update(updateConfig);
      setErrors({});

      showAlert(
        language === 'tl' ? 'Tagumpay' : 'Settings Saved',
        language === 'tl' ? 'Matagumpay na nai-save ang inyong mga setting!' : 'Your settings have been saved successfully!'
      );
    } catch (error) {
      console.error('Save settings error:', error);
      showAlert(
        language === 'tl' ? 'Nabigo' : 'Save Failed',
        language === 'tl' ? 'Nabigong i-save ang mga setting. Subukan muli.' : 'Failed to save settings. Please try again.'
      );
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

      // Test both connections
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
        showAlert(
          language === 'tl' ? 'Tagumpay ang Koneksyon' : 'Connection Success',
          language === 'tl'
            ? 'Matagumpay na nakakonekta sa Camera at Main Board!'
            : 'Successfully connected to Camera and Main Board!'
        );
      } else {
        const failedBoards = [];
        if (!cameraSuccess) failedBoards.push('Camera Board');
        if (!mainSuccess) failedBoards.push('Main Board');

        showAlert(
          language === 'tl' ? 'Nabigong Koneksyon' : 'Connection Failed',
          language === 'tl'
            ? `Hindi makakonekta sa ${failedBoards.join(' at ')}. Pakisuri:\n• Naka-on ang ESP32\n• Parehong WiFi network\n• Tama ang IP address`
            : `Could not connect to ${failedBoards.join(' and ')}. Please check:\n• ESP32 is powered on\n• Both devices are on same WiFi\n• IP address is correct`
        );
      }
    } catch (error) {
      setConnectionStatus({ camera: 'Failed', mainBoard: 'Failed' });
      showAlert(
        language === 'tl' ? 'Nabigong Koneksyon' : 'Connection Failed',
        language === 'tl' ? 'May error sa pagtest ng koneksyon' : 'Error testing connection'
      );
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

      const devices = await NetworkDiscoveryService.smartDiscover(
        baseIP,
        (progress) => {
          setScanProgress(progress);
        }
      );

      setFoundDevices(devices);

      if (devices.length > 0) {
        // Auto-fill IPs if found
        const cameraDevice = devices.find(d => d.type === 'camera');
        const mainDevice = devices.find(d => d.type === 'main');

        if (cameraDevice) {
          setConfig(prev => ({ ...prev, cameraIP: cameraDevice.ip }));
        }
        if (mainDevice) {
          setConfig(prev => ({ ...prev, mainBoardIP: mainDevice.ip }));
        }

        showAlert(
          language === 'tl' ? 'Nakita!' : 'Devices Found!',
          language === 'tl'
            ? `Nakita ang ${devices.length} BantayBot device(s)!`
            : `Found ${devices.length} BantayBot device(s)!`
        );
      } else {
        showAlert(
          language === 'tl' ? 'Walang Nakita' : 'No Devices Found',
          language === 'tl'
            ? 'Walang BantayBot devices na nakita. Siguraduhing naka-on ang ESP32 boards.'
            : 'No BantayBot devices found. Make sure ESP32 boards are powered on.'
        );
      }
    } catch (error) {
      showAlert(
        language === 'tl' ? 'Error sa Scan' : 'Scan Error',
        language === 'tl' ? 'May error sa pag-scan ng network' : 'Error scanning network'
      );
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const resetToDefaults = () => {
    const confirmed = window.confirm(
      language === 'tl'
        ? 'Ire-reset nito ang lahat ng settings sa default values. Magpatuloy?'
        : 'This will reset all settings to default values. Continue?'
    );

    if (confirmed) {
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
    showAlert(
      language === 'tl' ? 'Na-update ang Wika' : 'Language Updated',
      `Language set to ${newLang === 'tl' ? 'Tagalog' : 'English'}`
    );
  };

  const showAlert = (title, message) => {
    // Simple alert for now - could be enhanced with custom modal
    alert(`${title}\n\n${message}`);
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    // Clear any existing errors for this field
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: currentTheme.colors.background,
    padding: currentTheme.spacing['4'] + 'px',
    paddingBottom: '100px' // Account for bottom nav
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: currentTheme.spacing['8'] + 'px'
  };

  const titleStyle = {
    fontSize: currentTheme.typography.sizes['3xl'],
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing['2'] + 'px'
  };

  const subtitleStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    fontWeight: currentTheme.typography.weights.medium
  };

  const sectionStyle = {
    marginBottom: currentTheme.spacing['6'] + 'px'
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['4'] + 'px'
  };

  const sectionTitleStyle = {
    fontSize: currentTheme.typography.sizes.lg,
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          ⚙️ {language === 'tl' ? 'Mga Setting' : 'Settings'}
        </h1>
        <p style={subtitleStyle}>
          {language === 'tl' ? 'I-configure ang inyong BantayBot' : 'Configure your BantayBot'}
        </p>
      </div>

      {/* Connection Settings Section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={{ fontSize: '20px', color: currentTheme.colors.info }}>📡</span>
          <span style={sectionTitleStyle}>
            {language === 'tl' ? 'Mga Setting ng Koneksyon' : 'Connection Settings'}
          </span>
        </div>

        <InputCard
          title={language === 'tl' ? 'Camera Board IP Address' : 'Camera Board IP Address'}
          value={config.cameraIP}
          onChangeText={(value) => updateConfig('cameraIP', value)}
          placeholder="172.24.26.144"
          keyboardType="text"
          description={language === 'tl' ? 'Ang IP address ng Camera ESP32-CAM' : 'The IP address of Camera ESP32-CAM'}
          icon="📷"
          error={errors.cameraIP}
        />

        <InputCard
          title={language === 'tl' ? 'Camera Board Port' : 'Camera Board Port'}
          value={config.cameraPort}
          onChangeText={(value) => updateConfig('cameraPort', value)}
          placeholder="80"
          keyboardType="numeric"
          description={language === 'tl' ? 'Port ng Camera Board' : 'Camera Board Port'}
          icon="📻"
          error={errors.cameraPort}
        />

        <InputCard
          title={language === 'tl' ? 'Main Board IP Address' : 'Main Board IP Address'}
          value={config.mainBoardIP}
          onChangeText={(value) => updateConfig('mainBoardIP', value)}
          placeholder="172.24.26.193"
          keyboardType="text"
          description={language === 'tl' ? 'Ang IP address ng Main Control ESP32' : 'The IP address of Main Control ESP32'}
          icon="🔧"
          error={errors.mainBoardIP}
        />

        <InputCard
          title={language === 'tl' ? 'Main Board Port' : 'Main Board Port'}
          value={config.mainBoardPort}
          onChangeText={(value) => updateConfig('mainBoardPort', value)}
          placeholder="81"
          keyboardType="numeric"
          description={language === 'tl' ? 'Port ng Main Board' : 'Main Board Port'}
          icon="📻"
          error={errors.mainBoardPort}
        />

        <InputCard
          title={language === 'tl' ? 'Update Interval (ms)' : 'Update Interval (ms)'}
          value={config.updateInterval}
          onChangeText={(value) => updateConfig('updateInterval', value)}
          placeholder="1000"
          keyboardType="numeric"
          description={language === 'tl' ? 'Gaano kadalas hilingin ang sensor updates' : 'How often to request sensor updates'}
          icon="⏱️"
          error={errors.updateInterval}
        />

        {/* Network Discovery */}
        <ConnectionTestCard
          title={language === 'tl' ? 'Auto-Discovery' : 'Auto-Discovery'}
          description={language === 'tl'
            ? 'I-scan ang network para hanapin ang BantayBot devices'
            : 'Scan network to find BantayBot devices automatically'}
          buttonText={language === 'tl' ? 'I-scan ang Network' : 'Scan Network'}
          onTest={scanNetwork}
          isLoading={isScanning}
          style={{
            borderLeft: `4px solid ${currentTheme.colors.warning}`,
          }}
        />

        {/* Connection Test */}
        <ConnectionTestCard
          title={language === 'tl' ? 'Test ng Koneksyon' : 'Connection Test'}
          description={language === 'tl'
            ? 'Subukan ang koneksyon sa mga ESP32 boards'
            : 'Test connection to ESP32 boards'}
          buttonText={language === 'tl' ? 'Subukan ang Koneksyon' : 'Test Connections'}
          onTest={testConnection}
          testResults={connectionStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Speaker & Audio Section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={{ fontSize: '20px', color: currentTheme.colors.warning }}>🔊</span>
          <span style={sectionTitleStyle}>
            {language === 'tl' ? 'Speaker & Audio' : 'Speaker & Audio'}
          </span>
        </div>
        <SpeakerControl
          volume={config.volume}
          onVolumeChange={(value) => updateConfig('volume', value)}
          isMuted={config.isMuted}
          onMuteToggle={() => updateConfig('isMuted', !config.isMuted)}
        />
      </div>

      {/* App Preferences Section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={{ fontSize: '20px', color: currentTheme.colors.primary }}>📱</span>
          <span style={sectionTitleStyle}>
            {language === 'tl' ? 'Mga Preference ng App' : 'App Preferences'}
          </span>
        </div>

        {/* Language Toggle */}
        <div style={{
          backgroundColor: currentTheme.colors.surface,
          borderRadius: currentTheme.borderRadius.xl + 'px',
          padding: currentTheme.spacing['4'] + 'px',
          marginBottom: currentTheme.spacing['3'] + 'px',
          boxShadow: currentTheme.shadows.sm,
          border: `1px solid ${currentTheme.colors.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: currentTheme.spacing['2'] + 'px'
          }}>
            <span style={{
              fontSize: currentTheme.typography.sizes.sm,
              color: currentTheme.colors.textSecondary
            }}>
              🌐 {language === 'tl' ? 'Wika' : 'Language'}
            </span>
            <span style={{
              fontSize: currentTheme.typography.sizes.sm,
              fontWeight: currentTheme.typography.weights.medium,
              color: currentTheme.colors.text
            }}>
              {language === 'tl' ? 'Tagalog' : 'English'}
            </span>
          </div>
          <button
            onClick={toggleLanguage}
            style={{
              width: '100%',
              padding: `${currentTheme.spacing['3']}px ${currentTheme.spacing['4']}px`,
              backgroundColor: currentTheme.colors.background,
              border: `1px solid ${currentTheme.colors.border}`,
              borderRadius: currentTheme.borderRadius.lg + 'px',
              color: currentTheme.colors.primary,
              fontSize: currentTheme.typography.sizes.md,
              fontWeight: currentTheme.typography.weights.semibold,
              cursor: 'pointer',
              transition: `all ${currentTheme.animations.duration.fast}`
            }}
          >
            {language === 'tl' ? 'Lumipat sa English' : 'Switch to Tagalog'}
          </button>
        </div>

        <ToggleCard
          title={language === 'tl' ? 'Push Notifications' : 'Push Notifications'}
          value={config.notifications}
          onValueChange={(value) => updateConfig('notifications', value)}
          description={language === 'tl' ? 'Makatanggap ng alerts kapag may motion' : 'Receive alerts when motion is detected'}
          icon="🔔"
        />

        <ToggleCard
          title={language === 'tl' ? 'Dark Mode' : 'Dark Mode'}
          value={isDark}
          onValueChange={toggleTheme}
          description={language === 'tl' ? 'Lumipat sa madilim na tema' : 'Switch to dark theme'}
          icon="🌙"
        />

        <ToggleCard
          title={language === 'tl' ? 'Auto Reconnect' : 'Auto Reconnect'}
          value={config.autoReconnect}
          onValueChange={(value) => updateConfig('autoReconnect', value)}
          description={language === 'tl'
            ? 'Awtomatikong subukang muling kumonekta kapag nawala ang koneksyon'
            : 'Automatically try to reconnect when connection is lost'}
          icon="🔄"
        />
      </div>

      {/* System Information Section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={{ fontSize: '20px', color: currentTheme.colors.success }}>ℹ️</span>
          <span style={sectionTitleStyle}>
            {language === 'tl' ? 'Impormasyon ng Sistema' : 'System Information'}
          </span>
        </div>

        <div style={{
          backgroundColor: currentTheme.colors.surface,
          borderRadius: currentTheme.borderRadius.xl + 'px',
          padding: currentTheme.spacing['5'] + 'px',
          boxShadow: currentTheme.shadows.sm,
          border: `1px solid ${currentTheme.colors.border}`,
          marginBottom: currentTheme.spacing['3'] + 'px'
        }}>
          <h3 style={{
            fontSize: currentTheme.typography.sizes.xl,
            fontWeight: currentTheme.typography.weights.bold,
            color: currentTheme.colors.text,
            marginBottom: currentTheme.spacing['3'] + 'px'
          }}>
            🛡️ {language === 'tl' ? 'Tungkol sa BantayBot' : 'About BantayBot'}
          </h3>
          <p style={{
            fontSize: currentTheme.typography.sizes.md,
            color: currentTheme.colors.textSecondary,
            lineHeight: 1.6,
            marginBottom: currentTheme.spacing['3'] + 'px'
          }}>
            {language === 'tl'
              ? 'Isang solar-powered automated scarecrow na may integrated sensors at mobile monitoring para sa proteksyon ng pananim.'
              : 'A solar-powered automated scarecrow with integrated sensors and mobile monitoring for crop protection.'}
          </p>
          <div style={{
            textAlign: 'center',
            paddingTop: currentTheme.spacing['3'] + 'px',
            borderTop: `1px solid ${currentTheme.colors.border}`,
            fontSize: currentTheme.typography.sizes.sm,
            color: currentTheme.colors.primary,
            fontWeight: currentTheme.typography.weights.semibold
          }}>
            {language === 'tl'
              ? 'Ginawa ng PUP-Lopez BSIT Students'
              : 'Developed by PUP-Lopez BSIT Students'}
          </div>
          <div style={{
            textAlign: 'center',
            marginTop: currentTheme.spacing['2'] + 'px',
            fontSize: currentTheme.typography.sizes.sm,
            color: currentTheme.colors.textSecondary
          }}>
            Version 1.0.0
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ paddingBottom: currentTheme.spacing['6'] + 'px' }}>
        <button
          onClick={saveSettings}
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: isLoading ? currentTheme.colors.border : currentTheme.colors.success,
            color: 'white',
            border: 'none',
            borderRadius: currentTheme.borderRadius.xl + 'px',
            padding: `${currentTheme.spacing['4']}px ${currentTheme.spacing['6']}px`,
            fontSize: currentTheme.typography.sizes.lg,
            fontWeight: currentTheme.typography.weights.bold,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: currentTheme.spacing['3'] + 'px',
            boxShadow: currentTheme.shadows.md,
            opacity: isLoading ? 0.6 : 1,
            transition: `all ${currentTheme.animations.duration.normal}`
          }}
        >
          ✅ {isLoading
            ? (language === 'tl' ? 'Sine-save...' : 'Saving...')
            : (language === 'tl' ? 'I-save ang Settings' : 'Save Settings')}
        </button>

        <button
          onClick={resetToDefaults}
          style={{
            width: '100%',
            backgroundColor: currentTheme.colors.surface,
            color: currentTheme.colors.textSecondary,
            border: `2px solid ${currentTheme.colors.border}`,
            borderRadius: currentTheme.borderRadius.xl + 'px',
            padding: `${currentTheme.spacing['4']}px ${currentTheme.spacing['6']}px`,
            fontSize: currentTheme.typography.sizes.md,
            fontWeight: currentTheme.typography.weights.semibold,
            cursor: 'pointer',
            transition: `all ${currentTheme.animations.duration.fast}`
          }}
        >
          🔄 {language === 'tl' ? 'I-reset sa Defaults' : 'Reset to Defaults'}
        </button>
      </div>
    </div>
  );
}
