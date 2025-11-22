import { db } from './FirebaseService';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { DEVICE_CONFIG, FIREBASE_COLLECTIONS } from '../config/hardware.config';

class DeviceService {
  /**
   * Subscribe to device status updates
   */
  subscribeToDevice(deviceId, callback) {
    const deviceRef = doc(db, FIREBASE_COLLECTIONS.DEVICES, deviceId);

    return onSnapshot(deviceRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to device:', error);
      callback(null);
    });
  }

  /**
   * Subscribe to sensor data updates
   */
  subscribeToSensorData(deviceId, callback) {
    const sensorRef = doc(db, FIREBASE_COLLECTIONS.SENSOR_DATA, deviceId);

    return onSnapshot(sensorRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Error subscribing to sensor data:', error);
      callback({});
    });
  }

  /**
   * Check if device is online (last seen within 30 seconds)
   */
  isDeviceOnline(lastSeen) {
    if (!lastSeen) return false;
    const now = Date.now();
    const lastSeenTime = lastSeen.toMillis ? lastSeen.toMillis() : lastSeen;
    return (now - lastSeenTime) < 30000;  // 30 seconds
  }

  /**
   * Get camera stream URL from device
   */
  getCameraStreamUrl(device) {
    if (!device) return null;
    return device.stream_url || `http://${device.ip_address}:80/stream`;
  }

  /**
   * Get sensor history from Firebase
   * Returns array of sensor snapshots, most recent first
   */
  async getSensorHistory(maxResults = 50) {
    try {
      const historyRef = collection(db, 'sensor_history');
      const snapshot = await getDocs(historyRef);

      const history = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          soilHumidity: data.soilHumidity || 0,
          soilTemperature: data.soilTemperature || 0,
          soilConductivity: data.soilConductivity || 0,
          ph: data.ph || 7,
          timestamp: data.timestamp || doc.id,
          deviceId: data.deviceId || 'main_001',
        });
      });

      // Sort by document ID (contains timestamp) descending, then limit
      history.sort((a, b) => b.id.localeCompare(a.id));
      return history.slice(0, maxResults);
    } catch (error) {
      console.error('Error fetching sensor history:', error);
      return [];
    }
  }

  /**
   * Subscribe to sensor history updates (real-time)
   */
  subscribeToSensorHistory(callback, maxResults = 20) {
    try {
      const historyRef = collection(db, 'sensor_history');

      return onSnapshot(historyRef, (snapshot) => {
        const history = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            soilHumidity: data.soilHumidity || 0,
            soilTemperature: data.soilTemperature || 0,
            soilConductivity: data.soilConductivity || 0,
            ph: data.ph || 7,
            timestamp: data.timestamp || doc.id,
            deviceId: data.deviceId || 'main_001',
          });
        });
        // Sort by document ID descending and limit
        history.sort((a, b) => b.id.localeCompare(a.id));
        callback(history.slice(0, maxResults));
      }, (error) => {
        console.error('Error subscribing to sensor history:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up sensor history subscription:', error);
      return () => {};
    }
  }
}

export default new DeviceService();
