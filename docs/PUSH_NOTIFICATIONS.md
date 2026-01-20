# Push Notifications System

This document describes the push notification system implemented in BantayBot PWA to alert farmers about warning and critical crop conditions.

## Overview

The notification system uses Firebase Cloud Messaging (FCM) to deliver push notifications to farmers even when the app is closed. Notifications are triggered based on sensor data thresholds and can be fully customized by the user.

## Features

- **Real-time Alerts**: Notifications triggered when sensor values exceed thresholds
- **Warning & Critical Levels**: Separate notification levels for each condition
- **Bilingual Support**: Messages in English and Tagalog
- **User Customization**: Full control over which notifications to receive
- **Throttling**: Prevents notification spam with configurable intervals
- **Quiet Hours**: Optional silent period during sleep time
- **Background Support**: Works even when the app is closed

## Notification Types

| Type | Warning Threshold | Critical Threshold |
|------|-------------------|-------------------|
| Soil Moisture | < 40% | < 20% |
| Soil Temperature | < 20°C or > 30°C | < 10°C or > 35°C |
| Soil pH | < 5.5 or > 7.5 | < 4.0 or > 8.5 |
| Soil Conductivity | < 200 µS/cm | < 100 µS/cm |
| Health Score | < 60% | < 40% |
| Water Stress | > 7 days no rain | > 14 days no rain |

## Setup Instructions

### 1. Get VAPID Key from Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (bantay-bot)
3. Go to **Project Settings** > **Cloud Messaging**
4. Scroll to **Web configuration** section
5. Click **Generate key pair** if you don't have one
6. Copy the generated key

### 2. Configure VAPID Key

Open `src/config/firebase.config.js` and replace the placeholder:

```javascript
export const FCM_VAPID_KEY = 'your-actual-vapid-key-here';
```

### 3. Build and Deploy

```bash
npm run build
npm run deploy
```

## File Structure

```
src/
├── config/
│   ├── firebase.config.js      # Firebase config + VAPID key
│   └── notification.config.js  # Thresholds, messages, defaults
├── services/
│   └── NotificationService.js  # Core notification logic
├── components/ui/
│   └── NotificationPreferences.jsx  # Settings UI component
└── pages/
    ├── Dashboard.jsx           # Integrates notification checks
    └── Settings.jsx            # Includes NotificationPreferences

public/
└── sw-push-handler.js          # Service worker for background notifications
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Dashboard     │────>│ NotificationService│────>│ Service Worker  │
│ (Sensor Data)   │     │   (Check & Send)  │     │ (Background)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               v                         v
                        ┌──────────────────┐     ┌─────────────────┐
                        │    IndexedDB     │     │  FCM (Firebase) │
                        │  (Preferences)   │     │  (Push Server)  │
                        └──────────────────┘     └─────────────────┘
```

## NotificationService API

### Initialization

```javascript
import notificationService from './services/NotificationService';

// Initialize (called automatically in main.jsx)
await notificationService.initialize();
```

### Request Permission

```javascript
// Returns FCM token or 'local-only' or null
const token = await notificationService.requestPermission();
```

### Check Sensor Data

```javascript
// Automatically checks thresholds and sends notifications
await notificationService.checkAndNotify(sensorData, 'en');
```

### Check Health Score

```javascript
await notificationService.checkHealthScore(healthScore, 'en');
```

### Check Water Stress

```javascript
await notificationService.checkWaterStress(daysSinceRain, 'en');
```

### Manage Preferences

```javascript
// Get current preferences
const prefs = notificationService.getPreferences();

// Update preferences
await notificationService.savePreferences({
  enabled: true,
  soil_moisture: { enabled: true, warning: true, critical: true },
  throttle: { minIntervalMinutes: 30 }
});
```

## User Preferences

Users can configure notifications in **Settings > Push Notifications**:

### Master Toggle
- Enable/disable all push notifications

### Per-Category Settings
Each notification type can be individually configured:
- **Enabled**: Toggle the entire category on/off
- **Warning**: Receive warning-level notifications
- **Critical**: Receive critical-level notifications

### Throttling
- **Minimum Interval**: Time between same notification type (5-120 minutes)
- **Quiet Hours**: Optional silent period (e.g., 10 PM - 6 AM)

## Notification Messages

Messages are available in English and Tagalog. Example:

**English (Critical Soil Moisture)**:
> Title: "Critical: Soil Too Dry!"
> Body: "Soil moisture critically low (15.2%). Crops may be stressed!"

**Tagalog (Critical Soil Moisture)**:
> Title: "Kritikal: Tuyo ang Lupa!"
> Body: "Sobrang tuyo ang lupa (15.2%). Baka stressed ang pananim!"

## Click Actions

When a notification is clicked, the app navigates to the relevant page:

| Notification Type | Destination |
|-------------------|-------------|
| Soil Moisture | Dashboard (/) |
| Soil Temperature | Dashboard (/) |
| Soil pH | Dashboard (/) |
| Soil Conductivity | Dashboard (/) |
| Health Score | Crop Health Monitor (/crop-health-monitor) |
| Water Stress | Rainfall Tracker (/rainfall-tracker) |
| Bird Detection | History (/history) |

## Troubleshooting

### Notifications not appearing

1. Check browser notification permission (should be "granted")
2. Verify VAPID key is configured correctly
3. Check browser console for errors
4. Ensure service worker is registered

### Notifications blocked

If the user denied notification permission:
1. Go to browser settings
2. Find site permissions for the app URL
3. Change notification permission to "Allow"
4. Refresh the app

### Throttling issues

If notifications seem delayed:
- Check the minimum interval setting (default: 30 minutes)
- Check quiet hours settings
- Same notification type won't repeat within the interval

## Future Improvements

- Server-side notifications via Firebase Cloud Functions
- SMS fallback for critical alerts
- Custom notification sounds
- Notification history/log in the app
