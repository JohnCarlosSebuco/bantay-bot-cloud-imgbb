/**
 * Crop Data Service for BantayBot PWA
 *
 * Manages harvest and rainfall data with hybrid storage:
 * - IndexedDB for offline access
 * - Firestore for cloud sync and backup
 */

import firebaseService from './FirebaseService';
import indexedDBService from './IndexedDBService';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Firestore collection names
const FIREBASE_COLLECTIONS = {
  HARVEST_DATA: 'harvest_data',
  RAINFALL_LOG: 'rainfall_log',
  ENVIRONMENTAL_HISTORY: 'environmental_history',
};

class CropDataService {
  constructor() {
    this.initialized = false;
    this.offlineMode = false;
  }

  /**
   * Initialize Firebase connection
   */
  async initialize() {
    try {
      await firebaseService.initialize();
      this.initialized = true;
      this.offlineMode = false;
    } catch (error) {
      console.warn('⚠️ Firebase initialization failed, running in offline mode');
      this.offlineMode = true;
      this.initialized = true;
    }
  }

  // ===========================
  // Harvest Data Management
  // ===========================

  /**
   * Add harvest data (saves to both IndexedDB and Firestore)
   */
  async addHarvestData(harvestData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const data = {
      ...harvestData,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Always save to IndexedDB for offline access
    try {
      await indexedDBService.saveHarvest(data);
      console.log('✅ Harvest data saved to IndexedDB');
    } catch (error) {
      console.error('❌ Error saving to IndexedDB:', error);
    }

    // Try to save to Firestore if online
    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          const harvestCollection = collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA);
          const docRef = await addDoc(harvestCollection, {
            ...data,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          console.log('✅ Harvest data synced to Firestore:', docRef.id);
          return { success: true, id: docRef.id, offline: false };
        } catch (error) {
          console.error('❌ Error syncing to Firestore:', error);
          return { success: true, offline: true };
        }
      }
    }

    return { success: true, offline: true };
  }

  /**
   * Get harvest data with optional filtering
   */
  async getHarvestData(filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try to get from Firestore first if online
    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          let q = collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA);
          const constraints = [];

          // Apply filters
          if (filters.cropType) {
            constraints.push(where('cropType', '==', filters.cropType));
          }
          if (filters.startDate) {
            constraints.push(where('harvestDate', '>=', filters.startDate));
          }
          if (filters.endDate) {
            constraints.push(where('harvestDate', '<=', filters.endDate));
          }

          // Order by harvest date (most recent first)
          constraints.push(orderBy('harvestDate', 'desc'));

          // Apply limit if specified
          if (filters.limit) {
            constraints.push(limit(filters.limit));
          }

          if (constraints.length > 0) {
            q = query(collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA), ...constraints);
          }

          const snapshot = await getDocs(q);
          const harvestData = [];

          snapshot.forEach((docSnap) => {
            harvestData.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });

          console.log(`📊 Retrieved ${harvestData.length} harvest records from Firestore`);
          return harvestData;
        } catch (error) {
          console.error('❌ Error getting harvest data from Firestore:', error);
        }
      }
    }

    // Fallback to IndexedDB
    try {
      const harvestData = await indexedDBService.getHarvestHistory();
      console.log(`📊 Retrieved ${harvestData.length} harvest records from IndexedDB`);
      return harvestData;
    } catch (error) {
      console.error('❌ Error getting harvest data from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Subscribe to harvest data updates (Firestore only)
   */
  subscribeToHarvestData(callback, filters = {}) {
    const db = firebaseService.getFirestore();
    if (!db) {
      console.error('❌ Firebase not initialized');
      // Return local data as fallback
      this.getHarvestData(filters).then(callback);
      return null;
    }

    try {
      const constraints = [];

      // Apply filters
      if (filters.cropType) {
        constraints.push(where('cropType', '==', filters.cropType));
      }

      // Order by harvest date (most recent first)
      constraints.push(orderBy('harvestDate', 'desc'));

      // Apply limit if specified
      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      const q = query(collection(db, FIREBASE_COLLECTIONS.HARVEST_DATA), ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const harvestData = [];
        snapshot.forEach((docSnap) => {
          harvestData.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        console.log(`📊 Harvest data updated: ${harvestData.length} records`);
        callback(harvestData);
      }, (error) => {
        console.error('❌ Error subscribing to harvest data:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up harvest data subscription:', error);
      return null;
    }
  }

  /**
   * Update harvest data
   */
  async updateHarvestData(harvestId, updates) {
    if (!this.initialized) {
      await this.initialize();
    }

    const data = {
      ...updates,
      updated_at: Date.now()
    };

    // Update in Firestore if online
    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          const harvestDoc = doc(db, FIREBASE_COLLECTIONS.HARVEST_DATA, harvestId);
          await updateDoc(harvestDoc, {
            ...data,
            updated_at: serverTimestamp()
          });
          console.log('✅ Harvest data updated in Firestore:', harvestId);
          return { success: true };
        } catch (error) {
          console.error('❌ Error updating in Firestore:', error);
          return { success: false, error: error.message };
        }
      }
    }

    return { success: false, error: 'Offline mode - cannot update' };
  }

  /**
   * Delete harvest data
   */
  async deleteHarvestData(harvestId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          await deleteDoc(doc(db, FIREBASE_COLLECTIONS.HARVEST_DATA, harvestId));
          console.log('✅ Harvest data deleted from Firestore:', harvestId);
          return { success: true };
        } catch (error) {
          console.error('❌ Error deleting from Firestore:', error);
          return { success: false, error: error.message };
        }
      }
    }

    return { success: false, error: 'Offline mode - cannot delete' };
  }

  // ===========================
  // Rainfall Data Management
  // ===========================

  /**
   * Add rainfall log entry (saves to both IndexedDB and Firestore)
   */
  async addRainfallLog(rainfallData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const data = {
      ...rainfallData,
      created_at: Date.now()
    };

    // Always save to IndexedDB for offline access
    try {
      await indexedDBService.saveRainfallLog(data);
      console.log('✅ Rainfall log saved to IndexedDB');
    } catch (error) {
      console.error('❌ Error saving to IndexedDB:', error);
    }

    // Try to save to Firestore if online
    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          const rainfallCollection = collection(db, FIREBASE_COLLECTIONS.RAINFALL_LOG);
          const docRef = await addDoc(rainfallCollection, {
            ...data,
            created_at: serverTimestamp()
          });
          console.log('✅ Rainfall log synced to Firestore:', docRef.id);
          return { success: true, id: docRef.id, offline: false };
        } catch (error) {
          console.error('❌ Error syncing to Firestore:', error);
          return { success: true, offline: true };
        }
      }
    }

    return { success: true, offline: true };
  }

  /**
   * Get rainfall data with optional filtering
   */
  async getRainfallData(filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try to get from Firestore first if online
    if (!this.offlineMode) {
      const db = firebaseService.getFirestore();
      if (db) {
        try {
          const constraints = [];

          // Apply date filters
          if (filters.startDate) {
            constraints.push(where('date', '>=', filters.startDate));
          }
          if (filters.endDate) {
            constraints.push(where('date', '<=', filters.endDate));
          }

          // Order by date (most recent first)
          constraints.push(orderBy('date', 'desc'));

          // Apply limit if specified
          if (filters.limit) {
            constraints.push(limit(filters.limit));
          }

          const q = query(collection(db, FIREBASE_COLLECTIONS.RAINFALL_LOG), ...constraints);
          const snapshot = await getDocs(q);
          const rainfallData = [];

          snapshot.forEach((docSnap) => {
            rainfallData.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });

          console.log(`🌧️ Retrieved ${rainfallData.length} rainfall records from Firestore`);
          return rainfallData;
        } catch (error) {
          console.error('❌ Error getting rainfall data from Firestore:', error);
        }
      }
    }

    // Fallback to IndexedDB
    try {
      const days = filters.limit || 90;
      const rainfallData = await indexedDBService.getRainfallLogs(days);
      console.log(`🌧️ Retrieved ${rainfallData.length} rainfall records from IndexedDB`);
      return rainfallData;
    } catch (error) {
      console.error('❌ Error getting rainfall data from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Subscribe to rainfall data updates (Firestore only)
   */
  subscribeToRainfallData(callback, filters = {}) {
    const db = firebaseService.getFirestore();
    if (!db) {
      console.error('❌ Firebase not initialized');
      // Return local data as fallback
      this.getRainfallData(filters).then(callback);
      return null;
    }

    try {
      const constraints = [];

      // Apply date filters
      if (filters.startDate) {
        constraints.push(where('date', '>=', filters.startDate));
      }
      if (filters.endDate) {
        constraints.push(where('date', '<=', filters.endDate));
      }

      // Order by date (most recent first)
      constraints.push(orderBy('date', 'desc'));

      // Apply limit if specified
      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      const q = query(collection(db, FIREBASE_COLLECTIONS.RAINFALL_LOG), ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const rainfallData = [];
        snapshot.forEach((docSnap) => {
          rainfallData.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        console.log(`🌧️ Rainfall data updated: ${rainfallData.length} records`);
        callback(rainfallData);
      }, (error) => {
        console.error('❌ Error subscribing to rainfall data:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up rainfall data subscription:', error);
      return null;
    }
  }

  // ===========================
  // Data Analytics
  // ===========================

  /**
   * Get harvest summary statistics
   */
  async getHarvestSummary(timeRange = 'month') {
    const harvestData = await this.getHarvestData();

    // Calculate summary statistics
    const summary = {
      totalHarvests: harvestData.length,
      totalYield: 0,
      averageYield: 0,
      cropTypes: {},
      recentHarvest: null
    };

    if (harvestData.length > 0) {
      summary.totalYield = harvestData.reduce((sum, harvest) => sum + (harvest.yield || 0), 0);
      summary.averageYield = summary.totalYield / harvestData.length;
      summary.recentHarvest = harvestData[0]; // Most recent (already sorted)

      // Count by crop type
      harvestData.forEach(harvest => {
        const cropType = harvest.cropType || 'unknown';
        summary.cropTypes[cropType] = (summary.cropTypes[cropType] || 0) + 1;
      });
    }

    return summary;
  }

  /**
   * Get rainfall summary statistics
   */
  async getRainfallSummary(timeRange = 'month') {
    const rainfallData = await this.getRainfallData();

    const summary = {
      totalEntries: rainfallData.length,
      totalRainfall: 0,
      averageRainfall: 0,
      recentRainfall: null
    };

    if (rainfallData.length > 0) {
      summary.totalRainfall = rainfallData.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      summary.averageRainfall = summary.totalRainfall / rainfallData.length;
      summary.recentRainfall = rainfallData[0]; // Most recent (already sorted)
    }

    return summary;
  }

  /**
   * Check if running in offline mode
   */
  isOffline() {
    return this.offlineMode;
  }
}

const cropDataService = new CropDataService();
export default cropDataService;
export { FIREBASE_COLLECTIONS };
