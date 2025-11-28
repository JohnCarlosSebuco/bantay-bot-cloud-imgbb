import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// App version - update this to force cache clear
const APP_VERSION = '1.0.2';
const VERSION_KEY = 'bantaybot_version';

// Force cache clear on version mismatch
const forceUpdate = async () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    console.log(`Version mismatch: ${storedVersion} -> ${APP_VERSION}, clearing caches...`);

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('Service workers unregistered');
    }

    // Store new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    // Force reload from server
    window.location.reload(true);
    return;
  }
};

// Run version check
forceUpdate();

// Auto-reload when new service worker is activated
if ('serviceWorker' in navigator) {
  // Reload when new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // Check for updates every 60 seconds
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update();
      }
    });
  }, 60 * 1000);

  // Also check for updates when app becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
        }
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
