# BantayBot Online/Offline Mode Implementation Guide

## Overview

This document provides a complete implementation guide for adding online/offline mode functionality to BantayBot. The feature enables the bot to continue protecting crops (bird detection, alarm triggering, head movement) even when internet connectivity is lost, while queuing data for sync when connectivity returns.

**Key Goals:**
- Bot continues all protection functions without internet
- Detection events queued locally for later sync
- Non-blocking connectivity checks (no delays to detection/alarm)
- Mobile app can switch between ONLINE and OFFLINE modes
- Camera and Main Board maintain local communication regardless of internet
- Respects tight ESP32 memory constraints

---

## Important Notes

### Arduino Code Flexibility
> **NOTE:** The Arduino code structure may change before implementing this feature (e.g., adding a second soil sensor). The code examples in this document should be adapted to match the actual code structure at implementation time. The key concepts (state machine, queue, sync protocol) remain the same regardless of sensor count.

### Local Network vs Internet (CRITICAL)
> **CRITICAL:** Camera Board and Main Board communicate via **local HTTP** on the same WiFi network. This communication works even WITHOUT internet - they only need to be on the same local network. The "offline mode" refers to no INTERNET connection (Firebase unreachable), but local device communication still works.

### Camera-to-MainBoard Always Works
> **VERY IMPORTANT:** The Camera Board sends bird detection triggers to Main Board via LOCAL WiFi HTTP requests. This is NOT dependent on internet. As long as both devices are connected to the same WiFi router (even if that router has no internet), the Camera can trigger the Main Board to sound alarms. The alarm system is 100% local.

### No External Image Storage
> **NOTE:** This implementation does NOT use external image storage services. Detection events are logged without images when offline, or you can implement local image storage on the ESP32 if needed in the future.

---

## System Architecture

### Current Hardware
| Board | Model | Free RAM | Role |
|-------|-------|----------|------|
| Main Board | ESP32 DevKit v1 | ~160KB | Sensors (will have 2 soil sensors), motors, audio, Firebase |
| Camera Board | ESP32-CAM AI Thinker | ~180KB | Bird detection, image capture |

### Communication Flow

```
+-------------------------------------------------------------------------+
|                        LOCAL NETWORK (WiFi)                              |
|   *** THIS ALWAYS WORKS - EVEN WITHOUT INTERNET ***                     |
|   (Devices only need to be on the same WiFi network)                    |
|                                                                          |
|  +---------------+     Local HTTP      +---------------+                 |
|  | Camera Board  | ==================> |  Main Board   |                 |
|  |  (ESP32-CAM)  |   POST /bird_detected|  (ESP32)     |                 |
|  |               | <================== |               |                 |
|  |  Detection    |    Response 200 OK  |  ALARM!       |                 |
|  |  Runs Always  |                     |  Queue Data   |                 |
|  +---------------+                     |  Sensors      |                 |
|        ^                               +-------+-------+                 |
|        |                                       |                         |
|   Bird Detected!                               |                         |
|   -> Send to Main Board                        |                         |
|   -> Main Board triggers alarm                 |                         |
|   -> Works with or without internet            |                         |
+--------------------------------------------|------------------------------+
                                             |
                              ===============|===============
                              |     INTERNET (Firebase)     |
                              |     *** OPTIONAL ***        |
                              |     Only needed for:        |
                              |     - Cloud sync            |
                              |     - Mobile commands       |
                              |     - Push notifications    |
                              |     - Remote monitoring     |
                              =================================
```

### What Works WITHOUT Internet (Offline Mode)

| Feature | Works Offline? | Notes |
|---------|---------------|-------|
| Bird Detection | YES | Camera detects motion/birds locally |
| Camera -> Main Board Trigger | YES | Local HTTP, same WiFi network |
| Alarm Sound | YES | Main Board plays audio locally |
| Head Movement/Scanning | YES | Main Board controls motors locally |
| Arm Movement | YES | Main Board controls arms locally |
| Sensor Reading | YES | Main Board reads sensors locally |
| Data Queuing | YES | Detections stored in local memory |
| Mobile App (same WiFi) | YES | Can view status via local IP |

### What Requires Internet (Online Mode)

| Feature | Requires Internet? | Notes |
|---------|-------------------|-------|
| Firebase Sync | YES | Cloud database |
| Push Notifications | YES | FCM requires internet |
| Remote Mobile Access | YES | Outside local network |
| Detection History in Cloud | YES | Firestore storage |

### State Machine

```
+------------------+     Internet Lost       +------------------+
|                  | ----------------------> |                  |
|   ONLINE MODE    |                         |  OFFLINE MODE    |
|   (Firebase)     | <---------------------- |  (Local Queue)   |
|                  |     Internet Restored   |                  |
+------------------+                         +------------------+
        |              +------------------+          |
        |              |  TRANSITIONING   |          |
        +------------> |  (Syncing Data)  | <--------+
                       +------------------+

*** IMPORTANT: Bird detection and alarm ALWAYS work in both modes! ***

User can also FORCE either mode from mobile app
```

**ONLINE MODE:**
- Full Firebase sync
- Real-time sensor updates to cloud
- Mobile app commands work
- Push notifications active
- **Bird detection + alarm STILL WORKS** (local)

**OFFLINE MODE:**
- Bird detection still works (Camera -> Main Board via local HTTP)
- Alarm triggers locally
- Head scanning continues
- Detections queued on Main Board
- Sensor data sampled for later sync
- Mobile app can still view status via local network (same WiFi)
- **ALL PROTECTION FEATURES WORK**

---

## Part 1: ESP32 Main Board Implementation

### File: `arduino/BantayBot_Main_Firebase/MainBoard_Firebase/MainBoard_Firebase.ino`

> **ADAPT:** Adjust variable names and sensor structures to match the actual code at implementation time. The code may have 2 soil sensors by then.

### 1.1 Add Connection State Variables

Add these at the top with other global variables:

```cpp
// ========== OFFLINE MODE STATE ==========
enum ConnectionState { CONN_ONLINE, CONN_OFFLINE, CONN_TRANSITIONING };
ConnectionState connectionState = CONN_ONLINE;
unsigned long lastConnectivityCheck = 0;
const unsigned long CONNECTIVITY_CHECK_INTERVAL = 15000;  // Check every 15 seconds
unsigned long offlineSince = 0;

// User mode preference from mobile app
// 0 = AUTO (detect automatically), 1 = FORCE_ONLINE, 2 = FORCE_OFFLINE
int userModePreference = 0;
```

### 1.2 Add Detection Queue Data Structure

Memory budget: ~1,000 bytes for 20 detection entries (no image URLs stored)

```cpp
// ========== DETECTION QUEUE ==========
// Stores detection events when offline for later Firebase sync
struct QueuedDetection {
  uint32_t timestamp;        // millis() when detected
  uint16_t birdSize;         // Detected bird size in pixels
  uint8_t confidence;        // Detection confidence 0-100
  uint8_t zoneX, zoneY;      // Detection zone position
  uint16_t zoneW, zoneH;     // Detection zone size
  bool synced;               // Has been synced to Firebase
  bool alarmTriggered;       // Was alarm triggered for this detection
};  // ~12 bytes per entry

#define MAX_DETECTION_QUEUE 20
QueuedDetection detectionQueue[MAX_DETECTION_QUEUE];
int queueHead = 0;
int queueCount = 0;

// ========== SENSOR QUEUE ==========
// Flexible structure - adapt fields to match actual sensors
// Example with 2 soil sensors:
struct QueuedSensorData {
  uint32_t timestamp;
  // Sensor 1
  float sensor1Humidity;
  float sensor1Temperature;
  float sensor1Conductivity;
  float sensor1PH;
  // Sensor 2 (add when second sensor is installed)
  float sensor2Humidity;
  float sensor2Temperature;
  float sensor2Conductivity;
  float sensor2PH;
  // Ambient
  float dhtTemperature;
  float dhtHumidity;
};  // Adjust size based on actual sensors

#define SENSOR_QUEUE_SIZE 6
QueuedSensorData sensorQueue[SENSOR_QUEUE_SIZE];
int sensorQueueIndex = 0;
```

### 1.3 Non-Blocking Connectivity Check Function

```cpp
// Check internet connectivity without blocking operations
// This does NOT affect local Camera-MainBoard communication
bool checkInternetConnectivity() {
  // Step 1: Check WiFi connection to router
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected to router");
    return false;
  }

  // Step 2: Quick DNS resolution test (checks internet, not local network)
  // Using NTP server as it's lightweight and reliable
  IPAddress resolved;
  int result = WiFi.hostByName("pool.ntp.org", resolved, 2000);  // 2 second timeout

  if (result != 1) {
    Serial.println("Internet unreachable (DNS failed)");
    return false;
  }

  return true;
}

// Update connection state - call this in loop()
// IMPORTANT: This only affects Firebase/cloud operations
// Local Camera-MainBoard HTTP always works if WiFi connected
void updateConnectionState() {
  // Handle user-forced modes
  if (userModePreference == 2) {  // FORCE_OFFLINE
    if (connectionState != CONN_OFFLINE) {
      connectionState = CONN_OFFLINE;
      offlineSince = millis();
      Serial.println("User forced OFFLINE mode");
    }
    return;
  }

  if (userModePreference == 1) {  // FORCE_ONLINE
    if (connectionState != CONN_ONLINE) {
      // Try to go online - if internet available
      if (checkInternetConnectivity() && firebaseConnected) {
        connectionState = CONN_ONLINE;
        offlineSince = 0;
        Serial.println("User forced ONLINE mode - connected");
      } else {
        Serial.println("User wants ONLINE but internet unavailable");
        // Stay in current state, will retry next check
      }
    }
    return;
  }

  // AUTO mode (userModePreference == 0) - detect automatically
  // Rate limit connectivity checks to avoid blocking
  if (millis() - lastConnectivityCheck < CONNECTIVITY_CHECK_INTERVAL) {
    return;
  }
  lastConnectivityCheck = millis();

  bool hasInternet = checkInternetConnectivity();

  // Handle state transitions
  if (hasInternet && connectionState == CONN_OFFLINE) {
    // Coming back online - sync queued data
    connectionState = CONN_TRANSITIONING;
    Serial.println("Internet restored - starting sync...");
    syncQueuedData();
    connectionState = CONN_ONLINE;
    offlineSince = 0;
    Serial.println("Now in ONLINE mode");

  } else if (!hasInternet && connectionState == CONN_ONLINE) {
    // Going offline
    connectionState = CONN_OFFLINE;
    offlineSince = millis();
    Serial.println("Internet lost - switching to OFFLINE mode");
    Serial.println("Bot will continue protecting - data will be queued");
  }
}
```

### 1.4 Queue Management Functions

```cpp
// Add detection to queue (circular buffer with priority)
void queueDetection(int birdSize, int confidence, String detectionZone, bool alarmTriggered) {
  int targetIndex;

  if (queueCount < MAX_DETECTION_QUEUE) {
    // Queue not full - add to end
    targetIndex = (queueHead + queueCount) % MAX_DETECTION_QUEUE;
    queueCount++;
  } else {
    // Queue full - find lowest confidence unsynced entry to replace
    int lowestIndex = -1;
    int lowestConfidence = 101;

    for (int i = 0; i < queueCount; i++) {
      int idx = (queueHead + i) % MAX_DETECTION_QUEUE;
      if (!detectionQueue[idx].synced && detectionQueue[idx].confidence < lowestConfidence) {
        lowestConfidence = detectionQueue[idx].confidence;
        lowestIndex = idx;
      }
    }

    if (lowestIndex >= 0 && confidence > lowestConfidence) {
      targetIndex = lowestIndex;
      Serial.printf("Queue full - replacing low confidence entry (%d%% -> %d%%)\n",
                    lowestConfidence, confidence);
    } else {
      Serial.println("Queue full - detection dropped (lower priority)");
      return;
    }
  }

  // Store detection
  detectionQueue[targetIndex].timestamp = millis();
  detectionQueue[targetIndex].birdSize = birdSize;
  detectionQueue[targetIndex].confidence = confidence;
  detectionQueue[targetIndex].synced = false;
  detectionQueue[targetIndex].alarmTriggered = alarmTriggered;

  // Parse detection zone "x,y,w,h" if provided
  int zx = 0, zy = 0, zw = 320, zh = 240;
  if (detectionZone.length() > 0) {
    sscanf(detectionZone.c_str(), "%d,%d,%d,%d", &zx, &zy, &zw, &zh);
  }
  detectionQueue[targetIndex].zoneX = zx;
  detectionQueue[targetIndex].zoneY = zy;
  detectionQueue[targetIndex].zoneW = zw;
  detectionQueue[targetIndex].zoneH = zh;

  Serial.printf("Detection queued [%d/%d] - confidence: %d%%\n",
                queueCount, MAX_DETECTION_QUEUE, confidence);
}

// Queue current sensor readings
// ADAPT: Modify to match actual sensor variables in your code
void queueSensorReading() {
  sensorQueue[sensorQueueIndex].timestamp = millis();

  // Sensor 1 - adapt variable names to your code
  sensorQueue[sensorQueueIndex].sensor1Humidity = soilHumidity;      // or soil1Humidity
  sensorQueue[sensorQueueIndex].sensor1Temperature = soilTemperature;
  sensorQueue[sensorQueueIndex].sensor1Conductivity = soilConductivity;
  sensorQueue[sensorQueueIndex].sensor1PH = soilPH;

  // Sensor 2 - uncomment and adapt when second sensor is added
  // sensorQueue[sensorQueueIndex].sensor2Humidity = soil2Humidity;
  // sensorQueue[sensorQueueIndex].sensor2Temperature = soil2Temperature;
  // sensorQueue[sensorQueueIndex].sensor2Conductivity = soil2Conductivity;
  // sensorQueue[sensorQueueIndex].sensor2PH = soil2PH;

  // Ambient
  sensorQueue[sensorQueueIndex].dhtTemperature = dhtTemperature;
  sensorQueue[sensorQueueIndex].dhtHumidity = dhtHumidity;

  sensorQueueIndex = (sensorQueueIndex + 1) % SENSOR_QUEUE_SIZE;
}

// Clear synced entries from detection queue
void clearSyncedEntries() {
  while (queueCount > 0) {
    int headIndex = queueHead;
    if (detectionQueue[headIndex].synced) {
      queueHead = (queueHead + 1) % MAX_DETECTION_QUEUE;
      queueCount--;
    } else {
      break;  // Stop at first unsynced entry
    }
  }
}
```

### 1.5 Sync Protocol

```cpp
// Sync all queued data to Firebase when coming back online
void syncQueuedData() {
  if (!firebaseConnected) {
    Serial.println("Firebase not connected - sync aborted");
    connectionState = CONN_OFFLINE;
    return;
  }

  Serial.printf("Starting sync: %d detections queued\n", queueCount);

  int synced = 0;
  int failed = 0;

  // Sync detections one by one
  for (int i = 0; i < queueCount && connectionState == CONN_TRANSITIONING; i++) {
    int index = (queueHead + i) % MAX_DETECTION_QUEUE;

    if (!detectionQueue[index].synced) {
      if (syncDetectionToFirebase(index)) {
        detectionQueue[index].synced = true;
        synced++;
        Serial.printf("  Synced detection %d/%d\n", synced, queueCount);
      } else {
        failed++;
        Serial.println("  Failed to sync detection - will retry later");
        // Don't break - try remaining entries
      }

      yield();  // Allow WiFi/background tasks
      delay(100);  // Don't overwhelm Firebase (rate limiting)
    }
  }

  // Sync sensor history summary
  syncSensorHistory();

  Serial.printf("Sync complete: %d synced, %d failed\n", synced, failed);

  // Clear successfully synced entries
  clearSyncedEntries();
}

// Sync single detection to Firebase
bool syncDetectionToFirebase(int queueIndex) {
  QueuedDetection& det = detectionQueue[queueIndex];

  // Create unique document ID
  String docId = String(CAMERA_DEVICE_ID) + "_offline_" + String(det.timestamp);
  String documentPath = "detection_history/" + docId;

  // Build Firebase document
  FirebaseJson json;
  json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
  json.set("fields/birdSize/integerValue", String(det.birdSize));
  json.set("fields/confidence/integerValue", String(det.confidence));
  json.set("fields/detectionZone/stringValue",
           String(det.zoneX) + "," + String(det.zoneY) + "," +
           String(det.zoneW) + "," + String(det.zoneH));
  json.set("fields/alarmTriggered/booleanValue", det.alarmTriggered);
  json.set("fields/syncedFromOffline/booleanValue", true);
  json.set("fields/offlineTimestamp/integerValue", String(det.timestamp));

  bool success = Firebase.Firestore.createDocument(
    &fbdo,
    FIREBASE_PROJECT_ID,
    "",
    documentPath.c_str(),
    json.raw()
  );

  if (!success) {
    Serial.printf("Firebase sync error: %s\n", fbdo.errorReason().c_str());
  }

  return success;
}

// Sync sensor history summary (averages during offline period)
void syncSensorHistory() {
  // Calculate averages from queued readings
  float avgS1Humidity = 0, avgS1Temp = 0, avgS1Conductivity = 0, avgS1PH = 0;
  int validReadings = 0;

  for (int i = 0; i < SENSOR_QUEUE_SIZE; i++) {
    if (sensorQueue[i].timestamp > 0) {
      avgS1Humidity += sensorQueue[i].sensor1Humidity;
      avgS1Temp += sensorQueue[i].sensor1Temperature;
      avgS1Conductivity += sensorQueue[i].sensor1Conductivity;
      avgS1PH += sensorQueue[i].sensor1PH;
      validReadings++;
    }
  }

  if (validReadings > 0) {
    avgS1Humidity /= validReadings;
    avgS1Temp /= validReadings;
    avgS1Conductivity /= validReadings;
    avgS1PH /= validReadings;

    // Log offline period summary to Firebase
    String docId = String(MAIN_DEVICE_ID) + "_offline_summary_" + String(millis());
    String path = "sensor_history/" + docId;

    FirebaseJson json;
    json.set("fields/deviceId/stringValue", MAIN_DEVICE_ID);
    json.set("fields/avgSoilHumidity/doubleValue", avgS1Humidity);
    json.set("fields/avgSoilTemperature/doubleValue", avgS1Temp);
    json.set("fields/avgSoilConductivity/doubleValue", avgS1Conductivity);
    json.set("fields/avgSoilPH/doubleValue", avgS1PH);
    json.set("fields/readingCount/integerValue", String(validReadings));
    json.set("fields/offlinePeriod/booleanValue", true);

    Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw());
  }

  // Clear sensor queue
  for (int i = 0; i < SENSOR_QUEUE_SIZE; i++) {
    sensorQueue[i].timestamp = 0;
  }
  sensorQueueIndex = 0;
}
```

### 1.6 Handle Bird Detection from Camera (Local HTTP) - CRITICAL

**THIS IS THE MOST IMPORTANT PART - THIS WORKS WITHOUT INTERNET!**

This endpoint receives detections from Camera Board via LOCAL network (works without internet):

```cpp
// In the HTTP server setup - handles detection from Camera Board
// *** THIS WORKS EVEN WHEN INTERNET IS OFFLINE! ***
// Camera and Main Board communicate via LOCAL WiFi HTTP
// They only need to be on the same WiFi network (router doesn't need internet)
server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
  [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
    Serial.println("*** BIRD DETECTION RECEIVED FROM CAMERA ***");

    // Parse JSON payload
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
      request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }

    // Extract data
    int birdSize = doc["birdSize"];
    int confidence = doc["confidence"];
    String detectionZone = doc["detectionZone"].as<String>();

    Serial.printf("Bird detected! Size: %d, Confidence: %d%%\n", birdSize, confidence);

    // *** ALWAYS TRIGGER ALARM - THIS IS LOCAL, NO INTERNET NEEDED ***
    // The alarm is a LOCAL operation - speakers, motors are all local hardware
    triggerAlarmSequence();  // Your existing alarm function

    bool alarmTriggered = true;
    Serial.println("*** ALARM TRIGGERED LOCALLY ***");

    // Log to Firebase if online, otherwise queue for later
    if (connectionState == CONN_ONLINE && firebaseConnected) {
      // Direct Firebase logging (existing code)
      String imageUrl = doc["imageUrl"].as<String>();
      logBirdDetection(imageUrl, birdSize, confidence, detectionZone);
      Serial.println("Detection logged to Firebase (online)");
    } else {
      // Queue for later sync - but alarm already triggered!
      queueDetection(birdSize, confidence, detectionZone, alarmTriggered);
      Serial.println("Detection queued for later sync (offline) - alarm already triggered!");
    }

    // Always respond to Camera Board immediately
    request->send(200, "application/json", "{\"success\":true,\"alarm\":true}");
  }
);
```

### 1.7 HTTP Endpoints for Mobile App

```cpp
// Get offline status - mobile app polls this
server.on("/offline-status", HTTP_GET, [](AsyncWebServerRequest *request) {
  String json = "{";
  json += "\"connectionState\":\"";
  json += (connectionState == CONN_ONLINE ? "online" :
           connectionState == CONN_OFFLINE ? "offline" : "syncing");
  json += "\",";
  json += "\"queuedDetections\":" + String(queueCount) + ",";
  json += "\"offlineDuration\":" + String(connectionState == CONN_OFFLINE ? (millis() - offlineSince) / 1000 : 0) + ",";
  json += "\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"firebaseConnected\":" + String(firebaseConnected ? "true" : "false") + ",";
  json += "\"userModePreference\":" + String(userModePreference) + ",";
  json += "\"localIPAddress\":\"" + WiFi.localIP().toString() + "\"";
  json += "}";

  request->send(200, "application/json", json);
});

// Set mode preference from mobile app
// mode: 0=AUTO, 1=FORCE_ONLINE, 2=FORCE_OFFLINE
server.on("/set-mode", HTTP_POST, [](AsyncWebServerRequest *request) {
  if (request->hasParam("mode", true)) {
    int mode = request->getParam("mode", true)->value().toInt();

    if (mode >= 0 && mode <= 2) {
      userModePreference = mode;
      Serial.printf("Mode preference set to: %d (%s)\n", mode,
                    mode == 0 ? "AUTO" : (mode == 1 ? "FORCE_ONLINE" : "FORCE_OFFLINE"));

      // Trigger immediate state update
      lastConnectivityCheck = 0;  // Force check on next loop

      request->send(200, "application/json", "{\"success\":true}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Invalid mode (0-2)\"}");
    }
  } else {
    request->send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
  }
});

// Force sync now (when user manually triggers)
server.on("/force-sync", HTTP_POST, [](AsyncWebServerRequest *request) {
  if (queueCount > 0) {
    if (checkInternetConnectivity() && firebaseConnected) {
      connectionState = CONN_TRANSITIONING;
      syncQueuedData();
      connectionState = CONN_ONLINE;
      request->send(200, "application/json", "{\"success\":true,\"synced\":" + String(queueCount) + "}");
    } else {
      request->send(503, "application/json", "{\"error\":\"No internet connection\"}");
    }
  } else {
    request->send(200, "application/json", "{\"success\":true,\"synced\":0,\"message\":\"Nothing to sync\"}");
  }
});
```

### 1.8 Update Main Loop

```cpp
void loop() {
  // 1. Check and update connection state (non-blocking, rate-limited)
  //    This only affects Firebase operations, NOT local alarm triggering
  updateConnectionState();

  // 2. Always handle local HTTP requests (Camera detection, mobile app)
  //    This happens automatically with AsyncWebServer
  //    *** Camera detection triggers work regardless of online/offline state ***

  // 3. Sensor reading (queue when offline)
  //    Your existing sensor reading code...
  //    Add: if (connectionState == CONN_OFFLINE) queueSensorReading();

  // 4. Firebase command polling - only when online
  if (connectionState == CONN_ONLINE && firebaseConnected) {
    checkForCommands();  // Your existing command check
  }

  // 5. Head scanning, motor control, etc. - ALWAYS runs regardless of online/offline
  //    Your existing code...
}
```

---

## Part 2: ESP32 Camera Board Implementation

### File: `arduino/BantayBot_Camera_Firebase/CameraBoard_ImageBB/CameraBoard_ImageBB.ino`

Minimal changes needed. Camera Board always sends to Main Board via LOCAL HTTP.

**The Camera Board does NOT need to know about online/offline mode - it always sends to Main Board via local HTTP, and Main Board handles the rest.**

### 2.1 Main Board Communication (ALWAYS WORKS - Local Network)

The Camera Board sends detections to Main Board via local HTTP. **This works even without internet** because it's local network communication:

```cpp
// This function sends detection to Main Board via LOCAL WiFi
// *** THIS WORKS WITHOUT INTERNET - ONLY NEEDS SAME WIFI NETWORK ***
bool notifyMainBoard(int birdSize, int confidence, String detectionZone) {
  HTTPClient http;

  // This is a LOCAL IP address on the same WiFi network
  // No internet required!
  String url = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/bird_detected";

  http.begin(url);
  http.setTimeout(5000);  // 5 second timeout
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = CAMERA_DEVICE_ID;
  doc["birdSize"] = birdSize;
  doc["confidence"] = confidence;
  doc["detectionZone"] = detectionZone;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Sending detection to Main Board (LOCAL HTTP)...");
  int httpCode = http.POST(jsonString);
  http.end();

  if (httpCode == 200) {
    Serial.println("*** Main Board notified - ALARM WILL TRIGGER! ***");
    return true;
  } else {
    Serial.printf("Failed to notify Main Board (HTTP %d)\n", httpCode);
    return false;
  }
}
```

### 2.2 Add Retry Logic for Reliability

```cpp
// Enhanced notification with retry
// Retries ensure alarm triggers even if Main Board is temporarily busy
bool notifyMainBoardWithRetry(int birdSize, int confidence, String detectionZone) {
  const int MAX_RETRIES = 3;
  const int RETRY_DELAY = 500;  // ms

  for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    Serial.printf("Notifying Main Board (attempt %d/%d)...\n", attempt, MAX_RETRIES);

    if (notifyMainBoard(birdSize, confidence, detectionZone)) {
      return true;  // Success! Main Board will trigger alarm
    }

    if (attempt < MAX_RETRIES) {
      Serial.printf("Retry in %dms...\n", RETRY_DELAY);
      delay(RETRY_DELAY);
    }
  }

  Serial.println("All retries failed - Main Board may be restarting");
  return false;
}
```

### 2.3 Detection Handler Update

```cpp
// In bird detection section - update to use retry logic
if (birdDetected) {
  Serial.println("*** BIRD DETECTED! ***");

  // Always try to notify Main Board (local network - no internet needed)
  // Main Board will trigger alarm and handle data queuing
  bool notified = notifyMainBoardWithRetry(changedPixels, confidence, detectionZone);

  if (notified) {
    Serial.println("Main Board notified - alarm will trigger!");
  } else {
    // Main Board unreachable - this shouldn't happen often
    // Could be Main Board restarting or WiFi issue
    Serial.println("WARNING: Could not notify Main Board");
    Serial.println("Check: Are both boards on same WiFi?");
  }

  // Apply detection cooldown
  lastDetectionTime = millis();
}
```

---

## Part 3: Mobile App (PWA) Implementation

### 3.1 Create Offline Mode Service

Create new file: `src/services/OfflineModeService.js`

```javascript
/**
 * Offline Mode Service for BantayBot PWA
 * Manages connection modes: AUTO, ONLINE, OFFLINE
 */

import indexedDBService from './IndexedDBService';

const MODE_PREFERENCE_KEY = 'connection_mode_preference';

// Mode constants
export const CONNECTION_MODES = {
  AUTO: 0,      // Automatically detect
  ONLINE: 1,    // Force online (try to stay connected)
  OFFLINE: 2    // Force offline (don't use internet)
};

class OfflineModeService {
  constructor() {
    this.modePreference = CONNECTION_MODES.AUTO;
    this.botStatus = {
      connectionState: 'unknown',
      queuedDetections: 0,
      offlineDuration: 0,
      wifiConnected: false,
      firebaseConnected: false,
      userModePreference: 0,
      localIPAddress: ''
    };
    this.listeners = new Set();
    this.pollInterval = null;
  }

  async initialize() {
    try {
      const savedPref = await indexedDBService.getSetting(MODE_PREFERENCE_KEY);
      if (savedPref !== null && savedPref !== undefined) {
        this.modePreference = savedPref;
      }
    } catch (error) {
      console.warn('Failed to load mode preference:', error);
    }
    return this.modePreference;
  }

  async setMode(mode, mainBoardIP, port = 81) {
    if (mode < 0 || mode > 2) {
      console.error('Invalid mode:', mode);
      return false;
    }

    this.modePreference = mode;
    await indexedDBService.saveSetting(MODE_PREFERENCE_KEY, mode);

    // Send preference to bot
    try {
      const formData = new FormData();
      formData.append('mode', String(mode));

      const response = await fetch(`http://${mainBoardIP}:${port}/set-mode`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('Mode set successfully:', mode);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.warn('Failed to send mode to bot:', error);
      // Still save locally even if bot unreachable
      this.notifyListeners();
      return false;
    }
  }

  getMode() {
    return this.modePreference;
  }

  getModeLabel(mode = this.modePreference, language = 'en') {
    const labels = {
      en: {
        [CONNECTION_MODES.AUTO]: 'Automatic',
        [CONNECTION_MODES.ONLINE]: 'Always Online',
        [CONNECTION_MODES.OFFLINE]: 'Always Offline'
      },
      tl: {
        [CONNECTION_MODES.AUTO]: 'Awtomatiko',
        [CONNECTION_MODES.ONLINE]: 'Palaging Online',
        [CONNECTION_MODES.OFFLINE]: 'Palaging Offline'
      }
    };
    return labels[language]?.[mode] || labels.en[mode];
  }

  async fetchBotStatus(mainBoardIP, port = 81) {
    try {
      const response = await fetch(
        `http://${mainBoardIP}:${port}/offline-status`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        this.botStatus = await response.json();
        this.notifyListeners();
        return this.botStatus;
      }
    } catch (error) {
      // Bot unreachable via local network
      this.botStatus = {
        ...this.botStatus,
        connectionState: 'unreachable',
        wifiConnected: false
      };
      this.notifyListeners();
    }
    return this.botStatus;
  }

  async forceSync(mainBoardIP, port = 81) {
    try {
      const response = await fetch(`http://${mainBoardIP}:${port}/force-sync`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000)  // Longer timeout for sync
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh status after sync
        await this.fetchBotStatus(mainBoardIP, port);
        return result;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  getBotStatus() {
    return this.botStatus;
  }

  // Start polling bot status
  startPolling(mainBoardIP, port = 81, intervalMs = 10000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.fetchBotStatus(mainBoardIP, port);
    }, intervalMs);
    // Fetch immediately
    this.fetchBotStatus(mainBoardIP, port);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const data = {
      mode: this.modePreference,
      botStatus: this.botStatus
    };
    this.listeners.forEach(cb => cb(data));
  }
}

export default new OfflineModeService();
```

### 3.2 Create Connection Mode Selector Component

Create new file: `src/components/ui/ConnectionModeSelector.jsx`

```jsx
import React from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

export default function ConnectionModeSelector({
  currentMode,
  onModeChange,
  disabled = false,
  language = 'en'
}) {
  const texts = {
    en: {
      title: 'Connection Mode',
      auto: 'Auto',
      autoDesc: 'Detect automatically',
      online: 'Online',
      onlineDesc: 'Always use internet',
      offline: 'Offline',
      offlineDesc: 'Local only, no cloud'
    },
    tl: {
      title: 'Connection Mode',
      auto: 'Auto',
      autoDesc: 'Awtomatikong i-detect',
      online: 'Online',
      onlineDesc: 'Palaging gumamit ng internet',
      offline: 'Offline',
      offlineDesc: 'Lokal lang, walang cloud'
    }
  };

  const t = texts[language] || texts.en;

  const modes = [
    {
      value: CONNECTION_MODES.AUTO,
      label: t.auto,
      description: t.autoDesc,
      icon: Zap,
      color: 'blue'
    },
    {
      value: CONNECTION_MODES.ONLINE,
      label: t.online,
      description: t.onlineDesc,
      icon: Wifi,
      color: 'green'
    },
    {
      value: CONNECTION_MODES.OFFLINE,
      label: t.offline,
      description: t.offlineDesc,
      icon: WifiOff,
      color: 'orange'
    }
  ];

  const colorClasses = {
    blue: {
      selected: 'border-blue-500 bg-blue-500/10',
      icon: 'text-blue-500'
    },
    green: {
      selected: 'border-green-500 bg-green-500/10',
      icon: 'text-green-500'
    },
    orange: {
      selected: 'border-orange-500 bg-orange-500/10',
      icon: 'text-orange-500'
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const isSelected = currentMode === mode.value;
          const Icon = mode.icon;
          const colors = colorClasses[mode.color];

          return (
            <button
              key={mode.value}
              onClick={() => !disabled && onModeChange(mode.value)}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${isSelected ? colors.selected : 'border-border hover:border-border/80'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon
                size={20}
                className={`mx-auto mb-1 ${isSelected ? colors.icon : 'text-muted-foreground'}`}
              />
              <div className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {mode.label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {mode.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 3.3 Create Connection Status Banner Component

Create new file: `src/components/ui/ConnectionStatusBanner.jsx`

```jsx
import React from 'react';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

export default function ConnectionStatusBanner({
  connectionState,
  queuedDetections = 0,
  offlineDuration = 0,
  userModePreference = 0,
  onRetry,
  onSync,
  syncing = false,
  language = 'en'
}) {
  const texts = {
    en: {
      online: 'Connected to cloud',
      offline: 'Offline mode - Bot still protecting',
      syncing: 'Syncing queued data...',
      unreachable: 'Cannot reach bot (check WiFi)',
      forcedOnline: 'Online mode (manual)',
      forcedOffline: 'Offline mode (manual)',
      queued: 'detections queued',
      duration: 'Offline for',
      retry: 'Retry',
      sync: 'Sync Now'
    },
    tl: {
      online: 'Nakakonekta sa cloud',
      offline: 'Offline mode - Nagbabantay pa rin',
      syncing: 'Nagsi-sync ng data...',
      unreachable: 'Hindi maabot ang bot (check WiFi)',
      forcedOnline: 'Online mode (manual)',
      forcedOffline: 'Offline mode (manual)',
      queued: 'detection na nakapila',
      duration: 'Offline sa loob ng',
      retry: 'I-retry',
      sync: 'I-sync Ngayon'
    }
  };

  const t = texts[language] || texts.en;

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const isForced = userModePreference !== CONNECTION_MODES.AUTO;

  // Syncing state
  if (connectionState === 'syncing' || syncing) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <RefreshCw size={16} className="text-yellow-500 animate-spin" />
        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
          {t.syncing}
        </span>
        {queuedDetections > 0 && (
          <span className="text-[10px] text-yellow-600/70 dark:text-yellow-400/70">
            ({queuedDetections} {t.queued})
          </span>
        )}
      </div>
    );
  }

  // Online state
  if (connectionState === 'online') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <Cloud size={16} className="text-green-500" />
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
          {isForced && userModePreference === CONNECTION_MODES.ONLINE ? t.forcedOnline : t.online}
        </span>
        {isForced && <Zap size={12} className="text-green-500" />}
      </div>
    );
  }

  // Unreachable state
  if (connectionState === 'unreachable') {
    return (
      <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t.unreachable}
            </span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Offline state
  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff size={16} className="text-orange-500" />
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            {isForced && userModePreference === CONNECTION_MODES.OFFLINE ? t.forcedOffline : t.offline}
          </span>
          {isForced && <Zap size={12} className="text-orange-500" />}
        </div>
        <div className="flex gap-2">
          {queuedDetections > 0 && onSync && (
            <button
              onClick={onSync}
              className="text-xs text-orange-500 hover:text-orange-700 dark:hover:text-orange-300 underline"
            >
              {t.sync}
            </button>
          )}
          {onRetry && userModePreference !== CONNECTION_MODES.OFFLINE && (
            <button
              onClick={onRetry}
              className="text-xs text-orange-500 hover:text-orange-700 dark:hover:text-orange-300 underline"
            >
              {t.retry}
            </button>
          )}
        </div>
      </div>
      {(queuedDetections > 0 || offlineDuration > 0) && (
        <div className="flex gap-3 mt-1 text-[10px] text-orange-600/70 dark:text-orange-400/70">
          {queuedDetections > 0 && (
            <span>{queuedDetections} {t.queued}</span>
          )}
          {offlineDuration > 0 && (
            <span>{t.duration} {formatDuration(offlineDuration)}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3.4 Update Settings Page

Add to `src/pages/Settings.jsx`:

```jsx
// Add imports at top
import OfflineModeService, { CONNECTION_MODES } from '../services/OfflineModeService';
import ConnectionStatusBanner from '../components/ui/ConnectionStatusBanner';
import ConnectionModeSelector from '../components/ui/ConnectionModeSelector';

// Add state in component
const [connectionMode, setConnectionMode] = useState(CONNECTION_MODES.AUTO);
const [botStatus, setBotStatus] = useState(null);
const [syncing, setSyncing] = useState(false);

// Add useEffect for initialization
useEffect(() => {
  // Load mode preference
  OfflineModeService.initialize().then(mode => {
    setConnectionMode(mode);
  });

  // Subscribe to status changes
  const unsubscribe = OfflineModeService.onStatusChange(({ mode, botStatus }) => {
    setConnectionMode(mode);
    setBotStatus(botStatus);
  });

  // Start polling bot status - get IP from ConfigService
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  OfflineModeService.startPolling(mainBoardIP, mainBoardPort, 10000);

  return () => {
    unsubscribe();
    OfflineModeService.stopPolling();
  };
}, []);

// Add handlers
const handleModeChange = async (mode) => {
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  setConnectionMode(mode);
  await OfflineModeService.setMode(mode, mainBoardIP, mainBoardPort);
};

const handleForceSync = async () => {
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  setSyncing(true);
  try {
    await OfflineModeService.forceSync(mainBoardIP, mainBoardPort);
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    setSyncing(false);
  }
};

const handleRetry = () => {
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  OfflineModeService.fetchBotStatus(mainBoardIP, mainBoardPort);
};

// Add in JSX (in App Preferences section):

{/* Connection Status Banner */}
{botStatus && (
  <div className="mb-4">
    <ConnectionStatusBanner
      connectionState={botStatus.connectionState}
      queuedDetections={botStatus.queuedDetections}
      offlineDuration={botStatus.offlineDuration}
      userModePreference={botStatus.userModePreference}
      onRetry={handleRetry}
      onSync={handleForceSync}
      syncing={syncing}
      language={language}
    />
  </div>
)}

{/* Connection Mode Selector */}
<div className="mb-4">
  <ConnectionModeSelector
    currentMode={connectionMode}
    onModeChange={handleModeChange}
    language={language}
  />
</div>
```

### 3.5 Update Dashboard

Add offline status indicator to `src/pages/Dashboard.jsx`:

```jsx
// Add imports
import OfflineModeService from '../services/OfflineModeService';
import ConnectionStatusBanner from '../components/ui/ConnectionStatusBanner';

// Add state
const [botStatus, setBotStatus] = useState(null);

// Add useEffect
useEffect(() => {
  const unsubscribe = OfflineModeService.onStatusChange(({ botStatus }) => {
    setBotStatus(botStatus);
  });

  // Start polling if not already started - get IP from config
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '192.168.8.100');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  OfflineModeService.startPolling(mainBoardIP, mainBoardPort, 10000);

  return () => unsubscribe();
}, []);

// Add in JSX (at top of dashboard, below header):
{botStatus && botStatus.connectionState !== 'online' && (
  <div className="mb-4">
    <ConnectionStatusBanner
      connectionState={botStatus.connectionState}
      queuedDetections={botStatus.queuedDetections}
      offlineDuration={botStatus.offlineDuration}
      userModePreference={botStatus.userModePreference}
      language={language}
    />
  </div>
)}
```

### 3.6 Export New Components

Update `src/components/ui/index.js`:

```javascript
// Add to existing exports
export { default as ConnectionModeSelector } from './ConnectionModeSelector';
export { default as ConnectionStatusBanner } from './ConnectionStatusBanner';
```

---

## Part 4: Memory Budget Summary

### Main Board (ESP32 DevKit v1)
| Component | Memory Usage |
|-----------|--------------|
| Detection Queue (20 entries x 12 bytes) | ~240 bytes |
| Sensor Queue (6 entries x 44 bytes) | ~264 bytes |
| State Variables | ~20 bytes |
| JSON Response Buffers | ~300 bytes |
| **Total New Usage** | **~824 bytes (<1KB)** |

**Remaining:** ~159KB free (very safe margin)

### Camera Board (ESP32-CAM)
| Component | Memory Usage |
|-----------|--------------|
| Retry logic variables | ~12 bytes |
| **Total New Usage** | **~12 bytes** |

**Remaining:** ~180KB free (unchanged)

---

## Part 5: Testing Checklist

### Local Communication Tests (Camera -> Main Board) - CRITICAL
- [ ] Camera detects bird -> Main Board receives notification (same WiFi, NO internet)
- [ ] Camera detects bird -> Alarm triggers IMMEDIATELY (no delay)
- [ ] Disconnect internet cable from router -> Camera still triggers Main Board
- [ ] Main Board restart -> Camera reconnects and notifications work
- [ ] Camera retry logic works when Main Board temporarily unavailable

### Offline Mode Tests (No Internet)
- [ ] Unplug internet (keep WiFi router on) -> Bot continues detecting
- [ ] Unplug internet -> Alarm triggers on detection
- [ ] Unplug internet -> Head scanning continues
- [ ] Detection queue fills to 20 -> Overflow handles correctly (drops lowest confidence)
- [ ] Sensor data queued during offline period

### Online Transition Tests
- [ ] Reconnect internet -> Sync starts automatically (AUTO mode)
- [ ] Queued detections appear in Firebase after sync
- [ ] Sensor history summary uploaded after sync
- [ ] Partial sync failure -> Remaining items stay queued

### Mobile App Tests
- [ ] Mode selector shows AUTO/ONLINE/OFFLINE options
- [ ] Selecting ONLINE mode -> Bot tries to connect
- [ ] Selecting OFFLINE mode -> Bot stops cloud sync
- [ ] Selecting AUTO mode -> Bot detects automatically
- [ ] Status banner shows correct state (online/offline/syncing)
- [ ] "Sync Now" button triggers manual sync
- [ ] Queued detection count updates in real-time
- [ ] Offline duration timer works

### Error Handling Tests
- [ ] WiFi router off -> Status shows "unreachable"
- [ ] Firebase down -> Bot queues data (doesn't crash)
- [ ] Multiple rapid mode changes -> No errors or stuck states
- [ ] Long offline period (2+ hours) -> Sync completes successfully

---

## Part 6: Implementation Order

1. **Main Board: State Machine** - Add connection states and update logic
2. **Main Board: Queue Structures** - Add detection and sensor queues
3. **Main Board: HTTP Endpoints** - Add /offline-status, /set-mode, /force-sync
4. **Main Board: Integrate with Detection** - Queue when offline, sync when online
5. **Camera Board: Retry Logic** - Add retry for Main Board notification
6. **Mobile App: OfflineModeService** - Create service file
7. **Mobile App: UI Components** - Create selector and banner components
8. **Mobile App: Settings Integration** - Add mode selector to Settings page
9. **Mobile App: Dashboard Integration** - Add status banner
10. **Testing** - Run through all test cases

---

## Critical Files Summary

| File | Changes |
|------|---------|
| `arduino/.../MainBoard_Firebase.ino` | State machine, queue, sync, HTTP endpoints |
| `arduino/.../CameraBoard_*.ino` | Retry logic for Main Board notification |
| `src/services/OfflineModeService.js` | NEW FILE - Mode management |
| `src/components/ui/ConnectionModeSelector.jsx` | NEW FILE - Mode selector UI |
| `src/components/ui/ConnectionStatusBanner.jsx` | NEW FILE - Status display |
| `src/components/ui/index.js` | Export new components |
| `src/pages/Settings.jsx` | Add mode selector and status |
| `src/pages/Dashboard.jsx` | Add status banner |

---

## Summary of Key Design Decisions

1. **Local-First Communication:** Camera ALWAYS sends to Main Board via local HTTP - works without internet
2. **Alarm Always Works:** Bird detection -> alarm trigger is 100% local, no internet dependency
3. **Automatic Detection:** AUTO mode detects internet availability every 15 seconds
4. **User Control:** Users can force ONLINE or OFFLINE mode from mobile app
5. **Queue Priority:** Higher confidence detections replace lower ones when queue full
6. **Graceful Sync:** Sync happens automatically on reconnect, with retry for failures
7. **Minimal Memory:** Under 1KB additional memory on Main Board
8. **No External Dependencies:** Removed ImageBB dependency for simpler architecture
9. **Flexible Sensors:** Code structure accommodates future sensor additions (2nd soil sensor)

---

## Adaptation Notes for Future Code Changes

When implementing this feature after adding the 2nd soil sensor:

1. **Sensor Queue Structure:** Update `QueuedSensorData` struct to include all sensor fields
2. **Variable Names:** Adapt sensor variable names to match actual code (e.g., `soil1Humidity`, `soil2Humidity`)
3. **Firebase Sync:** Update `syncSensorHistory()` to include all sensor data
4. **Queue Size:** Adjust `SENSOR_QUEUE_SIZE` if memory allows more history

The core offline/online logic remains unchanged regardless of sensor count.

---

## Key Takeaway

**The most important thing to understand:**

Camera Board -> Main Board communication is via **LOCAL WiFi HTTP**. This means:

1. As long as both are connected to the same WiFi router
2. They can communicate even if that router has NO internet
3. Bird detection and alarm triggering ALWAYS work
4. "Offline mode" only affects cloud/Firebase operations

The bot will ALWAYS protect your crops, even in a farm with no internet signal!
