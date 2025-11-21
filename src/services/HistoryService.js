import WebSocketService from './WebSocketService';
import ConnectionManager from './ConnectionManager';

class HistoryService {
  constructor() {
    this.isStarted = false;
    this.listeners = {};
    this.lastEnvSavedAt = 0;
  }

  async start() {
    if (this.isStarted) return;
    this.isStarted = true;

    // Listen to data from both WebSocket and Firebase
    ConnectionManager.onStatusUpdate(this.handleData);
  }

  stop() {
    if (!this.isStarted) return;
    this.isStarted = false;
    // ConnectionManager handles cleanup
  }

  handleData = async (data) => {
    try {
      const now = Date.now();

      // Motion events: log only when motion is detected (1)
      if (data && data.motion === 1) {
        await this.appendMotion({
          timestamp: now,
          distance: typeof data.distance === 'number' && isFinite(data.distance) ? data.distance : null,
        });
      }

      // Environmental sample every 60s
      if (now - this.lastEnvSavedAt >= 60 * 1000) {
        this.lastEnvSavedAt = now;
        await this.appendEnv({
          timestamp: now,
          temperature: typeof data.dhtTemperature === 'number' && isFinite(data.dhtTemperature) ? data.dhtTemperature : null,
          humidity: typeof data.dhtHumidity === 'number' && isFinite(data.dhtHumidity) ? data.dhtHumidity : null,
          soilMoisture: typeof data.soilHumidity === 'number' && isFinite(data.soilHumidity) ? data.soilHumidity : null,
          soilTemperature: typeof data.soilTemperature === 'number' && isFinite(data.soilTemperature) ? data.soilTemperature : null,
        });
      }
    } catch (e) {
      // swallow errors to avoid impacting app flow
      console.warn('HistoryService: Error handling data:', e);
    }
  };

  async appendMotion(entry) {
    const key = 'history_motion';
    const list = await this.getList(key);
    list.unshift(entry);
    // Trim to last 500 items
    const trimmed = list.slice(0, 500);
    localStorage.setItem(key, JSON.stringify(trimmed));
    this.emit('update');
  }

  async appendEnv(entry) {
    const key = 'history_env';
    const list = await this.getList(key);
    list.unshift(entry);
    // Trim to last 500 items
    const trimmed = list.slice(0, 500);
    localStorage.setItem(key, JSON.stringify(trimmed));
    this.emit('update');
  }

  async getMotionHistory() {
    return this.getList('history_motion');
  }

  async getEnvHistory() {
    return this.getList('history_env');
  }

  /**
   * Get environmental history for charts (last 24 hours)
   */
  async getRecentEnvHistory(hours = 24) {
    const history = await this.getEnvHistory();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);

    return history
      .filter(entry => entry.timestamp >= cutoff)
      .map(entry => ({
        ...entry,
        time: new Date(entry.timestamp).toLocaleTimeString('en', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        date: new Date(entry.timestamp).toLocaleDateString()
      }));
  }

  /**
   * Get motion statistics for today
   */
  async getTodayMotionStats() {
    const history = await this.getMotionHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMotions = history.filter(entry =>
      new Date(entry.timestamp) >= today
    );

    // Group by hour
    const hourlyData = new Array(24).fill(0);
    todayMotions.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourlyData[hour]++;
    });

    return {
      totalToday: todayMotions.length,
      hourlyData,
      lastMotion: history[0] || null
    };
  }

  /**
   * Export all history as downloadable JSON
   */
  async exportHistory() {
    try {
      const motionHistory = await this.getMotionHistory();
      const envHistory = await this.getEnvHistory();

      const exportData = {
        exportDate: new Date().toISOString(),
        motionHistory,
        envHistory,
        summary: {
          totalMotionEvents: motionHistory.length,
          totalEnvSamples: envHistory.length,
          dateRange: {
            oldest: Math.min(
              motionHistory[motionHistory.length - 1]?.timestamp || Date.now(),
              envHistory[envHistory.length - 1]?.timestamp || Date.now()
            ),
            newest: Math.max(
              motionHistory[0]?.timestamp || 0,
              envHistory[0]?.timestamp || 0
            )
          }
        }
      };

      // Create downloadable blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bantaybot-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return exportData;
    } catch (error) {
      console.error('Error exporting history:', error);
      return null;
    }
  }

  async clearAll() {
    try {
      localStorage.removeItem('history_motion');
      localStorage.removeItem('history_env');
      this.emit('update');
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  async getList(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);

    // Return unsubscribe function
    return () => {
      this.off(event, cb);
    };
  }

  off(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
  }

  emit(event) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }
}

export default new HistoryService();