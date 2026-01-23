/**
 * Offline Mode Service for BantayBot PWA
 * Manages connection modes and polls ESP32 /offline-status
 */

import indexedDBService from './IndexedDBService';
import ConnectionManager from './ConnectionManager';

const MODE_KEY = 'connection_mode_preference';

export const CONNECTION_MODES = { AUTO: 0, ONLINE: 1, OFFLINE: 2 };

class OfflineModeService {
  constructor() {
    this.mode = CONNECTION_MODES.AUTO;
    this.botStatus = null;
    this.listeners = new Set();
    this.pollInterval = null;
  }

  async initialize() {
    try {
      const saved = await indexedDBService.getSetting(MODE_KEY);
      if (saved !== null && saved !== undefined) this.mode = saved;
    } catch (e) { /* ignore */ }

    window.addEventListener('online', () => this.notifyListeners());
    window.addEventListener('offline', () => this.notifyListeners());
    return this.mode;
  }

  async setMode(mode, mainBoardIP, port = 81) {
    if (mode < 0 || mode > 2) return false;
    this.mode = mode;
    await indexedDBService.saveSetting(MODE_KEY, mode);

    // Send to ESP32 if on local network
    if (ConnectionManager.getMode() === 'local') {
      try {
        await fetch(`http://${mainBoardIP}:${port}/set-mode?mode=${mode}`, {
          signal: AbortSignal.timeout(5000)
        });
      } catch (e) {
        console.warn('[OfflineMode] Failed to send mode to ESP32:', e.message);
      }
    }

    this.notifyListeners();
    return true;
  }

  getMode() { return this.mode; }

  async fetchBotStatus(mainBoardIP, port = 81) {
    try {
      const response = await fetch(
        `http://${mainBoardIP}:${port}/offline-status`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        this.botStatus = await response.json();
        this.notifyListeners();
      }
    } catch (e) {
      this.botStatus = { connectionState: 'unreachable' };
      this.notifyListeners();
    }
    return this.botStatus;
  }

  async forceSync(mainBoardIP, port = 81) {
    const response = await fetch(`http://${mainBoardIP}:${port}/force-sync`, {
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    await this.fetchBotStatus(mainBoardIP, port);
    return result;
  }

  startPolling(mainBoardIP, port = 81, intervalMs = 15000) {
    this.stopPolling();
    if (ConnectionManager.getMode() !== 'local') return;

    this.fetchBotStatus(mainBoardIP, port);
    this.pollInterval = setInterval(() => {
      if (ConnectionManager.getMode() === 'local') {
        this.fetchBotStatus(mainBoardIP, port);
      } else {
        this.stopPolling();
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({
      mode: this.mode,
      botStatus: this.botStatus,
      pwaOnline: navigator.onLine
    }));
  }
}

export default new OfflineModeService();
