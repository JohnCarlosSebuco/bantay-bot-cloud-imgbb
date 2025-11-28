import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

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
