// Configuration Service for Web PWA
// Manages app settings and preferences using localStorage

class ConfigService {
  constructor() {
    this.storageKey = 'bantaybot-config';
    this.defaults = {
      // Network Configuration
      cameraIP: '172.24.26.144',
      cameraPort: 80,
      mainBoardIP: '172.24.26.193',
      mainBoardPort: 81,
      updateInterval: 1000,

      // Connection Settings
      autoReconnect: true,
      useMDNS: false,
      connectionTimeout: 5000,

      // Audio Settings
      volume: 1.0,
      isMuted: false,

      // App Preferences
      notifications: true,
      language: 'en',
      theme: 'light',

      // System Settings
      debugMode: false,
      logLevel: 'info'
    };

    this.config = null;
    this.listeners = new Set();
  }

  // Initialize configuration service
  async initialize() {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const parsedConfig = JSON.parse(stored);
        // Merge with defaults to handle new config options
        this.config = { ...this.defaults, ...parsedConfig };
      } else {
        this.config = { ...this.defaults };
      }

      // Save merged config back to ensure all defaults are present
      await this.save();

      console.log('[ConfigService] Configuration initialized:', this.config);
      return this.config;
    } catch (error) {
      console.error('[ConfigService] Failed to initialize:', error);
      this.config = { ...this.defaults };
      return this.config;
    }
  }

  // Get current configuration
  get() {
    if (!this.config) {
      console.warn('[ConfigService] Config not initialized, returning defaults');
      return { ...this.defaults };
    }
    return { ...this.config };
  }

  // Get specific config value
  getValue(key, defaultValue = undefined) {
    const config = this.get();
    return config[key] !== undefined ? config[key] : defaultValue;
  }

  // Update configuration (partial update)
  async update(newConfig) {
    if (!this.config) {
      await this.initialize();
    }

    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    try {
      await this.save();
      console.log('[ConfigService] Configuration updated:', newConfig);

      // Notify listeners of the changes
      this.notifyListeners(this.config, oldConfig);

      return this.config;
    } catch (error) {
      // Rollback on error
      this.config = oldConfig;
      console.error('[ConfigService] Failed to update config:', error);
      throw error;
    }
  }

  // Save configuration to localStorage
  async save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      console.log('[ConfigService] Configuration saved to localStorage');
    } catch (error) {
      console.error('[ConfigService] Failed to save config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  // Reset to default configuration
  async reset() {
    const oldConfig = { ...this.config };
    this.config = { ...this.defaults };

    try {
      await this.save();
      console.log('[ConfigService] Configuration reset to defaults');

      // Notify listeners of the reset
      this.notifyListeners(this.config, oldConfig);

      return this.config;
    } catch (error) {
      // Rollback on error
      this.config = oldConfig;
      console.error('[ConfigService] Failed to reset config:', error);
      throw error;
    }
  }

  // Add configuration change listener
  addListener(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of configuration changes
  notifyListeners(newConfig, oldConfig) {
    this.listeners.forEach(callback => {
      try {
        callback(newConfig, oldConfig);
      } catch (error) {
        console.error('[ConfigService] Error in config listener:', error);
      }
    });
  }

  // Validate configuration values
  validate(config) {
    const errors = [];

    // Validate IP addresses
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (config.cameraIP && !ipPattern.test(config.cameraIP)) {
      errors.push('Invalid camera IP address format');
    }

    if (config.mainBoardIP && !ipPattern.test(config.mainBoardIP)) {
      errors.push('Invalid main board IP address format');
    }

    // Validate ports
    if (config.cameraPort && (config.cameraPort < 1 || config.cameraPort > 65535)) {
      errors.push('Camera port must be between 1 and 65535');
    }

    if (config.mainBoardPort && (config.mainBoardPort < 1 || config.mainBoardPort > 65535)) {
      errors.push('Main board port must be between 1 and 65535');
    }

    // Validate update interval
    if (config.updateInterval && config.updateInterval < 100) {
      errors.push('Update interval must be at least 100ms');
    }

    // Validate volume
    if (config.volume !== undefined && (config.volume < 0 || config.volume > 1)) {
      errors.push('Volume must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Export configuration for backup
  export() {
    return {
      config: this.get(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // Import configuration from backup
  async import(exportedConfig) {
    if (!exportedConfig || !exportedConfig.config) {
      throw new Error('Invalid configuration export format');
    }

    const validation = this.validate(exportedConfig.config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    await this.update(exportedConfig.config);
    console.log('[ConfigService] Configuration imported successfully');
    return this.config;
  }

  // Get network configuration specifically
  getNetworkConfig() {
    const config = this.get();
    return {
      cameraIP: config.cameraIP,
      cameraPort: config.cameraPort,
      mainBoardIP: config.mainBoardIP,
      mainBoardPort: config.mainBoardPort,
      updateInterval: config.updateInterval,
      autoReconnect: config.autoReconnect,
      useMDNS: config.useMDNS,
      connectionTimeout: config.connectionTimeout
    };
  }

  // Get audio configuration specifically
  getAudioConfig() {
    const config = this.get();
    return {
      volume: config.volume,
      isMuted: config.isMuted
    };
  }

  // Clear all configuration (for debugging)
  async clear() {
    try {
      localStorage.removeItem(this.storageKey);
      this.config = null;
      console.log('[ConfigService] Configuration cleared');
    } catch (error) {
      console.error('[ConfigService] Failed to clear config:', error);
      throw error;
    }
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;