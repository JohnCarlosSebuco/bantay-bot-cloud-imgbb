import { db } from './FirebaseService';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
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
}

export default new DeviceService();
