/**
 * IndexedDB Service for BantayBot PWA
 * Provides offline storage capabilities replacing AsyncStorage from React Native app
 * Stores: crop data, harvest history, sensor readings, detection events, rainfall logs
 */

const DB_NAME = 'BantayBotDB';
const DB_VERSION = 1;

class IndexedDBService {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  /**
   * Initialize IndexedDB with object stores
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Crop Data Store
        if (!db.objectStoreNames.contains('cropData')) {
          const cropStore = db.createObjectStore('cropData', { keyPath: 'id', autoIncrement: true });
          cropStore.createIndex('cropType', 'cropType', { unique: false });
          cropStore.createIndex('plantDate', 'plantDate', { unique: false });
        }

        // Harvest History Store
        if (!db.objectStoreNames.contains('harvestHistory')) {
          const harvestStore = db.createObjectStore('harvestHistory', { keyPath: 'id', autoIncrement: true });
          harvestStore.createIndex('cropType', 'cropType', { unique: false });
          harvestStore.createIndex('harvestDate', 'harvestDate', { unique: false });
        }

        // Sensor Readings Store (7-day retention)
        if (!db.objectStoreNames.contains('sensorReadings')) {
          const sensorStore = db.createObjectStore('sensorReadings', { keyPath: 'id', autoIncrement: true });
          sensorStore.createIndex('timestamp', 'timestamp', { unique: false });
          sensorStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Detection History Store (last 100 records)
        if (!db.objectStoreNames.contains('detectionHistory')) {
          const detectionStore = db.createObjectStore('detectionHistory', { keyPath: 'id', autoIncrement: true });
          detectionStore.createIndex('timestamp', 'timestamp', { unique: false });
          detectionStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Rainfall Logs Store (90 days)
        if (!db.objectStoreNames.contains('rainfallLogs')) {
          const rainfallStore = db.createObjectStore('rainfallLogs', { keyPath: 'id', autoIncrement: true });
          rainfallStore.createIndex('date', 'date', { unique: false });
        }

        // Environmental Data Store (90 days)
        if (!db.objectStoreNames.contains('environmentalData')) {
          const envStore = db.createObjectStore('environmentalData', { keyPath: 'id', autoIncrement: true });
          envStore.createIndex('date', 'date', { unique: false });
          envStore.createIndex('type', 'type', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('IndexedDB object stores created');
      };
    });
  }

  /**
   * Ensure DB is initialized before operations
   */
  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  /**
   * Generic add operation
   */
  async add(storeName, data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic put (add or update) operation
   */
  async put(storeName, data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic get operation
   */
  async get(storeName, key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic getAll operation
   */
  async getAll(storeName) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic delete operation
   */
  async delete(storeName, key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records from an index
   */
  async getAllByIndex(storeName, indexName, value) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = value ? index.getAll(value) : index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all records in a store
   */
  async clear(storeName) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean old sensor readings (keep last 7 days)
   */
  async cleanOldSensorReadings() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    await this.deleteOlderThan('sensorReadings', 'timestamp', sevenDaysAgo);
  }

  /**
   * Clean old detection history (keep last 100 records)
   */
  async cleanOldDetections() {
    const allDetections = await this.getAll('detectionHistory');
    if (allDetections.length > 100) {
      // Sort by timestamp descending
      allDetections.sort((a, b) => b.timestamp - a.timestamp);
      // Delete records beyond 100
      const toDelete = allDetections.slice(100);
      for (const record of toDelete) {
        await this.delete('detectionHistory', record.id);
      }
    }
  }

  /**
   * Clean old rainfall logs (keep last 90 days)
   */
  async cleanOldRainfallLogs() {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    await this.deleteOlderThan('rainfallLogs', 'date', ninetyDaysAgo);
  }

  /**
   * Clean old environmental data (keep last 90 days)
   */
  async cleanOldEnvironmentalData() {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    await this.deleteOlderThan('environmentalData', 'date', ninetyDaysAgo);
  }

  /**
   * Delete records older than a timestamp
   */
  async deleteOlderThan(storeName, indexName, timestamp) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const range = IDBKeyRange.upperBound(timestamp);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Run all cleanup tasks
   */
  async runCleanup() {
    console.log('Running IndexedDB cleanup...');
    await Promise.all([
      this.cleanOldSensorReadings(),
      this.cleanOldDetections(),
      this.cleanOldRainfallLogs(),
      this.cleanOldEnvironmentalData()
    ]);
    console.log('IndexedDB cleanup completed');
  }

  // ===== Convenience Methods =====

  /**
   * Save crop data
   */
  async saveCropData(cropData) {
    return this.add('cropData', cropData);
  }

  /**
   * Get all crop data
   */
  async getCropData() {
    return this.getAll('cropData');
  }

  /**
   * Save harvest history
   */
  async saveHarvest(harvestData) {
    return this.add('harvestHistory', harvestData);
  }

  /**
   * Get all harvest history
   */
  async getHarvestHistory() {
    return this.getAll('harvestHistory');
  }

  /**
   * Save sensor reading
   */
  async saveSensorReading(reading) {
    return this.add('sensorReadings', {
      ...reading,
      timestamp: reading.timestamp || Date.now()
    });
  }

  /**
   * Get recent sensor readings
   */
  async getRecentSensorReadings(deviceId, limit = 100) {
    const allReadings = deviceId
      ? await this.getAllByIndex('sensorReadings', 'deviceId', deviceId)
      : await this.getAll('sensorReadings');

    // Sort by timestamp descending
    return allReadings
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Save detection event
   */
  async saveDetection(detection) {
    await this.add('detectionHistory', {
      ...detection,
      timestamp: detection.timestamp || Date.now()
    });
    // Clean up old detections
    await this.cleanOldDetections();
  }

  /**
   * Get detection history
   */
  async getDetectionHistory(limit = 100) {
    const allDetections = await this.getAll('detectionHistory');
    return allDetections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Save rainfall log
   */
  async saveRainfallLog(log) {
    return this.put('rainfallLogs', log);
  }

  /**
   * Get rainfall logs
   */
  async getRainfallLogs(days = 90) {
    const allLogs = await this.getAll('rainfallLogs');
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    return allLogs
      .filter(log => log.date >= cutoffDate)
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Save environmental data
   */
  async saveEnvironmentalData(data) {
    return this.add('environmentalData', {
      ...data,
      date: data.date || Date.now()
    });
  }

  /**
   * Get environmental data by type
   */
  async getEnvironmentalData(type, days = 90) {
    const allData = type
      ? await this.getAllByIndex('environmentalData', 'type', type)
      : await this.getAll('environmentalData');

    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    return allData
      .filter(data => data.date >= cutoffDate)
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Save setting
   */
  async saveSetting(key, value) {
    return this.put('settings', { key, value });
  }

  /**
   * Get setting
   */
  async getSetting(key) {
    const result = await this.get('settings', key);
    return result ? result.value : null;
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const allSettings = await this.getAll('settings');
    const settingsObj = {};
    allSettings.forEach(item => {
      settingsObj[item.key] = item.value;
    });
    return settingsObj;
  }
}

// Export singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
