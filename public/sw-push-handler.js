/**
 * Service Worker Push Handler for BantayBot PWA
 * Handles Firebase Cloud Messaging push notifications in the background
 */

// Import Firebase scripts for Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Firebase configuration (must match your app config)
const firebaseConfig = {
  apiKey: 'AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg',
  authDomain: 'cloudbantaybot.firebaseapp.com',
  projectId: 'cloudbantaybot',
  storageBucket: 'cloudbantaybot.firebasestorage.app',
  messagingSenderId: '346273940225',
  appId: '1:346273940225:web:4c3f43d8ee593802e85100',
};

// Initialize Firebase in Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// URL mappings for notification click navigation
const NOTIFICATION_URLS = {
  soil_moisture: '/',
  soil_temperature: '/',
  soil_ph: '/',
  soil_conductivity: '/',
  health_score: '/crop-health-monitor',
  water_stress: '/rainfall-tracker',
  bird_detection: '/history',
};

// Handle background push messages from FCM
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'BantayBot Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.type || 'bantaybot-notification',
    data: {
      url: payload.data?.url || NOTIFICATION_URLS[payload.data?.type] || '/',
      type: payload.data?.type,
      severity: payload.data?.severity,
      ...payload.data,
    },
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.severity === 'critical',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Determine URL to open based on notification type
  let url = data.url || NOTIFICATION_URLS[data.type] || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle push event directly (for custom server pushes)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    // If it's an FCM message with notification, let onBackgroundMessage handle it
    if (data.notification) {
      return;
    }

    // Handle custom data-only push
    if (data.data) {
      const notificationOptions = {
        body: data.data.body || 'New alert from BantayBot',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.data.type || 'bantaybot',
        data: data.data,
        vibrate: [200, 100, 200],
        requireInteraction: data.data.severity === 'critical',
      };

      event.waitUntil(
        self.registration.showNotification(
          data.data.title || 'BantayBot Alert',
          notificationOptions
        )
      );
    }
  } catch (error) {
    console.error('[SW] Error processing push event:', error);
  }
});

console.log('[SW] Push handler initialized');
