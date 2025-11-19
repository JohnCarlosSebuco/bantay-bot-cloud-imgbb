/**
 * Connection Manager for Web PWA
 *
 * Automatically switches between:
 * - Local WebSocket (when on same network) - Fast, low latency
 * - Remote Firebase (when on different networks) - Cloud-based
 *
 * Provides unified interface for sending commands regardless of connection mode
 */

import WebSocketService from './WebSocketService';
import FirebaseService from './FirebaseService';
import { DEVICE_CONFIG } from '../config/hardware.config';

class ConnectionManager {
  constructor() {
    this.mode = 'none';  // 'local', 'remote', or 'none'
    this.listeners = [];
    this.statusListeners = [];
    this.isConnecting = false;
    this.localAttempts = 0;
    this.maxLocalAttempts = 2;
    this.connectionInterval = null;
  }

  /**
   * Initialize connection manager
   * Tries local first, then falls back to Firebase
   */
  async initialize() {
    if (this.isConnecting) {
      console.log('[ConnectionManager] Already connecting...');
      return;
    }

    this.isConnecting = true;
    console.log('[ConnectionManager] 🚀 Initializing connection...');

    // Try local WebSocket first
    const localSuccess = await this.tryLocalConnection();

    if (localSuccess) {
      this.mode = 'local';
      this.notifyListeners({ mode: 'local', connected: true });
      console.log('[ConnectionManager] ✅ Connected in LOCAL mode (WebSocket)');
    } else {
      // Fall back to Firebase
      const remoteSuccess = await this.tryRemoteConnection();

      if (remoteSuccess) {
        this.mode = 'remote';
        this.notifyListeners({ mode: 'remote', connected: true });
        console.log('[ConnectionManager] ✅ Connected in REMOTE mode (Firebase)');
      } else {
        this.mode = 'none';
        this.notifyListeners({ mode: 'none', connected: false });
        console.log('[ConnectionManager] ❌ Failed to connect in both modes');
      }
    }

    this.isConnecting = false;
    this.startConnectionMonitoring();
  }

  /**
   * Try to establish local WebSocket connection
   * @returns {Promise<boolean>}
   */
  async tryLocalConnection() {
    try {
      console.log('[ConnectionManager] 🔍 Trying local WebSocket connection...');

      // Try HTTP ping first to check if ESP32 is reachable
      const isReachable = await this.pingDevice();

      if (!isReachable) {
        console.log('[ConnectionManager] ⚠️  ESP32 not reachable on local network');
        return false;
      }

      // Connect WebSocket
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[ConnectionManager] ⏱️  Local connection timeout');
          resolve(false);
        }, 5000);

        const onConnect = (status) => {
          clearTimeout(timeout);
          WebSocketService.off('connected', onConnect);
          if (status) {
            console.log('[ConnectionManager] ✅ Local WebSocket connected');
            resolve(true);
          } else {
            resolve(false);
          }
        };

        WebSocketService.on('connected', onConnect);
        WebSocketService.connect();
      });
    } catch (error) {
      console.error('[ConnectionManager] ❌ Local connection failed:', error);
      return false;
    }
  }

  /**
   * Try to establish remote Firebase connection
   * @returns {Promise<boolean>}
   */
  async tryRemoteConnection() {
    try {
      console.log('[ConnectionManager] 🌐 Trying remote Firebase connection...');

      // Initialize Firebase
      await FirebaseService.initialize();

      // Test Firebase connection
      const testSuccess = await FirebaseService.testConnection();

      if (testSuccess) {
        // Start listening to status updates
        FirebaseService.onStatusUpdate((status) => {
          this.notifyStatusListeners(status);
        });

        console.log('[ConnectionManager] ✅ Firebase connected');
        return true;
      } else {
        console.log('[ConnectionManager] ⚠️  Firebase test failed');
        return false;
      }
    } catch (error) {
      console.error('[ConnectionManager] ❌ Firebase connection failed:', error);
      return false;
    }
  }

  /**
   * Ping device via HTTP to check reachability
   * @returns {Promise<boolean>}
   */
  async pingDevice() {
    try {
      const response = await fetch(`http://${DEVICE_CONFIG.ESP32_IP}/status`, {
        method: 'GET',
        timeout: 3000,
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send command using current connection mode
   * @param {string} command - Command name
   * @param {any} value - Command value (optional)
   * @returns {Promise<boolean>}
   */
  async sendCommand(command, value = null) {
    console.log(`[ConnectionManager] 📤 Sending command: ${command} (mode: ${this.mode})`);

    if (this.mode === 'local') {
      // Send via WebSocket
      const message = {
        command: command,
        value: value,
        timestamp: Date.now()
      };
      WebSocketService.send(message);
      return true;
    } else if (this.mode === 'remote') {
      // Send via Firebase
      return await FirebaseService.sendCommand(command, value);
    } else {
      console.error('[ConnectionManager] ❌ No active connection');
      return false;
    }
  }

  /**
   * Listen to connection status changes
   * @param {function} callback - Called with {mode, connected}
   */
  onConnectionChange(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Listen to device status updates (sensor data, etc.)
   * @param {function} callback - Called with status object
   */
  onStatusUpdate(callback) {
    this.statusListeners.push(callback);

    // If already in local mode, subscribe to WebSocket data
    if (this.mode === 'local') {
      WebSocketService.on('data', callback);
    }

    // Return unsubscribe function
    return () => {
      this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
      if (this.mode === 'local') {
        WebSocketService.off('data', callback);
      }
    };
  }

  /**
   * Notify connection status listeners
   */
  notifyListeners(status) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[ConnectionManager] Error in listener:', error);
      }
    });
  }

  /**
   * Notify status update listeners
   */
  notifyStatusListeners(status) {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[ConnectionManager] Error in status listener:', error);
      }
    });
  }

  /**
   * Start monitoring connection health
   */
  startConnectionMonitoring() {
    this.stopConnectionMonitoring();

    this.connectionInterval = setInterval(async () => {
      if (this.mode === 'local') {
        // Check if local connection is still alive
        const isAlive = await this.pingDevice();
        if (!isAlive) {
          console.log('[ConnectionManager] 🔄 Local connection lost, switching to remote...');
          await this.switchToRemote();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop connection monitoring
   */
  stopConnectionMonitoring() {
    if (this.connectionInterval) {
      clearInterval(this.connectionInterval);
      this.connectionInterval = null;
    }
  }

  /**
   * Switch to local mode (manual override)
   */
  async switchToLocal() {
    console.log('[ConnectionManager] 🔄 Switching to local mode...');

    // Disconnect Firebase if active
    if (this.mode === 'remote') {
      FirebaseService.stopStatusListener();
    }

    const success = await this.tryLocalConnection();
    if (success) {
      this.mode = 'local';
      this.notifyListeners({ mode: 'local', connected: true });
    }
    return success;
  }

  /**
   * Switch to remote mode (manual override)
   */
  async switchToRemote() {
    console.log('[ConnectionManager] 🔄 Switching to remote mode...');

    // Disconnect WebSocket if active
    if (this.mode === 'local') {
      WebSocketService.disconnect();
    }

    const success = await this.tryRemoteConnection();
    if (success) {
      this.mode = 'remote';
      this.notifyListeners({ mode: 'remote', connected: true });
    }
    return success;
  }

  /**
   * Disconnect current connection
   */
  disconnect() {
    console.log('[ConnectionManager] 🔌 Disconnecting...');
    this.stopConnectionMonitoring();

    if (this.mode === 'local') {
      WebSocketService.disconnect();
    } else if (this.mode === 'remote') {
      FirebaseService.stopStatusListener();
    }

    this.mode = 'none';
    this.notifyListeners({ mode: 'none', connected: false });
  }

  /**
   * Reconnect using auto-detection
   */
  async reconnect() {
    console.log('[ConnectionManager] 🔄 Reconnecting...');
    this.disconnect();
    await this.initialize();
  }

  /**
   * Get current connection mode
   * @returns {string} - 'local', 'remote', or 'none'
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.mode !== 'none';
  }

  /**
   * Get connection info for UI display
   * @returns {object}
   */
  getConnectionInfo() {
    return {
      mode: this.mode,
      connected: this.isConnected(),
      description: this.mode === 'local'
        ? 'Connected locally (same network)'
        : this.mode === 'remote'
        ? 'Connected remotely (via cloud)'
        : 'Not connected'
    };
  }
}

// Export singleton instance
export default new ConnectionManager();