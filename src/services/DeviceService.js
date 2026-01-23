import { db } from './FirebaseService';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { DEVICE_CONFIG, FIREBASE_COLLECTIONS } from '../config/hardware.config';

// Minimum valid timestamp: Jan 1, 2024 in milliseconds
const MIN_VALID_TIMESTAMP = 1704067200000;

/**
 * Resolve a valid timestamp from document data and ID.
 * Priority: data.timestamp (if valid Unix ms) > doc ID parsing > 0
 */
function resolveTimestamp(data, docId) {
  // 1. Check if data.timestamp is a valid Unix timestamp in ms
  if (typeof data.timestamp === 'number' && data.timestamp > MIN_VALID_TIMESTAMP) {
    return data.timestamp;
  }

  // 2. Check if data.timestamp is a string (readable format like "January 23, 2026 2:30:45 PM")
  if (typeof data.timestamp === 'string' && data.timestamp.length > 10) {
    // Strip " at " (Firestore timestamp format: "January 04, 2026 at 01:00:00 AM")
    const cleaned = data.timestamp.replace(' at ', ' ');
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > MIN_VALID_TIMESTAMP) {
      return parsed.getTime();
    }
  }

  // 3. Try to parse document ID format: deviceId_MM-DD-YYYY_HH-MM-SS-AM/PM
  if (docId) {
    const match = docId.match(/(\d{2})-(\d{2})-(\d{4})_(\d{2})-(\d{2})-(\d{2})-(\w{2})$/);
    if (match) {
      const [, month, day, year, hour, minute, second, ampm] = match;
      let h = parseInt(hour, 10);
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      const date = new Date(
        parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10),
        h, parseInt(minute, 10), parseInt(second, 10)
      );
      if (!isNaN(date.getTime()) && date.getTime() > MIN_VALID_TIMESTAMP) {
        return date.getTime();
      }
    }
  }

  // 4. Fallback
  return 0;
}

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
  async getSensorHistory() {
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
          timestamp: resolveTimestamp(data, doc.id),
          deviceId: data.deviceId || 'main_001',
          hasDualSensors: !!(data.soil1Humidity !== undefined && data.soil2Humidity !== undefined),
        });
      });

      // Sort by timestamp descending
      history.sort((a, b) => b.timestamp - a.timestamp);
      return history;
    } catch (error) {
      console.error('Error fetching sensor history:', error);
      return [];
    }
  }

  /**
   * Subscribe to sensor history updates (real-time)
   * Includes dual sensor data if available
   */
  subscribeToSensorHistory(callback) {
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
            timestamp: resolveTimestamp(data, doc.id),
            deviceId: data.deviceId || 'main_001',
            hasDualSensors: !!(data.soil1Humidity !== undefined && data.soil2Humidity !== undefined),
          });
        });
        // Sort by timestamp descending
        history.sort((a, b) => b.timestamp - a.timestamp);
        callback(history);
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
          timestamp: resolveTimestamp(data, doc.id),
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
            timestamp: resolveTimestamp(data, doc.id),
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
