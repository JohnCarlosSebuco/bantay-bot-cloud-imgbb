/**
 * Notification Service for BantayBot PWA
 * Handles Firebase Cloud Messaging (FCM) push notifications
 * for crop health alerts and warnings
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApps } from 'firebase/app';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './FirebaseService';
import { FCM_VAPID_KEY } from '../config/firebase.config';
import {
  NOTIFICATION_THRESHOLDS,
  RECOMMENDATION_THRESHOLDS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_URLS,
} from '../config/notification.config';
import indexedDBService from './IndexedDBService';

const PREFERENCES_KEY = 'notification_preferences';
const DEVICE_ID_KEY = 'bantaybot_device_id';
const LAST_NOTIFICATIONS_KEY = 'notification_last_sent';

class NotificationService {
  constructor() {
    this.messaging = null;
    this.token = null;
    this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    this.lastNotifications = new Map();
    this.initialized = false;
  }

  /**
   * Initialize FCM and load preferences
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Check browser support
      if (!this.isSupported()) {
        console.warn('Push notifications not supported in this browser');
        return false;
      }

      const app = getApps()[0];
      if (!app) {
        console.error('Firebase app not initialized');
        return false;
      }

      this.messaging = getMessaging(app);

      // Load preferences from storage
      await this.loadPreferences();

      // Load last notification times
      await this.loadLastNotificationTimes();

      // Set up foreground message handler
      this.setupForegroundHandler();

      this.initialized = true;
      console.log('NotificationService initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      return false;
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Wait for service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if VAPID key is configured
      if (!FCM_VAPID_KEY || FCM_VAPID_KEY === 'YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE') {
        console.warn('FCM VAPID key not configured. Using local notifications only.');
        return 'local-only';
      }

      // Get FCM token
      this.token = await getToken(this.messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (this.token) {
        console.log('FCM Token obtained');
        await this.saveTokenToFirestore(this.token);
      }

      return this.token;
    } catch (error) {
      console.error('Failed to get notification permission:', error);
      // Still allow local notifications even if FCM fails
      if (Notification.permission === 'granted') {
        return 'local-only';
      }
      return null;
    }
  }

  /**
   * Save FCM token to Firestore for server-side notifications
   */
  async saveTokenToFirestore(token) {
    try {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = 'web_user_' + Date.now();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }

      await setDoc(
        doc(db, 'notification_tokens', deviceId),
        {
          token,
          platform: 'web',
          lastUpdated: new Date().toISOString(),
          preferences: this.preferences,
        },
        { merge: true }
      );

      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Failed to save token to Firestore:', error);
    }
  }

  /**
   * Setup foreground message handler
   */
  setupForegroundHandler() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification manually when app is in foreground
      if (payload.notification) {
        this.showLocalNotification(
          payload.notification.title,
          payload.notification.body,
          payload.data
        );
      }
    });
  }

  /**
   * Show a local notification
   */
  async showLocalNotification(title, body, data = {}) {
    if (Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.type || 'bantaybot',
        data: {
          url: data.url || NOTIFICATION_URLS[data.type] || '/',
          ...data,
        },
        vibrate: [200, 100, 200],
        requireInteraction: data.severity === 'critical',
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    } catch (error) {
      // Fallback to basic notification if service worker fails
      console.warn('Service worker notification failed, using basic notification');
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: data.type || 'bantaybot',
      });
    }
  }

  /**
   * Load notification preferences from storage
   */
  async loadPreferences() {
    try {
      const stored = await indexedDBService.getSetting(PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
    return this.preferences;
  }

  /**
   * Save notification preferences
   */
  async savePreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };

    try {
      await indexedDBService.saveSetting(PREFERENCES_KEY, this.preferences);

      // Sync to Firestore if token exists
      if (this.token && this.token !== 'local-only') {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (deviceId) {
          try {
            await updateDoc(doc(db, 'notification_tokens', deviceId), {
              preferences: this.preferences,
              lastUpdated: new Date().toISOString(),
            });
          } catch (error) {
            console.warn('Failed to sync preferences to Firestore:', error);
          }
        }
      }

      console.log('Notification preferences saved');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return this.preferences;
  }

  /**
   * Load last notification times from storage
   */
  async loadLastNotificationTimes() {
    try {
      const stored = await indexedDBService.getSetting(LAST_NOTIFICATIONS_KEY);
      if (stored && typeof stored === 'object') {
        this.lastNotifications = new Map(Object.entries(stored));
      }
    } catch (error) {
      console.error('Failed to load last notification times:', error);
    }
  }

  /**
   * Save last notification times to storage
   */
  async saveLastNotificationTimes() {
    try {
      const obj = Object.fromEntries(this.lastNotifications);
      await indexedDBService.saveSetting(LAST_NOTIFICATIONS_KEY, obj);
    } catch (error) {
      console.error('Failed to save last notification times:', error);
    }
  }

  /**
   * Check if notification should be sent (throttling)
   */
  shouldSendNotification(type, severity) {
    const key = `${type}_${severity}`;
    const lastSent = this.lastNotifications.get(key);

    if (lastSent) {
      const minInterval = this.preferences.throttle.minIntervalMinutes * 60 * 1000;
      if (Date.now() - lastSent < minInterval) {
        return false;
      }
    }

    // Check quiet hours
    if (this.preferences.throttle.respectQuietHours) {
      const hour = new Date().getHours();
      const { quietHoursStart, quietHoursEnd } = this.preferences.throttle;

      if (quietHoursStart > quietHoursEnd) {
        // Spans midnight (e.g., 22:00 - 06:00)
        if (hour >= quietHoursStart || hour < quietHoursEnd) {
          return false;
        }
      } else {
        if (hour >= quietHoursStart && hour < quietHoursEnd) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Record that a notification was sent
   */
  recordNotificationSent(type, severity) {
    const key = `${type}_${severity}`;
    this.lastNotifications.set(key, Date.now());
    this.saveLastNotificationTimes();
  }

  /**
   * Check sensor data and trigger appropriate notifications
   */
  async checkAndNotify(sensorData, language = 'en') {
    if (!this.preferences.enabled) return;
    if (Notification.permission !== 'granted') return;

    const messages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.en;

    // Check soil moisture
    if (this.preferences.soil_moisture?.enabled && sensorData.soilHumidity !== undefined) {
      await this.checkMoistureThreshold(sensorData.soilHumidity, messages);
    }

    // Check soil temperature
    if (this.preferences.soil_temperature?.enabled && sensorData.soilTemperature !== undefined) {
      await this.checkTemperatureThreshold(sensorData.soilTemperature, messages);
    }

    // Check pH
    if (this.preferences.soil_ph?.enabled && sensorData.ph !== undefined) {
      await this.checkPhThreshold(sensorData.ph, messages);
    }

    // Check conductivity
    if (this.preferences.soil_conductivity?.enabled && sensorData.soilConductivity !== undefined) {
      await this.checkConductivityThreshold(sensorData.soilConductivity, messages);
    }
  }

  /**
   * Check soil moisture threshold
   */
  async checkMoistureThreshold(value, messages) {
    const type = 'soil_moisture';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];

    if (prefs.critical && value < thresholds.critical.below) {
      if (this.shouldSendNotification(type, 'critical')) {
        const msg = messages[type].critical;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'critical', value }
        );
        this.recordNotificationSent(type, 'critical');
      }
    } else if (prefs.warning && value < thresholds.warning.below) {
      if (this.shouldSendNotification(type, 'warning')) {
        const msg = messages[type].warning;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'warning', value }
        );
        this.recordNotificationSent(type, 'warning');
      }
    }
  }

  /**
   * Check temperature threshold (bi-directional)
   */
  async checkTemperatureThreshold(value, messages) {
    const type = 'soil_temperature';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];

    // Critical high
    if (prefs.critical && value > thresholds.critical.above) {
      if (this.shouldSendNotification(type, 'critical_high')) {
        const msg = messages[type].critical_high;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'critical', direction: 'high', value }
        );
        this.recordNotificationSent(type, 'critical_high');
      }
    }
    // Critical low
    else if (prefs.critical && value < thresholds.critical.below) {
      if (this.shouldSendNotification(type, 'critical_low')) {
        const msg = messages[type].critical_low;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'critical', direction: 'low', value }
        );
        this.recordNotificationSent(type, 'critical_low');
      }
    }
    // Warning high
    else if (prefs.warning && value > thresholds.warning.above) {
      if (this.shouldSendNotification(type, 'warning_high')) {
        const msg = messages[type].warning_high;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'warning', direction: 'high', value }
        );
        this.recordNotificationSent(type, 'warning_high');
      }
    }
    // Warning low
    else if (prefs.warning && value < thresholds.warning.below) {
      if (this.shouldSendNotification(type, 'warning_low')) {
        const msg = messages[type].warning_low;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'warning', direction: 'low', value }
        );
        this.recordNotificationSent(type, 'warning_low');
      }
    }
  }

  /**
   * Check pH threshold (bi-directional)
   */
  async checkPhThreshold(value, messages) {
    const type = 'soil_ph';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];

    if (prefs.critical && value < thresholds.critical.below) {
      if (this.shouldSendNotification(type, 'critical_acidic')) {
        const msg = messages[type].critical_acidic;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'critical', direction: 'acidic', value }
        );
        this.recordNotificationSent(type, 'critical_acidic');
      }
    } else if (prefs.critical && value > thresholds.critical.above) {
      if (this.shouldSendNotification(type, 'critical_alkaline')) {
        const msg = messages[type].critical_alkaline;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'critical', direction: 'alkaline', value }
        );
        this.recordNotificationSent(type, 'critical_alkaline');
      }
    } else if (prefs.warning && value < thresholds.warning.below) {
      if (this.shouldSendNotification(type, 'warning_acidic')) {
        const msg = messages[type].warning_acidic;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'warning', direction: 'acidic', value }
        );
        this.recordNotificationSent(type, 'warning_acidic');
      }
    } else if (prefs.warning && value > thresholds.warning.above) {
      if (this.shouldSendNotification(type, 'warning_alkaline')) {
        const msg = messages[type].warning_alkaline;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(1)),
          { type, severity: 'warning', direction: 'alkaline', value }
        );
        this.recordNotificationSent(type, 'warning_alkaline');
      }
    }
  }

  /**
   * Check conductivity threshold
   */
  async checkConductivityThreshold(value, messages) {
    const type = 'soil_conductivity';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];

    if (prefs.critical && value < thresholds.critical.below) {
      if (this.shouldSendNotification(type, 'critical')) {
        const msg = messages[type].critical;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(0)),
          { type, severity: 'critical', value }
        );
        this.recordNotificationSent(type, 'critical');
      }
    } else if (prefs.warning && value < thresholds.warning.below) {
      if (this.shouldSendNotification(type, 'warning')) {
        const msg = messages[type].warning;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', value.toFixed(0)),
          { type, severity: 'warning', value }
        );
        this.recordNotificationSent(type, 'warning');
      }
    }
  }

  /**
   * Check health score
   */
  async checkHealthScore(score, language = 'en') {
    if (!this.preferences.enabled) return;
    if (!this.preferences.health_score?.enabled) return;
    if (Notification.permission !== 'granted') return;

    const type = 'health_score';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];
    const messages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.en;

    if (prefs.critical && score < thresholds.critical.below) {
      if (this.shouldSendNotification(type, 'critical')) {
        const msg = messages[type].critical;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', score.toFixed(0)),
          { type, severity: 'critical', value: score }
        );
        this.recordNotificationSent(type, 'critical');
      }
    } else if (prefs.warning && score < thresholds.warning.below) {
      if (this.shouldSendNotification(type, 'warning')) {
        const msg = messages[type].warning;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', score.toFixed(0)),
          { type, severity: 'warning', value: score }
        );
        this.recordNotificationSent(type, 'warning');
      }
    }
  }

  /**
   * Check water stress (days without rain)
   */
  async checkWaterStress(daysSinceRain, language = 'en') {
    if (!this.preferences.enabled) return;
    if (!this.preferences.water_stress?.enabled) return;
    if (Notification.permission !== 'granted') return;

    const type = 'water_stress';
    const thresholds = NOTIFICATION_THRESHOLDS[type];
    const prefs = this.preferences[type];
    const messages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.en;

    if (prefs.critical && daysSinceRain >= thresholds.critical.daysWithoutRain) {
      if (this.shouldSendNotification(type, 'critical')) {
        const msg = messages[type].critical;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', daysSinceRain),
          { type, severity: 'critical', value: daysSinceRain }
        );
        this.recordNotificationSent(type, 'critical');
      }
    } else if (prefs.warning && daysSinceRain >= thresholds.warning.daysWithoutRain) {
      if (this.shouldSendNotification(type, 'warning')) {
        const msg = messages[type].warning;
        await this.showLocalNotification(
          msg.title,
          msg.body.replace('{value}', daysSinceRain),
          { type, severity: 'warning', value: daysSinceRain }
        );
        this.recordNotificationSent(type, 'warning');
      }
    }
  }

  /**
   * Notify bird detection
   */
  async notifyBirdDetection(language = 'en') {
    if (!this.preferences.enabled) return;
    if (!this.preferences.bird_detection?.enabled) return;
    if (Notification.permission !== 'granted') return;

    const type = 'bird_detection';
    const messages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.en;

    if (this.shouldSendNotification(type, 'alert')) {
      const msg = messages[type].alert;
      await this.showLocalNotification(msg.title, msg.body, {
        type,
        severity: 'alert',
      });
      this.recordNotificationSent(type, 'alert');
    }
  }

  /**
   * Check smart recommendations and trigger notifications
   * Same thresholds as SmartRecommendations.jsx
   */
  async checkRecommendations(sensorData, language = 'en') {
    if (!this.preferences.enabled) return;
    if (!this.preferences.recommendations?.enabled) return;
    if (Notification.permission !== 'granted') return;

    const messages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.en;
    const recMessages = messages.recommendations;
    const prefs = this.preferences.recommendations;
    const thresholds = RECOMMENDATION_THRESHOLDS;

    // Check: Irrigate paddy (humidity < 60%)
    if (prefs.irrigate && sensorData.soilHumidity !== undefined) {
      if (sensorData.soilHumidity < thresholds.irrigate.humidity_below) {
        if (this.shouldSendNotification('recommend_irrigate', 'action')) {
          const msg = recMessages.irrigate;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilHumidity.toFixed(1)),
            { type: 'recommend_irrigate', severity: 'high', value: sensorData.soilHumidity }
          );
          this.recordNotificationSent('recommend_irrigate', 'action');
        }
      }
    }

    // Check: Mid-season drainage (humidity > 95%)
    if (prefs.drainage && sensorData.soilHumidity !== undefined) {
      if (sensorData.soilHumidity > thresholds.drainage.humidity_above) {
        if (this.shouldSendNotification('recommend_drainage', 'action')) {
          const msg = recMessages.drainage;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilHumidity.toFixed(1)),
            { type: 'recommend_drainage', severity: 'medium', value: sensorData.soilHumidity }
          );
          this.recordNotificationSent('recommend_drainage', 'action');
        }
      }
    }

    // Check: Increase water depth (temp > 35°C)
    if (prefs.water_depth && sensorData.soilTemperature !== undefined) {
      if (sensorData.soilTemperature > thresholds.water_depth_hot.temp_above) {
        if (this.shouldSendNotification('recommend_water_depth_hot', 'action')) {
          const msg = recMessages.water_depth_hot;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilTemperature.toFixed(1)),
            { type: 'recommend_water_depth_hot', severity: 'medium', value: sensorData.soilTemperature }
          );
          this.recordNotificationSent('recommend_water_depth_hot', 'action');
        }
      }
      // Check: Deepen water level (temp < 18°C)
      else if (sensorData.soilTemperature < thresholds.water_depth_cold.temp_below) {
        if (this.shouldSendNotification('recommend_water_depth_cold', 'action')) {
          const msg = recMessages.water_depth_cold;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilTemperature.toFixed(1)),
            { type: 'recommend_water_depth_cold', severity: 'medium', value: sensorData.soilTemperature }
          );
          this.recordNotificationSent('recommend_water_depth_cold', 'action');
        }
      }
    }

    // Check: Apply fertilizer (conductivity < 300)
    if (prefs.fertilizer && sensorData.soilConductivity !== undefined) {
      if (sensorData.soilConductivity < thresholds.fertilizer.conductivity_below) {
        if (this.shouldSendNotification('recommend_fertilizer', 'action')) {
          const msg = recMessages.fertilizer;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilConductivity.toFixed(0)),
            { type: 'recommend_fertilizer', severity: 'medium', value: sensorData.soilConductivity }
          );
          this.recordNotificationSent('recommend_fertilizer', 'action');
        }
      }
      // Check: Skip fertilizer (conductivity > 1500)
      else if (sensorData.soilConductivity > thresholds.skip_fertilizer.conductivity_above) {
        if (this.shouldSendNotification('recommend_skip_fertilizer', 'action')) {
          const msg = recMessages.skip_fertilizer;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.soilConductivity.toFixed(0)),
            { type: 'recommend_skip_fertilizer', severity: 'info', value: sensorData.soilConductivity }
          );
          this.recordNotificationSent('recommend_skip_fertilizer', 'action');
        }
      }
    }

    // Check: Apply rice straw ash (pH < 5.5)
    if (prefs.ph_ash && sensorData.ph !== undefined) {
      if (sensorData.ph < thresholds.ph_ash.ph_below) {
        if (this.shouldSendNotification('recommend_ph_ash', 'action')) {
          const msg = recMessages.ph_ash;
          await this.showLocalNotification(
            msg.title,
            msg.body.replace('{value}', sensorData.ph.toFixed(1)),
            { type: 'recommend_ph_ash', severity: 'high', value: sensorData.ph }
          );
          this.recordNotificationSent('recommend_ph_ash', 'action');
        }
      }
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
