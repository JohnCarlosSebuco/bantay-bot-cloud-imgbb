import { db } from './FirebaseService';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { DEVICE_CONFIG, FIREBASE_COLLECTIONS } from '../config/hardware.config';

/**
 * Transform raw Firebase sensor data to support dual sensors
 * Provides backward compatibility for old single-sensor data
 */
function transformSensorData(data) {
  if (!data) return null;

  return {
    // Sensor 1 data (fall back to averaged if sensor-specific not available)
    sensor1: {
      humidity: data.soil1Humidity ?? data.soilHumidity ?? 0,
      temperature: data.soil1Temperature ?? data.soilTemperature ?? 0,
      conductivity: data.soil1Conductivity ?? data.soilConductivity ?? 0,
      ph: data.soil1PH ?? data.ph ?? 0
    },
    // Sensor 2 data (fall back to averaged if sensor-specific not available)
    sensor2: {
      humidity: data.soil2Humidity ?? data.soilHumidity ?? 0,
      temperature: data.soil2Temperature ?? data.soilTemperature ?? 0,
      conductivity: data.soil2Conductivity ?? data.soilConductivity ?? 0,
      ph: data.soil2PH ?? data.ph ?? 0
    },
    // Averaged/combined values for backward compatibility
    average: {
      humidity: data.soilHumidity ?? 0,
      temperature: data.soilTemperature ?? 0,
      conductivity: data.soilConductivity ?? 0,
      ph: data.ph ?? 0
    },
    // Ambient conditions (DHT22)
    ambient: {
      temperature: data.temperature ?? 0,
      humidity: data.humidity ?? 0
    },
    // Check if dual sensor data is available
    hasDualSensors: !!(data.soil1Humidity !== undefined && data.soil2Humidity !== undefined),
    // Keep original data for reference
    raw: data
  };
}

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
   * Includes dual sensor data if available
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
          // Sensor 1 data
          soil1Humidity: data.soil1Humidity ?? data.soilHumidity ?? 0,
          soil1Temperature: data.soil1Temperature ?? data.soilTemperature ?? 0,
          soil1Conductivity: data.soil1Conductivity ?? data.soilConductivity ?? 0,
          soil1PH: data.soil1PH ?? data.ph ?? 7,
          // Sensor 2 data
          soil2Humidity: data.soil2Humidity ?? data.soilHumidity ?? 0,
          soil2Temperature: data.soil2Temperature ?? data.soilTemperature ?? 0,
          soil2Conductivity: data.soil2Conductivity ?? data.soilConductivity ?? 0,
          soil2PH: data.soil2PH ?? data.ph ?? 7,
          // Averaged data (backward compatibility)
          soilHumidity: data.soilHumidity || 0,
          soilTemperature: data.soilTemperature || 0,
          soilConductivity: data.soilConductivity || 0,
          ph: data.ph || 7,
          // Metadata
          timestamp: data.timestamp || doc.id,
          deviceId: data.deviceId || 'main_001',
          hasDualSensors: !!(data.soil1Humidity !== undefined && data.soil2Humidity !== undefined),
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
   * Includes dual sensor data if available
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
            // Sensor 1 data
            soil1Humidity: data.soil1Humidity ?? data.soilHumidity ?? 0,
            soil1Temperature: data.soil1Temperature ?? data.soilTemperature ?? 0,
            soil1Conductivity: data.soil1Conductivity ?? data.soilConductivity ?? 0,
            soil1PH: data.soil1PH ?? data.ph ?? 7,
            // Sensor 2 data
            soil2Humidity: data.soil2Humidity ?? data.soilHumidity ?? 0,
            soil2Temperature: data.soil2Temperature ?? data.soilTemperature ?? 0,
            soil2Conductivity: data.soil2Conductivity ?? data.soilConductivity ?? 0,
            soil2PH: data.soil2PH ?? data.ph ?? 7,
            // Averaged data (backward compatibility)
            soilHumidity: data.soilHumidity || 0,
            soilTemperature: data.soilTemperature || 0,
            soilConductivity: data.soilConductivity || 0,
            ph: data.ph || 7,
            // Metadata
            timestamp: data.timestamp || doc.id,
            deviceId: data.deviceId || 'main_001',
            hasDualSensors: !!(data.soil1Humidity !== undefined && data.soil2Humidity !== undefined),
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

  /**
   * Get detection history from Firebase
   * Returns array of bird detections, most recent first
   */
  async getDetectionHistory(maxResults = 50) {
    try {
      const historyRef = collection(db, 'detection_history');
      const snapshot = await getDocs(historyRef);

      const history = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          deviceId: data.deviceId || 'camera_001',
          timestamp: data.timestamp || 0,
          imageUrl: data.imageUrl || '',
          birdSize: data.birdSize || 0,
          confidence: data.confidence || 0,
          detectionZone: data.detectionZone || '',
          triggered: data.triggered || false,
        });
      });

      // Sort by timestamp descending, then limit
      history.sort((a, b) => b.timestamp - a.timestamp);
      return history.slice(0, maxResults);
    } catch (error) {
      console.error('Error fetching detection history:', error);
      return [];
    }
  }

  /**
   * Subscribe to detection history updates (real-time)
   */
  subscribeToDetectionHistory(callback, maxResults = 20) {
    try {
      const historyRef = collection(db, 'detection_history');

      return onSnapshot(historyRef, (snapshot) => {
        const history = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            deviceId: data.deviceId || 'camera_001',
            timestamp: data.timestamp || 0,
            imageUrl: data.imageUrl || '',
            birdSize: data.birdSize || 0,
            confidence: data.confidence || 0,
            detectionZone: data.detectionZone || '',
            triggered: data.triggered || false,
          });
        });
        // Sort by timestamp descending and limit
        history.sort((a, b) => b.timestamp - a.timestamp);
        callback(history.slice(0, maxResults));
      }, (error) => {
        console.error('Error subscribing to detection history:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up detection history subscription:', error);
      return () => {};
    }
  }

  /**
   * Get today's detection count
   */
  getTodayDetectionCount(detections) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    // Since timestamp is millis from device boot, we need to use document creation time
    // For now, count all detections (can be improved with server timestamp)
    return detections.length;
  }
}

const deviceServiceInstance = new DeviceService();

export { transformSensorData };
export default deviceServiceInstance;
