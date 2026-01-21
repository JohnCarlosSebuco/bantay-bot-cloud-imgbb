/**
 * Offline Mode Service for BantayBot PWA
 * Manages connection modes: AUTO, ONLINE, OFFLINE
 * Communicates with Main Board's offline-status, set-mode, and force-sync endpoints
 */

import indexedDBService from './IndexedDBService';

const MODE_PREFERENCE_KEY = 'connection_mode_preference';

// Mode constants matching Main Board's userModePreference values
export const CONNECTION_MODES = {
  AUTO: 0,      // Automatically detect internet connectivity
  ONLINE: 1,    // Force online (try to stay connected to Firebase)
  OFFLINE: 2    // Force offline (local only, no cloud sync)
};

class OfflineModeService {
  constructor() {
    this.modePreference = CONNECTION_MODES.AUTO;
    this.botStatus = {
      connectionState: 'unknown',
      queuedDetections: 0,
      offlineDuration: 0,
      wifiConnected: false,
      firebaseConnected: false,
      userModePreference: 0,
      localIPAddress: ''
    };
    this.listeners = new Set();
    this.pollInterval = null;
  }

  /**
   * Initialize service and load saved mode preference
   * @returns {Promise<number>} The loaded mode preference
   */
  async initialize() {
    try {
      const savedPref = await indexedDBService.getSetting(MODE_PREFERENCE_KEY);
      if (savedPref !== null && savedPref !== undefined) {
        this.modePreference = savedPref;
      }
    } catch (error) {
      console.warn('[OfflineModeService] Failed to load mode preference:', error);
    }
    return this.modePreference;
  }

  /**
   * Set connection mode preference and send to bot
   * @param {number} mode - CONNECTION_MODES value (0=AUTO, 1=ONLINE, 2=OFFLINE)
   * @param {string} mainBoardIP - Main Board IP address
   * @param {number} port - Main Board HTTP port (default 81)
   * @returns {Promise<boolean>} Success status
   */
  async setMode(mode, mainBoardIP, port = 81) {
    if (mode < 0 || mode > 2) {
      console.error('[OfflineModeService] Invalid mode:', mode);
      return false;
    }

    this.modePreference = mode;
    await indexedDBService.saveSetting(MODE_PREFERENCE_KEY, mode);

    // Send preference to bot via HTTP
    try {
      const formData = new FormData();
      formData.append('mode', String(mode));

      const response = await fetch(`http://${mainBoardIP}:${port}/set-mode`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('[OfflineModeService] Mode set successfully:', mode);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.warn('[OfflineModeService] Failed to send mode to bot:', error);
      // Still save locally even if bot unreachable
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Get current mode preference
   * @returns {number} Current mode
   */
  getMode() {
    return this.modePreference;
  }

  /**
   * Get human-readable label for mode
   * @param {number} mode - Mode value (defaults to current)
   * @param {string} language - 'en' or 'tl'
   * @returns {string} Mode label
   */
  getModeLabel(mode = this.modePreference, language = 'en') {
    const labels = {
      en: {
        [CONNECTION_MODES.AUTO]: 'Automatic',
        [CONNECTION_MODES.ONLINE]: 'Always Online',
        [CONNECTION_MODES.OFFLINE]: 'Always Offline'
      },
      tl: {
        [CONNECTION_MODES.AUTO]: 'Awtomatiko',
        [CONNECTION_MODES.ONLINE]: 'Palaging Online',
        [CONNECTION_MODES.OFFLINE]: 'Palaging Offline'
      }
    };
    return labels[language]?.[mode] || labels.en[mode];
  }

  /**
   * Fetch bot's offline status via local HTTP
   * @param {string} mainBoardIP - Main Board IP address
   * @param {number} port - Main Board HTTP port (default 81)
   * @returns {Promise<object>} Bot status object
   */
  async fetchBotStatus(mainBoardIP, port = 81) {
    try {
      const response = await fetch(
        `http://${mainBoardIP}:${port}/offline-status`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        this.botStatus = await response.json();
        this.notifyListeners();
        return this.botStatus;
      }
    } catch (error) {
      // Bot unreachable via local network
      this.botStatus = {
        ...this.botStatus,
        connectionState: 'unreachable',
        wifiConnected: false
      };
      this.notifyListeners();
    }
    return this.botStatus;
  }

  /**
   * Force sync queued data to Firebase
   * @param {string} mainBoardIP - Main Board IP address
   * @param {number} port - Main Board HTTP port (default 81)
   * @returns {Promise<object>} Sync result
   */
  async forceSync(mainBoardIP, port = 81) {
    try {
      const response = await fetch(`http://${mainBoardIP}:${port}/force-sync`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000)  // Longer timeout for sync operation
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh status after sync
        await this.fetchBotStatus(mainBoardIP, port);
        return result;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('[OfflineModeService] Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get cached bot status
   * @returns {object} Bot status
   */
  getBotStatus() {
    return this.botStatus;
  }

  /**
   * Start polling bot status at regular intervals
   * @param {string} mainBoardIP - Main Board IP address
   * @param {number} port - Main Board HTTP port (default 81)
   * @param {number} intervalMs - Polling interval in milliseconds (default 10000)
   */
  startPolling(mainBoardIP, port = 81, intervalMs = 10000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.fetchBotStatus(mainBoardIP, port);
    }, intervalMs);
    // Fetch immediately on start
    this.fetchBotStatus(mainBoardIP, port);
  }

  /**
   * Stop polling bot status
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Subscribe to status changes
   * @param {function} callback - Called with {mode, botStatus}
   * @returns {function} Unsubscribe function
   */
  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners() {
    const data = {
      mode: this.modePreference,
      botStatus: this.botStatus
    };
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('[OfflineModeService] Listener error:', error);
      }
    });
  }

  /**
   * Check if bot is currently offline
   * @returns {boolean}
   */
  isOffline() {
    return this.botStatus.connectionState === 'offline';
  }

  /**
   * Check if bot is reachable on local network
   * @returns {boolean}
   */
  isReachable() {
    return this.botStatus.connectionState !== 'unreachable' &&
           this.botStatus.connectionState !== 'unknown';
  }

  /**
   * Get count of queued detections waiting for sync
   * @returns {number}
   */
  getQueuedCount() {
    return this.botStatus.queuedDetections || 0;
  }
}

export default new OfflineModeService();
