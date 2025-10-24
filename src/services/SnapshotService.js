import { db } from './FirebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { FIREBASE_COLLECTIONS } from '../config/hardware.config';
import { formatDistanceToNow } from 'date-fns';

class SnapshotService {
  /**
   * Subscribe to latest snapshot URL from device
   * @param {string} deviceId - Device ID (e.g., "camera_001")
   * @param {function} callback - Callback function with snapshot data
   * @returns {function} Unsubscribe function
   */
  subscribeToSnapshot(deviceId, callback) {
    const deviceRef = doc(db, FIREBASE_COLLECTIONS.DEVICES, deviceId);

    return onSnapshot(deviceRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          url: data.latest_snapshot_url || null,
          timestamp: data.last_snapshot_time || null,
          count: data.snapshot_count || 0,
          device_online: this.isOnline(data.last_seen)
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to snapshot:', error);
      callback(null);
    });
  }

  /**
   * Check if device is online (last seen within 30 seconds)
   */
  isOnline(lastSeen) {
    if (!lastSeen) return false;
    const now = Date.now();
    const lastSeenTime = lastSeen.toMillis ? lastSeen.toMillis() : lastSeen;
    return (now - lastSeenTime) < 30000;  // 30 seconds
  }

  /**
   * Get time since last snapshot update
   * @param {Timestamp|number} timestamp - Firestore timestamp or milliseconds
   * @returns {string} Human-readable time ago string
   */
  getTimeSince(timestamp) {
    if (!timestamp) return 'Never';

    try {
      const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown';
    }
  }

  /**
   * Get short time since (e.g., "5s ago", "2m ago")
   */
  getShortTimeSince(timestamp) {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const then = timestamp.toMillis ? timestamp.toMillis() : timestamp;
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  }
}

export default new SnapshotService();
