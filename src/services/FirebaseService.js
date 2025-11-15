/**
 * Firebase Service for BantayBot PWA
 *
 * Provides both Firestore and Realtime Database functionality
 * matching the React Native app implementation for full compatibility
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  off,
  get,
  child,
  orderByChild,
  endAt,
  query as rtdbQuery
} from 'firebase/database';
import firebaseConfig from '../config/firebase.config.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;        // Firestore
    this.rtdb = null;      // Realtime Database
    this.initialized = false;
    this.deviceId = 'main_001';  // Default device ID
    this.statusListener = null;
    this.firestoreListeners = new Map();  // Track Firestore listeners
  }

  /**
   * Initialize Firebase app and services
   */
  async initialize() {
    if (this.initialized) {
      return this.db;
    }

    try {
      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized');

      // Initialize Firestore
      this.db = getFirestore(this.app);

      // Enable offline persistence for Firestore
      try {
        await enableIndexedDbPersistence(this.db);
        console.log('✅ Firestore offline persistence enabled');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('⚠️ Multiple tabs open, persistence enabled only in first tab');
        } else if (err.code === 'unimplemented') {
          console.warn('⚠️ Browser does not support offline persistence');
        }
      }

      // Initialize Realtime Database for remote control (matching mobile app)
      this.rtdb = getDatabase(this.app);
      console.log('✅ Realtime Database initialized for remote control');

      this.initialized = true;
      console.log('✅ Firebase services initialized (Firestore + Realtime DB)');

      return this.db;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Firestore database instance
   */
  getFirestore() {
    if (!this.initialized) {
      console.warn('⚠️ Firebase not initialized. Call initialize() first.');
      return null;
    }
    return this.db;
  }

  /**
   * Get Realtime Database instance
   */
  getRealtimeDatabase() {
    if (!this.initialized) {
      console.warn('⚠️ Firebase not initialized. Call initialize() first.');
      return null;
    }
    return this.rtdb;
  }

  /**
   * Get Firebase app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Set device ID for commands
   */
  setDeviceId(deviceId) {
    this.deviceId = deviceId;
    console.log(`Device ID set to: ${deviceId}`);
  }

  // ========================================
  // REALTIME DATABASE METHODS (Remote Control)
  // ========================================

  /**
   * Send a command to the ESP32 via Firebase Realtime Database
   * @param {string} command - Command name (e.g., 'ROTATE_HEAD', 'SOUND_ALARM')
   * @param {any} value - Command value (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async sendCommand(command, value = null) {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized. Call initialize() first.');
        return false;
      }

      const timestamp = Date.now();
      const commandData = {
        command: command,
        value: value,
        timestamp: timestamp,
        processed: false,
        sentFrom: 'pwa'
      };

      console.log(`[Firebase] Sending command: ${command}`, value !== null ? `value: ${value}` : '');

      // Write command to Firebase Realtime Database
      const commandsRef = ref(this.rtdb, `/devices/${this.deviceId}/commands`);
      await push(commandsRef, commandData);

      console.log(`[Firebase] ✅ Command sent successfully`);
      return true;
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to send command:`, error);
      return false;
    }
  }

  /**
   * Listen to ESP32 status updates from Firebase Realtime Database
   * @param {function} callback - Called when status updates (receives status object)
   * @returns {function} - Unsubscribe function
   */
  onStatusUpdate(callback) {
    if (!this.initialized || !this.rtdb) {
      console.error('[Firebase] Not initialized. Call initialize() first.');
      return () => {};
    }

    console.log(`[Firebase] 📡 Starting to listen for status updates...`);

    const statusRef = ref(this.rtdb, `/devices/${this.deviceId}/status`);
    this.statusListener = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (status) {
        console.log(`[Firebase] 📥 Status update received`);
        callback(status);
      }
    }, (error) => {
      console.error('[Firebase] ❌ Status listener error:', error);
    });

    // Return unsubscribe function
    return () => this.stopStatusListener();
  }

  /**
   * Stop listening to status updates
   */
  stopStatusListener() {
    if (this.rtdb) {
      console.log(`[Firebase] 🛑 Stopping status listener`);
      const statusRef = ref(this.rtdb, `/devices/${this.deviceId}/status`);
      off(statusRef);
      this.statusListener = null;
    }
  }

  /**
   * Get current device status from Firebase Realtime Database
   * @returns {Promise<object|null>}
   */
  async getStatus() {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized.');
        return null;
      }

      const statusRef = ref(this.rtdb, `/devices/${this.deviceId}/status`);
      const snapshot = await get(statusRef);
      return snapshot.val();
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to get status:`, error);
      return null;
    }
  }

  /**
   * Test Firebase Realtime Database connection
   * @returns {Promise<boolean>}
   */
  async testRealtimeDatabaseConnection() {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized.');
        return false;
      }

      const testRef = ref(this.rtdb, `/devices/${this.deviceId}/test`);
      await set(testRef, {
        timestamp: Date.now(),
        message: 'Connection test from PWA'
      });
      console.log(`[Firebase] ✅ Realtime Database connection test successful`);
      return true;
    } catch (error) {
      console.error(`[Firebase] ❌ Realtime Database connection test failed:`, error);
      return false;
    }
  }

  /**
   * Clean up old processed commands (maintenance)
   * Removes commands older than 1 hour that have been processed
   */
  async cleanupOldCommands() {
    try {
      if (!this.initialized || !this.rtdb) {
        return;
      }

      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const commandsRef = ref(this.rtdb, `/devices/${this.deviceId}/commands`);

      const snapshot = await get(commandsRef);
      if (!snapshot.exists()) {
        return;
      }

      const updates = {};
      snapshot.forEach(child => {
        const command = child.val();
        if (command.processed && command.timestamp < oneHourAgo) {
          updates[child.key] = null; // Delete the command
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(commandsRef, updates);
        console.log(`[Firebase] 🧹 Cleaned up ${Object.keys(updates).length} old commands`);
      }
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to cleanup commands:`, error);
    }
  }

  // ========================================
  // FIRESTORE METHODS (Sensor Data)
  // ========================================

  /**
   * Listen to sensor data updates from Firestore
   * @param {string} deviceId - Device ID (e.g., 'main_001', 'camera_001')
   * @param {function} callback - Called when data updates
   * @returns {function} - Unsubscribe function
   */
  onSensorDataUpdate(deviceId, callback) {
    if (!this.initialized || !this.db) {
      console.error('[Firebase] Not initialized.');
      return () => {};
    }

    const docRef = doc(this.db, 'sensor_data', deviceId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log(`[Firestore] 📥 Sensor data update for ${deviceId}`);
        callback(data);
      }
    }, (error) => {
      console.error(`[Firestore] ❌ Sensor data listener error:`, error);
    });

    // Store listener for cleanup
    this.firestoreListeners.set(`sensor_${deviceId}`, unsubscribe);

    return unsubscribe;
  }

  /**
   * Get sensor data from Firestore
   * @param {string} deviceId - Device ID
   * @returns {Promise<object|null>}
   */
  async getSensorData(deviceId) {
    try {
      if (!this.initialized || !this.db) {
        console.error('[Firebase] Not initialized.');
        return null;
      }

      const docRef = doc(this.db, 'sensor_data', deviceId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return snapshot.data();
      }
      return null;
    } catch (error) {
      console.error(`[Firestore] ❌ Failed to get sensor data:`, error);
      return null;
    }
  }

  /**
   * Listen to detection history updates
   * @param {number} limitCount - Number of recent detections to fetch
   * @param {function} callback - Called when data updates
   * @returns {function} - Unsubscribe function
   */
  onDetectionHistoryUpdate(limitCount = 100, callback) {
    if (!this.initialized || !this.db) {
      console.error('[Firebase] Not initialized.');
      return () => {};
    }

    const q = query(
      collection(this.db, 'detection_history'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const detections = [];
      snapshot.forEach((doc) => {
        detections.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log(`[Firestore] 📥 Detection history update: ${detections.length} records`);
      callback(detections);
    }, (error) => {
      console.error(`[Firestore] ❌ Detection history listener error:`, error);
    });

    this.firestoreListeners.set('detection_history', unsubscribe);

    return unsubscribe;
  }

  /**
   * Get detection history from Firestore
   * @param {number} limitCount - Number of recent detections to fetch
   * @returns {Promise<Array>}
   */
  async getDetectionHistory(limitCount = 100) {
    try {
      if (!this.initialized || !this.db) {
        console.error('[Firebase] Not initialized.');
        return [];
      }

      const q = query(
        collection(this.db, 'detection_history'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const detections = [];
      snapshot.forEach((doc) => {
        detections.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return detections;
    } catch (error) {
      console.error(`[Firestore] ❌ Failed to get detection history:`, error);
      return [];
    }
  }

  /**
   * Write data to Firestore
   * @param {string} collectionName - Collection name
   * @param {string} documentId - Document ID
   * @param {object} data - Data to write
   * @returns {Promise<boolean>}
   */
  async setDocument(collectionName, documentId, data) {
    try {
      if (!this.initialized || !this.db) {
        console.error('[Firebase] Not initialized.');
        return false;
      }

      const docRef = doc(this.db, collectionName, documentId);
      await setDoc(docRef, data, { merge: true });
      console.log(`[Firestore] ✅ Document written: ${collectionName}/${documentId}`);
      return true;
    } catch (error) {
      console.error(`[Firestore] ❌ Failed to write document:`, error);
      return false;
    }
  }

  /**
   * Update document in Firestore
   * @param {string} collectionName - Collection name
   * @param {string} documentId - Document ID
   * @param {object} data - Data to update
   * @returns {Promise<boolean>}
   */
  async updateDocument(collectionName, documentId, data) {
    try {
      if (!this.initialized || !this.db) {
        console.error('[Firebase] Not initialized.');
        return false;
      }

      const docRef = doc(this.db, collectionName, documentId);
      await updateDoc(docRef, data);
      console.log(`[Firestore] ✅ Document updated: ${collectionName}/${documentId}`);
      return true;
    } catch (error) {
      console.error(`[Firestore] ❌ Failed to update document:`, error);
      return false;
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    console.log('[Firebase] 🧹 Cleaning up listeners...');

    // Stop Realtime Database listeners
    this.stopStatusListener();

    // Stop all Firestore listeners
    this.firestoreListeners.forEach((unsubscribe, key) => {
      console.log(`[Firebase] Unsubscribing from ${key}`);
      unsubscribe();
    });
    this.firestoreListeners.clear();

    console.log('[Firebase] ✅ All listeners cleaned up');
  }
}

// Export singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;

// Export for direct use
export const initializeFirebase = () => firebaseService.initialize();
export const getFirestoreDB = () => firebaseService.getFirestore();
export const getRealtimeDB = () => firebaseService.getRealtimeDatabase();
