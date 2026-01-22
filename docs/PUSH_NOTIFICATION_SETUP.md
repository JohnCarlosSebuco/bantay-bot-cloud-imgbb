# BantayBot Push Notification Setup

## Overview

BantayBot uses Firebase Cloud Messaging (FCM) with Pipedream webhooks to send push notifications even when the app is closed.

## Architecture

```
ESP32 Detects Event → Calls Pipedream Webhook → Pipedream sends FCM → User receives notification
```

## Firebase Project

- **Project ID:** `cloudbantaybot`
- **Console:** https://console.firebase.google.com/project/cloudbantaybot

---

## Notification Types

### 1. Bird Detection
| Field | Value |
|-------|-------|
| Type | `bird_detection` |
| Trigger | ESP32 camera detects bird |
| URL | `/history` |

### 2. Soil Moisture
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning | < 40% | Soil moisture is low |
| Critical | < 20% | Soil moisture critically low |

### 3. Soil Temperature
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning Low | < 20°C | Soil is cold |
| Warning High | > 30°C | Soil is getting hot |
| Critical Low | < 10°C | Soil too cold |
| Critical High | > 35°C | Soil too hot |

### 4. Soil pH
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning Acidic | < 5.5 | Soil is acidic |
| Warning Alkaline | > 7.5 | Soil is alkaline |
| Critical Acidic | < 4.0 | Soil extremely acidic |
| Critical Alkaline | > 8.5 | Soil extremely alkaline |

### 5. Soil Conductivity (Nutrients)
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning | < 200 µS/cm | Nutrients low |
| Critical | < 100 µS/cm | Severe nutrient deficiency |

### 6. Health Score
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning | < 60% | Health score dropped |
| Critical | < 40% | Poor crop health |

### 7. Water Stress
| Level | Threshold | Message |
|-------|-----------|---------|
| Warning | 7 days no rain | Drought warning |
| Critical | 14 days no rain | Extended drought |

---

## Smart Recommendations

| Recommendation | Trigger | Action |
|----------------|---------|--------|
| Irrigate | Humidity < 60% | Add water to paddy |
| Drainage | Humidity > 95% | Drain for 1 week |
| Water Depth (Hot) | Temp > 35°C | Increase water depth |
| Water Depth (Cold) | Temp < 18°C | Deepen water level |
| Fertilizer | Conductivity < 300 | Apply fertilizer |
| Skip Fertilizer | Conductivity > 1500 | Don't fertilize |
| pH Ash | pH < 5.5 | Apply rice straw ash |

---

## Pipedream Setup

### Webhook URL
```
https://[YOUR_PIPEDREAM_URL].m.pipedream.net
```

### Firebase Admin Connection
- **Project ID:** `cloudbantaybot`
- **Client Email:** `firebase-adminsdk-fbsvc@cloudbantaybot.iam.gserviceaccount.com`
- **Private Key:** (from service account JSON)

### Code Template

```javascript
import admin from "firebase-admin"

export default defineComponent({
  props: {
    firebase_admin_sdk: {
      type: "app",
      app: "firebase_admin_sdk",
    },
  },
  async run({ steps, $ }) {
    const {
      projectId,
      clientEmail,
      privateKey,
    } = this.firebase_admin_sdk.$auth

    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n")

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      })
    }

    const db = admin.firestore()

    // Get all FCM tokens
    const tokensSnapshot = await db.collection('notification_tokens').get()
    const tokens = tokensSnapshot.docs
      .map(doc => doc.data().token)
      .filter(token => token)

    if (tokens.length === 0) {
      return { success: false, message: 'No tokens found' }
    }

    // Get notification type from webhook body (optional)
    const type = steps.trigger.event.body?.type || 'bird_detection'
    const value = steps.trigger.event.body?.value || ''

    // Notification messages
    const messages = {
      bird_detection: {
        title: 'Bird Detected!',
        body: 'Nakakita ng ibon sa taniman'
      },
      soil_moisture_warning: {
        title: 'Soil Moisture Warning',
        body: `Soil moisture is low (${value}%)`
      },
      soil_moisture_critical: {
        title: 'Critical: Soil Too Dry!',
        body: `Soil moisture critically low (${value}%)`
      },
      soil_temperature_high: {
        title: 'Soil Temperature Warning',
        body: `Soil is getting hot (${value}°C)`
      },
      soil_temperature_low: {
        title: 'Soil Temperature Warning',
        body: `Soil is cold (${value}°C)`
      },
      soil_ph_acidic: {
        title: 'Soil pH Warning',
        body: `Soil is acidic (pH ${value})`
      },
      soil_ph_alkaline: {
        title: 'Soil pH Warning',
        body: `Soil is alkaline (pH ${value})`
      },
      nutrient_low: {
        title: 'Low Nutrient Warning',
        body: `Soil nutrients low (${value} µS/cm)`
      }
    }

    const notification = messages[type] || messages.bird_detection

    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        type: type,
        url: '/history'
      },
      tokens: tokens
    }

    const response = await admin.messaging().sendEachForMulticast(message)

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length
    }
  },
})
```

---

## ESP32 Webhook Call

Add to Arduino code when detection occurs:

```cpp
#include <HTTPClient.h>

const char* PIPEDREAM_WEBHOOK = "https://[YOUR_URL].m.pipedream.net";

void sendNotification(String type, String value) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(PIPEDREAM_WEBHOOK);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"type\":\"" + type + "\",\"value\":\"" + value + "\"}";

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      Serial.println("Notification sent: " + String(httpCode));
    } else {
      Serial.println("Notification failed");
    }

    http.end();
  }
}

// Usage examples:
// sendNotification("bird_detection", "");
// sendNotification("soil_moisture_warning", "35");
// sendNotification("soil_temperature_high", "36");
```

---

## Testing

### Test via Browser
Visit your Pipedream webhook URL:
```
https://[YOUR_URL].m.pipedream.net
```

### Test with Parameters
```bash
curl -X POST https://[YOUR_URL].m.pipedream.net \
  -H "Content-Type: application/json" \
  -d '{"type":"soil_moisture_warning","value":"25"}'
```

---

## Firestore Collections

### `notification_tokens`
Stores FCM tokens for each device.

| Field | Type | Description |
|-------|------|-------------|
| token | string | FCM token |
| platform | string | "web" |
| lastUpdated | string | ISO timestamp |
| preferences | object | User notification preferences |
| subscribedTopics | array | ["bantaybot"] |

---

## Troubleshooting

### No notifications received
1. Check Firestore for tokens in `notification_tokens`
2. Verify Pipedream workflow is deployed
3. Check browser notification permissions
4. Clear site data and re-enable notifications

### Token not saving
1. Verify VAPID key is correct in `firebase.config.js`
2. Check browser console for errors
3. Ensure Firestore rules allow writes

### Pipedream errors
1. Check Firebase Admin connection credentials
2. Verify service account has Firestore access
3. Check Pipedream logs for specific errors

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/config/firebase.config.js` | Firebase config + VAPID key |
| `src/config/notification.config.js` | Thresholds and messages |
| `src/services/NotificationService.js` | FCM token management |
| `public/sw-push-handler.js` | Service worker for background notifications |
| `arduino/.../config.h` | ESP32 Firebase config |
