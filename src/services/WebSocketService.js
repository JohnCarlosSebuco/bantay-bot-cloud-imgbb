/**
 * WebSocket Service for BantayBot PWA
 *
 * Provides local network connectivity to ESP32 boards via WebSocket
 * Falls back to Firebase when not on same network
 */

const CONFIG = {
  // ESP32 Main Board
  ESP32_IP: '192.168.8.100',  // Update this to your ESP32's IP
  ESP32_PORT: '80',
  WEBSOCKET_PATH: '/ws',

  // ESP32-CAM
  CAMERA_ESP32_IP: '192.168.8.101',  // Update this to your ESP32-CAM's IP
  CAMERA_ESP32_PORT: '80',
  CAMERA_WEBSOCKET_PATH: '/ws',

  // Reconnection
  RECONNECT_INTERVAL: 5000,  // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
};

class WebSocketService {
  constructor() {
    // WebSocket connections
    this.mainWs = null;       // Main control board
    this.cameraWs = null;     // Camera board

    // Event listeners
    this.listeners = {};

    // Connection state
    this.mainConnected = false;
    this.cameraConnected = false;
    this.isMainConnecting = false;
    this.isCameraConnecting = false;

    // Reconnection tracking
    this.mainReconnectAttempts = 0;
    this.cameraReconnectAttempts = 0;

    // Polling interval (fallback)
    this.pollingInterval = null;
  }

  /**
   * Connect to both ESP32 boards
   */
  connectAll() {
    this.connectMain();
    this.connectCamera();
  }

  /**
   * Connect to Main Control Board ESP32
   */
  async connectMain(ip = CONFIG.ESP32_IP, port = CONFIG.ESP32_PORT, path = CONFIG.WEBSOCKET_PATH) {
    if (this.isMainConnecting || (this.mainWs && this.mainWs.readyState === WebSocket.OPEN)) {
      console.log('Main board already connecting or connected');
      return;
    }

    this.isMainConnecting = true;
    const url = `ws://${ip}:${port}${path}`;
    console.log('Connecting to Main Board:', url);

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.mainWs) {
            this.mainWs.close();
          }
          console.error('❌ Main Board connection timeout');
          this.isMainConnecting = false;
          resolve(false);
        }
      }, 5000); // 5 second timeout

      try {
        this.mainWs = new WebSocket(url);

        this.mainWs.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log('✅ Main Board WebSocket connected');
            this.isMainConnecting = false;
            this.mainReconnectAttempts = 0;
            this.mainConnected = true;
            this.emit('main_connected', true);
            this.emit('connected', this.isFullyConnected());
            resolve(true);
          }
        };

        this.mainWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('main_data', data);
            this.emit('data', data);  // Legacy compatibility
          } catch (error) {
            console.error('Error parsing main board message:', error);
          }
        };

        this.mainWs.onerror = (error) => {
          console.error('Main Board WebSocket error:', error);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
          this.isMainConnecting = false;
          this.mainConnected = false;
          this.emit('error', { source: 'main', error });
        };

        this.mainWs.onclose = () => {
          console.log('❌ Main Board WebSocket disconnected');
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
          this.isMainConnecting = false;
          this.mainConnected = false;
          this.emit('main_connected', false);
          this.emit('connected', this.isFullyConnected());
          this.attemptReconnectMain();
        };
      } catch (error) {
        console.error('Failed to connect to main board:', error);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
        this.isMainConnecting = false;
      }
    });
  }

  /**
   * Connect to Camera ESP32-CAM
   */
  async connectCamera(ip = CONFIG.CAMERA_ESP32_IP, port = CONFIG.CAMERA_ESP32_PORT, path = CONFIG.CAMERA_WEBSOCKET_PATH) {
    if (this.isCameraConnecting || (this.cameraWs && this.cameraWs.readyState === WebSocket.OPEN)) {
      console.log('Camera already connecting or connected');
      return;
    }

    this.isCameraConnecting = true;
    const url = `ws://${ip}:${port}${path}`;
    console.log('Connecting to Camera Board:', url);

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.cameraWs) {
            this.cameraWs.close();
          }
          console.error('❌ Camera Board connection timeout');
          this.isCameraConnecting = false;
          resolve(false);
        }
      }, 5000); // 5 second timeout

      try {
        this.cameraWs = new WebSocket(url);

        this.cameraWs.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log('✅ Camera Board WebSocket connected');
            this.isCameraConnecting = false;
            this.cameraReconnectAttempts = 0;
            this.cameraConnected = true;
            this.emit('camera_connected', true);
            this.emit('connected', this.isFullyConnected());
            resolve(true);
          }
        };

        this.cameraWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('camera_data', data);

            // Handle specific message types
            if (data && data.type === 'bird_detection') {
              this.emit('alert', data);
            } else if (data && data.type === 'camera_status') {
              this.emit('camera_status', data);
            }
          } catch (error) {
            console.error('Error parsing camera board message:', error);
          }
        };

        this.cameraWs.onerror = (error) => {
          console.error('Camera Board WebSocket error:', error);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
          this.isCameraConnecting = false;
          this.cameraConnected = false;
          this.emit('error', { source: 'camera', error });
        };

        this.cameraWs.onclose = () => {
          console.log('❌ Camera Board WebSocket disconnected');
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
          this.isCameraConnecting = false;
          this.cameraConnected = false;
          this.emit('camera_connected', false);
          this.emit('connected', this.isFullyConnected());
          this.attemptReconnectCamera();
        };
      } catch (error) {
        console.error('Failed to connect to camera board:', error);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
        this.isCameraConnecting = false;
      }
    });
  }

  /**
   * Legacy connect method - connects to main board only
   */
  connect(ip = CONFIG.ESP32_IP, path = CONFIG.WEBSOCKET_PATH) {
    return this.connectMain(ip, CONFIG.ESP32_PORT, path);
  }

  /**
   * Check if both connections are established
   */
  isFullyConnected() {
    return this.mainConnected && this.cameraConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      main: this.mainConnected,
      camera: this.cameraConnected,
      fullyConnected: this.isFullyConnected(),
    };
  }

  /**
   * Attempt to reconnect to main board
   */
  attemptReconnectMain() {
    if (this.mainReconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.mainReconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Main Board reconnection attempt ${this.mainReconnectAttempts}`);
        this.connectMain();
      }, CONFIG.RECONNECT_INTERVAL);
    } else {
      console.log('⚠️ Max reconnection attempts reached for Main Board. Switching to Firebase mode.');
      this.emit('fallback_to_firebase', { board: 'main' });
    }
  }

  /**
   * Attempt to reconnect to camera board
   */
  attemptReconnectCamera() {
    if (this.cameraReconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.cameraReconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Camera Board reconnection attempt ${this.cameraReconnectAttempts}`);
        this.connectCamera();
      }, CONFIG.RECONNECT_INTERVAL);
    } else {
      console.log('⚠️ Max reconnection attempts reached for Camera Board. Switching to Firebase mode.');
      this.emit('fallback_to_firebase', { board: 'camera' });
    }
  }

  /**
   * Send command to main board
   */
  sendToMain(message) {
    if (this.mainWs && this.mainWs.readyState === WebSocket.OPEN) {
      this.mainWs.send(JSON.stringify(message));
      console.log('Sent to Main Board:', message);
      return true;
    }
    console.warn('Main board not connected, cannot send message');
    return false;
  }

  /**
   * Send command to camera board
   */
  sendToCamera(message) {
    if (this.cameraWs && this.cameraWs.readyState === WebSocket.OPEN) {
      this.cameraWs.send(JSON.stringify(message));
      console.log('Sent to Camera Board:', message);
      return true;
    }
    console.warn('Camera board not connected, cannot send message');
    return false;
  }

  /**
   * Legacy send method - sends to main board
   */
  send(message) {
    return this.sendToMain(message);
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);  // Return unsubscribe function
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from all boards
   */
  disconnect() {
    console.log('Disconnecting from all boards...');

    if (this.mainWs) {
      this.mainWs.close();
      this.mainWs = null;
      this.mainConnected = false;
    }

    if (this.cameraWs) {
      this.cameraWs.close();
      this.cameraWs = null;
      this.cameraConnected = false;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.emit('disconnected', true);
    console.log('✅ Disconnected from all boards');
  }

  /**
   * Update ESP32 IP addresses
   */
  updateConfig(config) {
    if (config.mainIP) CONFIG.ESP32_IP = config.mainIP;
    if (config.cameraIP) CONFIG.CAMERA_ESP32_IP = config.cameraIP;
    if (config.mainPort) CONFIG.ESP32_PORT = config.mainPort;
    if (config.cameraPort) CONFIG.CAMERA_ESP32_PORT = config.cameraPort;
    console.log('WebSocket config updated:', CONFIG);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...CONFIG };
  }

  /**
   * Reset reconnection attempts (useful when user manually retries)
   */
  resetReconnectionAttempts() {
    this.mainReconnectAttempts = 0;
    this.cameraReconnectAttempts = 0;
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;

// Export CONFIG for settings page
export { CONFIG as WebSocketConfig };
