# BantayBot Online/Offline Mode Implementation Guide

## Overview

This document provides a complete implementation guide for adding online/offline mode functionality to BantayBot. The feature enables the bot to continue protecting crops (bird detection, alarm triggering, head movement) even when internet connectivity is lost, while queuing data and commands for sync when connectivity returns.

**Key Goals:**
- Bot continues all protection functions without internet
- Detection events queued locally on ESP32 for later sync
- PWA commands queued in IndexedDB when Firebase is unreachable
- Non-blocking connectivity checks (no delays to detection/alarm)
- Mobile app can switch between AUTO, ONLINE, and OFFLINE modes
- Camera and Main Board maintain local communication regardless of internet
- Respects tight ESP32 memory constraints

---

## Important Notes

### Local Network vs Internet (CRITICAL)
> **CRITICAL:** Camera Board and Main Board communicate via **local HTTP** on the same WiFi network. This communication works even WITHOUT internet - they only need to be on the same local network. The "offline mode" refers to no INTERNET connection (Firebase unreachable), but local device communication still works.

### Camera-to-MainBoard Always Works
> **VERY IMPORTANT:** The Camera Board sends bird detection triggers to Main Board via LOCAL WiFi HTTP requests. This is NOT dependent on internet. As long as both devices are connected to the same WiFi router (even if that router has no internet), the Camera can trigger the Main Board to sound alarms. The alarm system is 100% local.

### No External Image Storage
> **NOTE:** Detection events are logged without images when offline. The system does not depend on external image storage for offline operation.

---

## System Architecture

### Current Hardware
| Board | Model | Free RAM | Role |
|-------|-------|----------|------|
| Main Board | ESP32 DevKit v1 | ~160KB | Dual RS485 soil sensors, motors, audio, Firebase |
| Camera Board | ESP32-CAM AI Thinker | ~180KB | Bird detection, image capture |

### Current Firebase Paths
| Collection | Path | Purpose |
|-----------|------|---------|
| Device status | `devices/main_001` | IP, last_seen, firmware |
| Sensor data (latest) | `sensor_data/main_001` | Real-time sensor readings |
| Sensor history | `sensor_history/{timestamp_id}` | 15-min snapshots |
| Detection history | `detection_history/{timestamp_id}` | Bird detections |
| Commands | `commands/main_001/pending/{docId}` | Pending commands (Firestore subcollection) |

### Current Sensor Fields (Dual RS485 Sensors)
```
soil1Humidity, soil1Temperature, soil1Conductivity, soil1PH
soil2Humidity, soil2Temperature, soil2Conductivity, soil2PH
soilHumidity, soilTemperature, soilConductivity, ph  (averaged, backward compat)
dhtTemperature, dhtHumidity
currentTrack, volume, servoActive, headPosition, timestamp
```

### Current Main Board HTTP Endpoints (Port 81)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/bird_detected` | POST | Receives detection from Camera Board |
| `/upload-image` | POST | Image upload proxy for Camera |
| `/status` | GET | Current device status + sensors |
| `/trigger-alarm` | GET | Manual alarm trigger |
| `/play?track=N` | GET | Play audio track |
| `/volume?level=N` | GET | Set volume (0-30) |
| `/move-arms` | GET | Start arm oscillation |
| `/rotate-head?angle=N` | GET | Rotate head |

### Current Command Flow (PWA to ESP32)
```
UI Component -> CommandService.sendCommand(deviceId, action, params)
  -> Firestore: commands/{deviceId}/pending/{docId}
  -> ESP32 polls every 500ms, executes, deletes document
```

### Communication Flow

```
+-------------------------------------------------------------------------+
|                        LOCAL NETWORK (WiFi)                              |
|   *** THIS ALWAYS WORKS - EVEN WITHOUT INTERNET ***                     |
|                                                                          |
|  +---------------+     Local HTTP      +---------------+                 |
|  | Camera Board  | ==================> |  Main Board   |                 |
|  |  (ESP32-CAM)  |  POST /bird_detected|  (ESP32)      |                 |
|  |               | <================== |               |                 |
|  |  Detection    |    Response 200 OK  |  ALARM!       |                 |
|  |  Runs Always  |                     |  Queue Data   |                 |
|  +---------------+                     |  Sensors      |                 |
|                                        +-------+-------+                 |
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
| Sensor Reading | YES | Main Board reads dual RS485 sensors locally |
| Data Queuing | YES | Detections stored in local memory |
| Mobile App (same WiFi) | YES | Can view status via local IP |

### What Requires Internet (Online Mode)

| Feature | Requires Internet? | Notes |
|---------|-------------------|-------|
| Firebase Sync | YES | Cloud database |
| Push Notifications | YES | FCM requires internet |
| Remote Mobile Access | YES | Outside local network |
| Detection History in Cloud | YES | Firestore storage |
| PWA Commands via Firebase | YES | Firestore commands subcollection |

### State Machine

```
+------------------+     Internet Lost       +------------------+
|                  | ----------------------> |                  |
|   CONN_ONLINE    |                         |  CONN_OFFLINE    |
|   (Firebase)     | <---------------------- |  (Local Queue)   |
|                  |     Internet Restored   |                  |
+------------------+                         +------------------+
        |              +------------------+          |
        |              | CONN_TRANSITIONING|          |
        +------------> |  (Syncing Data)  | <--------+
                       +------------------+

*** Bird detection and alarm ALWAYS work in both modes! ***

User can also FORCE either mode from mobile app:
  0 = AUTO (detect automatically)
  1 = FORCE_ONLINE
  2 = FORCE_OFFLINE
```

---

## Part 1: ESP32 Main Board Implementation

### File: `arduino/BantayBot_Main_Firebase/MainBoard_Firebase/MainBoard_Firebase.ino`

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

### 1.2 Add Detection and Sensor Queue Data Structures

Memory budget: ~1,000 bytes total for queues.

```cpp
// ========== DETECTION QUEUE ==========
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
// Uses exact field names matching current dual RS485 sensor implementation
struct QueuedSensorData {
  uint32_t timestamp;
  // Sensor 1 (RS485)
  float soil1Humidity;
  float soil1Temperature;
  float soil1Conductivity;
  float soil1PH;
  // Sensor 2 (RS485)
  float soil2Humidity;
  float soil2Temperature;
  float soil2Conductivity;
  float soil2PH;
  // Ambient (DHT)
  float dhtTemperature;
  float dhtHumidity;
};  // ~44 bytes per entry

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
      if (checkInternetConnectivity() && firebaseConnected) {
        connectionState = CONN_ONLINE;
        offlineSince = 0;
        Serial.println("User forced ONLINE mode - connected");
      } else {
        Serial.println("User wants ONLINE but internet unavailable");
      }
    }
    return;
  }

  // AUTO mode - detect automatically
  // Rate limit connectivity checks
  if (millis() - lastConnectivityCheck < CONNECTIVITY_CHECK_INTERVAL) {
    return;
  }
  lastConnectivityCheck = millis();

  bool hasInternet = checkInternetConnectivity();

  if (hasInternet && connectionState == CONN_OFFLINE) {
    connectionState = CONN_TRANSITIONING;
    Serial.println("Internet restored - starting sync...");
    syncQueuedData();
    connectionState = CONN_ONLINE;
    offlineSince = 0;
    Serial.println("Now in ONLINE mode");

  } else if (!hasInternet && connectionState == CONN_ONLINE) {
    connectionState = CONN_OFFLINE;
    offlineSince = millis();
    Serial.println("Internet lost - switching to OFFLINE mode");
    Serial.println("Bot will continue protecting - data will be queued");
  }
}
```

### 1.4 Queue Management Functions

```cpp
// Add detection to queue (circular buffer with priority replacement)
void queueDetection(int birdSize, int confidence, String detectionZone, bool alarmTriggered) {
  int targetIndex;

  if (queueCount < MAX_DETECTION_QUEUE) {
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

  detectionQueue[targetIndex].timestamp = millis();
  detectionQueue[targetIndex].birdSize = birdSize;
  detectionQueue[targetIndex].confidence = confidence;
  detectionQueue[targetIndex].synced = false;
  detectionQueue[targetIndex].alarmTriggered = alarmTriggered;

  // Parse detection zone "x,y,w,h"
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

// Queue current sensor readings using actual field names
void queueSensorReading() {
  sensorQueue[sensorQueueIndex].timestamp = millis();

  // Sensor 1 (RS485)
  sensorQueue[sensorQueueIndex].soil1Humidity = soil1Humidity;
  sensorQueue[sensorQueueIndex].soil1Temperature = soil1Temperature;
  sensorQueue[sensorQueueIndex].soil1Conductivity = soil1Conductivity;
  sensorQueue[sensorQueueIndex].soil1PH = soil1PH;

  // Sensor 2 (RS485)
  sensorQueue[sensorQueueIndex].soil2Humidity = soil2Humidity;
  sensorQueue[sensorQueueIndex].soil2Temperature = soil2Temperature;
  sensorQueue[sensorQueueIndex].soil2Conductivity = soil2Conductivity;
  sensorQueue[sensorQueueIndex].soil2PH = soil2PH;

  // Ambient (DHT)
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
      break;
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
      }

      yield();
      delay(100);  // Rate limiting
    }
  }

  syncSensorHistory();

  Serial.printf("Sync complete: %d synced, %d failed\n", synced, failed);
  clearSyncedEntries();
}

// Sync single detection to Firebase
bool syncDetectionToFirebase(int queueIndex) {
  QueuedDetection& det = detectionQueue[queueIndex];

  String docId = String(CAMERA_DEVICE_ID) + "_offline_" + String(det.timestamp);
  String documentPath = "detection_history/" + docId;

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
    &fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), json.raw()
  );

  if (!success) {
    Serial.printf("Firebase sync error: %s\n", fbdo.errorReason().c_str());
  }

  return success;
}

// Sync sensor history summary (averages during offline period)
void syncSensorHistory() {
  float avgS1Humidity = 0, avgS1Temp = 0, avgS1Conductivity = 0, avgS1PH = 0;
  float avgS2Humidity = 0, avgS2Temp = 0, avgS2Conductivity = 0, avgS2PH = 0;
  float avgDhtTemp = 0, avgDhtHumidity = 0;
  int validReadings = 0;

  for (int i = 0; i < SENSOR_QUEUE_SIZE; i++) {
    if (sensorQueue[i].timestamp > 0) {
      avgS1Humidity += sensorQueue[i].soil1Humidity;
      avgS1Temp += sensorQueue[i].soil1Temperature;
      avgS1Conductivity += sensorQueue[i].soil1Conductivity;
      avgS1PH += sensorQueue[i].soil1PH;
      avgS2Humidity += sensorQueue[i].soil2Humidity;
      avgS2Temp += sensorQueue[i].soil2Temperature;
      avgS2Conductivity += sensorQueue[i].soil2Conductivity;
      avgS2PH += sensorQueue[i].soil2PH;
      avgDhtTemp += sensorQueue[i].dhtTemperature;
      avgDhtHumidity += sensorQueue[i].dhtHumidity;
      validReadings++;
    }
  }

  if (validReadings > 0) {
    avgS1Humidity /= validReadings;
    avgS1Temp /= validReadings;
    avgS1Conductivity /= validReadings;
    avgS1PH /= validReadings;
    avgS2Humidity /= validReadings;
    avgS2Temp /= validReadings;
    avgS2Conductivity /= validReadings;
    avgS2PH /= validReadings;
    avgDhtTemp /= validReadings;
    avgDhtHumidity /= validReadings;

    String docId = String(MAIN_DEVICE_ID) + "_offline_summary_" + String(millis());
    String path = "sensor_history/" + docId;

    FirebaseJson json;
    json.set("fields/deviceId/stringValue", MAIN_DEVICE_ID);
    json.set("fields/soil1Humidity/doubleValue", avgS1Humidity);
    json.set("fields/soil1Temperature/doubleValue", avgS1Temp);
    json.set("fields/soil1Conductivity/doubleValue", avgS1Conductivity);
    json.set("fields/soil1PH/doubleValue", avgS1PH);
    json.set("fields/soil2Humidity/doubleValue", avgS2Humidity);
    json.set("fields/soil2Temperature/doubleValue", avgS2Temp);
    json.set("fields/soil2Conductivity/doubleValue", avgS2Conductivity);
    json.set("fields/soil2PH/doubleValue", avgS2PH);
    json.set("fields/dhtTemperature/doubleValue", avgDhtTemp);
    json.set("fields/dhtHumidity/doubleValue", avgDhtHumidity);
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

### 1.6 Handle Bird Detection from Camera (Local HTTP)

This endpoint receives detections from Camera Board via LOCAL network (works without internet):

```cpp
server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
  [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
    Serial.println("*** BIRD DETECTION RECEIVED FROM CAMERA ***");

    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
      request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }

    int birdSize = doc["birdSize"];
    int confidence = doc["confidence"];
    String detectionZone = doc["detectionZone"].as<String>();

    Serial.printf("Bird detected! Size: %d, Confidence: %d%%\n", birdSize, confidence);

    // ALWAYS TRIGGER ALARM - this is LOCAL hardware, no internet needed
    triggerAlarmSequence();
    bool alarmTriggered = true;
    Serial.println("*** ALARM TRIGGERED LOCALLY ***");

    // Log to Firebase if online, otherwise queue for later
    if (connectionState == CONN_ONLINE && firebaseConnected) {
      String imageUrl = doc["imageUrl"].as<String>();
      logBirdDetection(imageUrl, birdSize, confidence, detectionZone);
      Serial.println("Detection logged to Firebase (online)");
    } else {
      queueDetection(birdSize, confidence, detectionZone, alarmTriggered);
      Serial.println("Detection queued for later sync (offline) - alarm already triggered!");
    }

    request->send(200, "application/json", "{\"success\":true,\"alarm\":true}");
  }
);
```

### 1.7 New HTTP Endpoints for Offline Mode

Add these endpoints alongside existing ones:

```cpp
// Get offline status - mobile app polls this when on local network
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

      lastConnectivityCheck = 0;  // Force check on next loop

      request->send(200, "application/json", "{\"success\":true}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Invalid mode (0-2)\"}");
    }
  } else {
    request->send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
  }
});

// Force sync now (user-triggered from mobile app)
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
  //    Only affects Firebase operations, NOT local alarm triggering
  updateConnectionState();

  // 2. Local HTTP requests handled automatically by AsyncWebServer
  //    Camera detection triggers work regardless of online/offline state

  // 3. Sensor reading - queue when offline
  //    In existing sensor reading section, add:
  //    if (connectionState == CONN_OFFLINE) queueSensorReading();

  // 4. Firebase command polling - only when online
  if (connectionState == CONN_ONLINE && firebaseConnected) {
    checkForCommands();
  }

  // 5. Head scanning, motor control - ALWAYS runs regardless of mode
}
```

> **NOTE:** The existing smart update threshold system (only sending to Firebase when values change significantly) continues to work normally in ONLINE mode. The offline queue supplements this by capturing periodic snapshots when Firebase is unreachable.

---

## Part 2: ESP32 Camera Board Implementation

### File: `arduino/BantayBot_Camera_Firebase/CameraBoard_ImageBB/CameraBoard_ImageBB.ino`

Minimal changes needed. Camera Board always sends to Main Board via LOCAL HTTP. **The Camera Board does NOT need to know about online/offline mode.**

### 2.1 Main Board Communication (Always Works - Local Network)

```cpp
// Send detection to Main Board via LOCAL WiFi
// Works WITHOUT internet - only needs same WiFi network
bool notifyMainBoard(int birdSize, int confidence, String detectionZone) {
  HTTPClient http;

  String url = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/bird_detected";

  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");

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
bool notifyMainBoardWithRetry(int birdSize, int confidence, String detectionZone) {
  const int MAX_RETRIES = 3;
  const int RETRY_DELAY = 500;  // ms

  for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    Serial.printf("Notifying Main Board (attempt %d/%d)...\n", attempt, MAX_RETRIES);

    if (notifyMainBoard(birdSize, confidence, detectionZone)) {
      return true;
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
if (birdDetected) {
  Serial.println("*** BIRD DETECTED! ***");

  // Always notify Main Board (local network - no internet needed)
  bool notified = notifyMainBoardWithRetry(changedPixels, confidence, detectionZone);

  if (notified) {
    Serial.println("Main Board notified - alarm will trigger!");
  } else {
    Serial.println("WARNING: Could not notify Main Board");
    Serial.println("Check: Are both boards on same WiFi?");
  }

  lastDetectionTime = millis();
}
```

---

## Part 3: Mobile App (PWA) Implementation

### Current PWA Services Reference
- **CommandService** (`src/services/CommandService.js`) - Writes to Firestore `commands/{deviceId}/pending`
- **ConnectionManager** (`src/services/ConnectionManager.js`) - Handles local (WebSocket) vs remote (Firebase) switching; `getMode()` returns `'local'`, `'remote'`, or `'none'`
- **ConfigService** (`src/services/ConfigService.js`) - Stores `mainBoardIP`, `mainBoardPort` in localStorage; API: `ConfigService.getValue('mainBoardIP', '172.24.26.193')`
- **indexedDBService** (`src/services/indexedDBService.js`) - Has `saveSetting(key, value)` / `getSetting(key)` for persistence
- **DeviceService** - Subscribes to real-time Firestore sensor data
- **VolumeContext** - Volume commands with dedup (`clearPendingVolumeCommands`)

### Current CSS Tokens (from `src/styles/index.css`)
- Text: `text-primary`, `text-secondary`, `text-tertiary`
- Backgrounds: `surface-primary`, `bg-secondary`, `bg-tertiary`
- Status: `bg-success/10`, `bg-error/10`, `bg-warning/10`, `bg-info/10`
- Borders: `border-primary`, `border-success/30`, `border-error/30`
- Brand: `text-brand`, `bg-brand/20`
- Notifications: `showSuccess(title, msg)`, `showError(title, msg)`, `showWarning(title, msg)`, `showInfo(title, msg)` via `useNotification()` hook

### Current Dashboard Staleness Check
The Dashboard already has a 60-second freshness-based `isConnected` state:
```javascript
// In Dashboard.jsx useEffect:
const stalenessInterval = setInterval(() => {
  if (lastDataRef.current) {
    const elapsed = Date.now() - lastDataRef.current.time;
    if (elapsed > 60000) {
      setIsConnected(false);
    }
  }
}, ...);
```

---

### 3.1 CommandQueueService (NEW: `src/services/CommandQueueService.js`)

Wraps `CommandService.sendCommand()` with offline detection and queuing.

```javascript
/**
 * Command Queue Service for BantayBot PWA
 * Wraps CommandService with offline detection and queuing.
 * Uses navigator.onLine + try/catch on Firebase writes.
 * Persists queue via indexedDBService.
 */

import CommandService from './CommandService';
import indexedDBService from './indexedDBService';

const QUEUE_STORAGE_KEY = 'offline_command_queue';
const MAX_ATTEMPTS = 3;
const FLUSH_DELAY_MS = 200;

// Actions where only the latest value matters (deduplication)
const DEDUP_ACTIONS = [
  'set_volume',
  'set_brightness',
  'set_contrast',
  'set_sensitivity',
  'rotate_head'
];

class CommandQueueService {
  constructor() {
    this.queue = [];
    this.listeners = new Set();
    this.isFlushing = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Load persisted queue
    try {
      const savedQueue = await indexedDBService.getSetting(QUEUE_STORAGE_KEY);
      if (Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        console.log(`[CommandQueueService] Loaded ${this.queue.length} queued commands`);
      }
    } catch (error) {
      console.warn('[CommandQueueService] Failed to load queue:', error);
    }

    // Listen for browser coming back online
    window.addEventListener('online', () => {
      console.log('[CommandQueueService] Browser online - flushing queue');
      this.flushQueue();
    });

    this.initialized = true;

    // If online and queue has items, flush immediately
    if (navigator.onLine && this.queue.length > 0) {
      this.flushQueue();
    }
  }

  /**
   * Send a command - either directly to Firebase or queue it if offline.
   * @param {string} deviceId - Device ID (e.g., 'main_001')
   * @param {string} action - Command action (e.g., 'oscillate_arms')
   * @param {object} params - Command parameters
   * @returns {{ success: boolean, queued?: boolean, error?: string }}
   */
  async sendCommand(deviceId, action, params = {}) {
    // If browser is offline, queue immediately
    if (!navigator.onLine) {
      return this.enqueue(deviceId, action, params);
    }

    // Try sending directly via CommandService
    try {
      const result = await CommandService.sendCommand(deviceId, action, params);
      if (result.success) {
        return { success: true };
      }
      // Firebase write failed - queue it
      return this.enqueue(deviceId, action, params);
    } catch (error) {
      console.warn('[CommandQueueService] Direct send failed, queuing:', error.message);
      return this.enqueue(deviceId, action, params);
    }
  }

  /**
   * Add command to offline queue with deduplication.
   */
  enqueue(deviceId, action, params) {
    // Dedup: for certain actions, replace existing entry
    if (DEDUP_ACTIONS.includes(action)) {
      this.queue = this.queue.filter(
        cmd => !(cmd.deviceId === deviceId && cmd.action === action)
      );
    }

    this.queue.push({
      deviceId,
      action,
      params,
      attempts: 0,
      queuedAt: Date.now()
    });

    this.persistQueue();
    this.notifyListeners();

    console.log(`[CommandQueueService] Queued: ${action} (queue size: ${this.queue.length})`);
    return { success: false, queued: true };
  }

  /**
   * Flush queued commands to Firebase (sequential, with retry).
   */
  async flushQueue() {
    if (this.isFlushing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isFlushing = true;
    console.log(`[CommandQueueService] Flushing ${this.queue.length} commands...`);

    const remaining = [];

    for (const cmd of this.queue) {
      try {
        const result = await CommandService.sendCommand(cmd.deviceId, cmd.action, cmd.params);
        if (result.success) {
          console.log(`[CommandQueueService] Flushed: ${cmd.action}`);
        } else {
          throw new Error(result.error || 'Send failed');
        }
      } catch (error) {
        cmd.attempts++;
        if (cmd.attempts < MAX_ATTEMPTS) {
          remaining.push(cmd);
          console.warn(`[CommandQueueService] Retry later: ${cmd.action} (attempt ${cmd.attempts})`);
        } else {
          console.error(`[CommandQueueService] Dropped after ${MAX_ATTEMPTS} attempts: ${cmd.action}`);
        }
      }

      // Delay between commands to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, FLUSH_DELAY_MS));
    }

    this.queue = remaining;
    this.persistQueue();
    this.notifyListeners();
    this.isFlushing = false;

    console.log(`[CommandQueueService] Flush complete. Remaining: ${this.queue.length}`);
  }

  /**
   * Get current queue count.
   */
  getQueueCount() {
    return this.queue.length;
  }

  /**
   * Subscribe to queue changes.
   * @param {function} callback - Called with { count, isFlushing }
   * @returns {function} Unsubscribe function
   */
  onQueueChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** @private */
  async persistQueue() {
    try {
      await indexedDBService.saveSetting(QUEUE_STORAGE_KEY, this.queue);
    } catch (error) {
      console.warn('[CommandQueueService] Failed to persist queue:', error);
    }
  }

  /** @private */
  notifyListeners() {
    const data = { count: this.queue.length, isFlushing: this.isFlushing };
    this.listeners.forEach(cb => cb(data));
  }
}

export default new CommandQueueService();
```

---

### 3.2 OfflineModeService (NEW: `src/services/OfflineModeService.js`)

Manages the connection mode preference and polls the ESP32 for offline status when on local network.

```javascript
/**
 * Offline Mode Service for BantayBot PWA
 * Manages connection modes: AUTO, ONLINE, OFFLINE
 * Polls ESP32 /offline-status when on local network
 */

import indexedDBService from './indexedDBService';
import ConnectionManager from './ConnectionManager';

const MODE_PREFERENCE_KEY = 'connection_mode_preference';

export const CONNECTION_MODES = {
  AUTO: 0,
  ONLINE: 1,
  OFFLINE: 2
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
    this.pwaOnline = navigator.onLine;
    this.listeners = new Set();
    this.pollInterval = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.modePreference;

    try {
      const savedPref = await indexedDBService.getSetting(MODE_PREFERENCE_KEY);
      if (savedPref !== null && savedPref !== undefined) {
        this.modePreference = savedPref;
      }
    } catch (error) {
      console.warn('[OfflineModeService] Failed to load mode preference:', error);
    }

    // Track browser online/offline
    window.addEventListener('online', () => {
      this.pwaOnline = true;
      this.notifyListeners();
    });
    window.addEventListener('offline', () => {
      this.pwaOnline = false;
      this.notifyListeners();
    });

    this.initialized = true;
    return this.modePreference;
  }

  /**
   * Set connection mode and send to ESP32 (if on local network).
   * @param {number} mode - CONNECTION_MODES value (0, 1, or 2)
   * @param {string} mainBoardIP - ESP32 IP address
   * @param {number} port - ESP32 port (default 81)
   */
  async setMode(mode, mainBoardIP, port = 81) {
    if (mode < 0 || mode > 2) {
      console.error('[OfflineModeService] Invalid mode:', mode);
      return false;
    }

    this.modePreference = mode;
    await indexedDBService.saveSetting(MODE_PREFERENCE_KEY, mode);

    // Only send to ESP32 when on local network
    if (ConnectionManager.getMode() === 'local') {
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

        console.log('[OfflineModeService] Mode sent to ESP32:', mode);
      } catch (error) {
        console.warn('[OfflineModeService] Failed to send mode to ESP32:', error.message);
      }
    }

    this.notifyListeners();
    return true;
  }

  getMode() {
    return this.modePreference;
  }

  isPWAOnline() {
    return this.pwaOnline;
  }

  getBotStatus() {
    return this.botStatus;
  }

  /**
   * Fetch bot offline status from ESP32 local endpoint.
   * Only call when ConnectionManager.getMode() === 'local'.
   */
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
      this.botStatus = {
        ...this.botStatus,
        connectionState: 'unreachable',
        wifiConnected: false
      };
      this.notifyListeners();
    }
    return this.botStatus;
  }

  /**
   * Trigger manual sync on the ESP32.
   */
  async forceSync(mainBoardIP, port = 81) {
    try {
      const response = await fetch(`http://${mainBoardIP}:${port}/force-sync`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const result = await response.json();
        await this.fetchBotStatus(mainBoardIP, port);
        return result;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('[OfflineModeService] Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Start polling bot status. Only useful when on local network.
   * @param {string} mainBoardIP
   * @param {number} port
   * @param {number} intervalMs - Poll interval (default 15000ms)
   */
  startPolling(mainBoardIP, port = 81, intervalMs = 15000) {
    this.stopPolling();

    // Only poll when on local network
    if (ConnectionManager.getMode() !== 'local') {
      console.log('[OfflineModeService] Not on local network, skipping poll');
      return;
    }

    this.pollInterval = setInterval(() => {
      if (ConnectionManager.getMode() === 'local') {
        this.fetchBotStatus(mainBoardIP, port);
      } else {
        this.stopPolling();
      }
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

  /**
   * Subscribe to status changes.
   * @param {function} callback - Called with { mode, botStatus, pwaOnline }
   * @returns {function} Unsubscribe function
   */
  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** @private */
  notifyListeners() {
    const data = {
      mode: this.modePreference,
      botStatus: this.botStatus,
      pwaOnline: this.pwaOnline
    };
    this.listeners.forEach(cb => cb(data));
  }
}

export default new OfflineModeService();
```

---

### 3.3 ConnectionStatusBanner (NEW: `src/components/ui/ConnectionStatusBanner.jsx`)

Uses correct CSS tokens from the project.

```jsx
import React from 'react';
import { Cloud, CloudOff, RefreshCw, WifiOff } from 'lucide-react';

/**
 * Connection status banner states:
 * - online: hidden (no banner shown)
 * - syncing: warning banner with spinner
 * - pwa_offline: error banner (browser offline)
 * - bot_offline: warning banner (ESP32 has no internet)
 * - unreachable: tertiary banner (can't reach ESP32 locally)
 */
export default function ConnectionStatusBanner({
  pwaOnline = true,
  botConnectionState = 'unknown',
  queuedCommands = 0,
  isSyncing = false,
  onRetry,
  language = 'en'
}) {
  const texts = {
    en: {
      pwaOffline: 'You are offline',
      botOffline: 'Bot offline - still protecting crops',
      syncing: 'Syncing queued data...',
      unreachable: 'Cannot reach bot locally',
      queued: 'commands queued',
      retry: 'Retry'
    },
    tl: {
      pwaOffline: 'Ikaw ay offline',
      botOffline: 'Bot offline - nagbabantay pa rin',
      syncing: 'Nagsi-sync ng data...',
      unreachable: 'Hindi maabot ang bot',
      queued: 'command na nakapila',
      retry: 'I-retry'
    }
  };

  const t = texts[language] || texts.en;

  // Syncing state
  if (isSyncing) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <RefreshCw size={16} className="text-warning animate-spin" />
        <span className="text-xs text-secondary font-medium">{t.syncing}</span>
        {queuedCommands > 0 && (
          <span className="text-xs text-tertiary">({queuedCommands} {t.queued})</span>
        )}
      </div>
    );
  }

  // PWA offline (browser has no network)
  if (!pwaOnline) {
    return (
      <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudOff size={16} className="text-error" />
            <span className="text-xs text-secondary font-medium">{t.pwaOffline}</span>
          </div>
          {queuedCommands > 0 && (
            <span className="text-xs text-tertiary">{queuedCommands} {t.queued}</span>
          )}
        </div>
      </div>
    );
  }

  // Bot offline (ESP32 has no internet but is locally reachable)
  if (botConnectionState === 'offline') {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudOff size={16} className="text-warning" />
            <span className="text-xs text-secondary font-medium">{t.botOffline}</span>
          </div>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-brand underline">
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Unreachable (can't reach ESP32 on local network)
  if (botConnectionState === 'unreachable') {
    return (
      <div className="bg-tertiary border border-primary rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="text-tertiary" />
            <span className="text-xs text-secondary font-medium">{t.unreachable}</span>
          </div>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-brand underline">
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Online or unknown - don't show banner
  return null;
}
```

---

### 3.4 ConnectionModeSelector (NEW: `src/components/ui/ConnectionModeSelector.jsx`)

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
      offlineDesc: 'Local only'
    },
    tl: {
      title: 'Connection Mode',
      auto: 'Auto',
      autoDesc: 'Awtomatiko',
      online: 'Online',
      onlineDesc: 'Palaging internet',
      offline: 'Offline',
      offlineDesc: 'Lokal lang'
    }
  };

  const t = texts[language] || texts.en;

  const modes = [
    {
      value: CONNECTION_MODES.AUTO,
      label: t.auto,
      description: t.autoDesc,
      icon: Zap,
      activeClasses: 'border-info bg-info/10',
      iconColor: 'text-info'
    },
    {
      value: CONNECTION_MODES.ONLINE,
      label: t.online,
      description: t.onlineDesc,
      icon: Wifi,
      activeClasses: 'border-success bg-success/10',
      iconColor: 'text-success'
    },
    {
      value: CONNECTION_MODES.OFFLINE,
      label: t.offline,
      description: t.offlineDesc,
      icon: WifiOff,
      activeClasses: 'border-warning bg-warning/10',
      iconColor: 'text-warning'
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-primary">{t.title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const isSelected = currentMode === mode.value;
          const Icon = mode.icon;

          return (
            <button
              key={mode.value}
              onClick={() => !disabled && onModeChange(mode.value)}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${isSelected ? mode.activeClasses : 'surface-primary border-primary hover:bg-secondary'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon
                size={20}
                className={`mx-auto mb-1 ${isSelected ? mode.iconColor : 'text-tertiary'}`}
              />
              <div className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                {mode.label}
              </div>
              <div className="text-[10px] text-tertiary mt-0.5">
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

---

### 3.5 Dashboard Integration (`src/pages/Dashboard.jsx`)

Add offline command queuing to Dashboard quick actions.

```jsx
// Add imports at top of Dashboard.jsx
import CommandQueueService from '../services/CommandQueueService';

// Add state inside Dashboard component
const [queuedCommands, setQueuedCommands] = useState(0);
const [isSyncing, setIsSyncing] = useState(false);

// Add to the existing initServices() useEffect, after other initialization:
CommandQueueService.initialize();
const unsubscribeQueue = CommandQueueService.onQueueChange(({ count, isFlushing }) => {
  setQueuedCommands(count);
  setIsSyncing(isFlushing);
});

// Add to useEffect cleanup:
// unsubscribeQueue();

// In quick action handlers, replace CommandService with CommandQueueService:
// Before: await CommandService.sendCommand(CONFIG.DEVICE_ID, 'trigger_alarm');
// After:
const result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'trigger_alarm');
if (result.queued) {
  showWarning(
    language === 'en' ? 'Queued' : 'Nakapila',
    language === 'en' ? 'Command queued - will send when online' : 'Command nakapila - ipapadala kapag online'
  );
}

// Show ConnectionStatusBanner below header when offline or commands are queued:
// Import at top:
import ConnectionStatusBanner from '../components/ui/ConnectionStatusBanner';

// In JSX, below the header section:
{(!navigator.onLine || queuedCommands > 0) && (
  <div className="mb-3">
    <ConnectionStatusBanner
      pwaOnline={navigator.onLine}
      queuedCommands={queuedCommands}
      isSyncing={isSyncing}
      language={language}
    />
  </div>
)}
```

---

### 3.6 Controls Integration (`src/pages/Controls.jsx`)

Replace direct `CommandService` calls in `executeCommand()` with `CommandQueueService`.

```jsx
// Add import at top of Controls.jsx
import CommandQueueService from '../services/CommandQueueService';
import ConnectionStatusBanner from '../components/ui/ConnectionStatusBanner';

// Add state
const [queuedCommands, setQueuedCommands] = useState(0);

// Add useEffect for queue subscription
useEffect(() => {
  CommandQueueService.initialize();
  const unsub = CommandQueueService.onQueueChange(({ count }) => {
    setQueuedCommands(count);
  });
  return () => unsub();
}, []);

// Modify executeCommand to use CommandQueueService:
const executeCommand = async (command, confirmMsg = null, isDangerous = false) => {
  if (confirmMsg) {
    const confirmed = await confirm(t.warning || 'Warning', confirmMsg, { isDangerous });
    if (!confirmed) return;
  }

  setLoading(command, true);
  setLastCommand({ command, timestamp: new Date() });

  try {
    let result;
    switch (command) {
      case 'MOVE_ARMS':
        result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'oscillate_arms');
        break;
      case 'STOP_MOVEMENT':
        result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'stop_movement');
        break;
      case 'SOUND_ALARM':
        result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'trigger_alarm');
        break;
      case 'RESET_SYSTEM':
        result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'reset_system');
        break;
      case 'CALIBRATE_SENSORS':
        result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'calibrate_sensors');
        break;
      default:
        throw new Error('Unknown command');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (result.queued) {
      showWarning(
        language === 'en' ? 'Queued' : 'Nakapila',
        language === 'en' ? 'Command queued - will send when online' : 'Ipapadala kapag online'
      );
    } else {
      showSuccess(t.success, `${getCommandDisplayName(command)} ${t.successMessage}`);
    }
  } catch (error) {
    showError(t.failed, `${getCommandDisplayName(command)} ${t.failedMessage}`);
  } finally {
    setLoading(command, false);
  }
};

// In JSX, at the top of the page content, show banner when offline:
{(!navigator.onLine || queuedCommands > 0) && (
  <div className="mb-3">
    <ConnectionStatusBanner
      pwaOnline={navigator.onLine}
      queuedCommands={queuedCommands}
      language={language}
    />
  </div>
)}
```

---

### 3.7 Settings Integration (`src/pages/Settings.jsx`)

Add the Connection Mode selector and offline status to the Settings page, in a new "Connection Mode" section after Push Notifications.

```jsx
// Add imports at top of Settings.jsx
import OfflineModeService, { CONNECTION_MODES } from '../services/OfflineModeService';
import CommandQueueService from '../services/CommandQueueService';
import ConnectionStatusBanner from '../components/ui/ConnectionStatusBanner';
import ConnectionModeSelector from '../components/ui/ConnectionModeSelector';

// Add state inside Settings component
const [connectionMode, setConnectionMode] = useState(CONNECTION_MODES.AUTO);
const [botStatus, setBotStatus] = useState(null);
const [syncing, setSyncing] = useState(false);
const [queuedCommands, setQueuedCommands] = useState(0);

// Add useEffect for initialization
useEffect(() => {
  OfflineModeService.initialize().then(mode => {
    setConnectionMode(mode);
  });

  CommandQueueService.initialize();

  const unsubStatus = OfflineModeService.onStatusChange(({ mode, botStatus }) => {
    setConnectionMode(mode);
    setBotStatus(botStatus);
  });

  const unsubQueue = CommandQueueService.onQueueChange(({ count }) => {
    setQueuedCommands(count);
  });

  // Start polling bot status if on local network
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '172.24.26.193');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  OfflineModeService.startPolling(mainBoardIP, mainBoardPort, 15000);

  return () => {
    unsubStatus();
    unsubQueue();
    OfflineModeService.stopPolling();
  };
}, []);

// Add handlers
const handleModeChange = async (mode) => {
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '172.24.26.193');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  setConnectionMode(mode);
  const success = await OfflineModeService.setMode(mode, mainBoardIP, mainBoardPort);
  if (success) {
    showSuccess(
      language === 'en' ? 'Mode Updated' : 'Na-update ang Mode',
      language === 'en' ? 'Connection mode changed' : 'Nabago ang connection mode'
    );
  }
};

const handleSyncNow = async () => {
  setSyncing(true);
  try {
    await CommandQueueService.flushQueue();
    showSuccess(
      language === 'en' ? 'Synced' : 'Na-sync',
      language === 'en' ? 'Queued commands sent' : 'Naipadala ang mga command'
    );
  } catch (error) {
    showError(
      language === 'en' ? 'Sync Failed' : 'Hindi na-sync',
      error.message
    );
  } finally {
    setSyncing(false);
  }
};

const handleRetryBotStatus = () => {
  const mainBoardIP = ConfigService.getValue('mainBoardIP', '172.24.26.193');
  const mainBoardPort = ConfigService.getValue('mainBoardPort', 81);
  OfflineModeService.fetchBotStatus(mainBoardIP, mainBoardPort);
};

// In JSX, add a new section after Push Notifications, before App Preferences:

{/* Connection Mode Section */}
<div className="surface-primary rounded-xl p-4 sm:p-5 border-2 border-primary">
  <div className="flex items-center gap-2 mb-3">
    <Wifi size={20} className="text-brand" />
    <h2 className="text-base font-bold text-primary">
      {language === 'en' ? 'Connection Mode' : 'Connection Mode'}
    </h2>
  </div>

  {/* Status Banner */}
  {(botStatus || !navigator.onLine || queuedCommands > 0) && (
    <div className="mb-3">
      <ConnectionStatusBanner
        pwaOnline={navigator.onLine}
        botConnectionState={botStatus?.connectionState}
        queuedCommands={queuedCommands}
        isSyncing={syncing}
        onRetry={handleRetryBotStatus}
        language={language}
      />
    </div>
  )}

  {/* Mode Selector */}
  <ConnectionModeSelector
    currentMode={connectionMode}
    onModeChange={handleModeChange}
    language={language}
  />

  {/* Sync Now Button */}
  {queuedCommands > 0 && (
    <button
      onClick={handleSyncNow}
      disabled={syncing || !navigator.onLine}
      className="mt-3 w-full py-2 rounded-lg bg-brand text-white text-sm font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {syncing ? (
        <span className="flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          {language === 'en' ? 'Syncing...' : 'Nagsi-sync...'}
        </span>
      ) : (
        language === 'en'
          ? `Sync Now (${queuedCommands} queued)`
          : `I-sync Ngayon (${queuedCommands} nakapila)`
      )}
    </button>
  )}
</div>
```

---

### 3.8 UI Exports (`src/components/ui/index.js`)

Add new component exports:

```javascript
// Add to existing exports in src/components/ui/index.js
export { default as ConnectionStatusBanner } from './ConnectionStatusBanner';
export { default as ConnectionModeSelector } from './ConnectionModeSelector';
```

---

### 3.9 Initialization Flow

```
App mount
  -> Dashboard mount
    -> initServices() useEffect
      -> CommandQueueService.initialize()
        -> Loads queue from IndexedDB
        -> Attaches 'online' event listener for auto-flush
        -> If online & queue > 0, flushes immediately

  -> Settings mount (when navigated to)
    -> OfflineModeService.initialize()
      -> Loads mode preference from IndexedDB
      -> Attaches online/offline event listeners
    -> OfflineModeService.startPolling() (only if ConnectionManager.getMode() === 'local')
      -> Polls ESP32 /offline-status every 15s
    -> OfflineModeService.stopPolling() on unmount
```

---

## Integration Flow Diagram

```
User command -> CommandQueueService.sendCommand(deviceId, action, params)
  |-- navigator.onLine = true?
  |     -> CommandService.sendCommand() -> Firestore commands/{id}/pending
  |     |-- Success -> return { success: true }
  |     +-- Fail (Firebase error) -> Enqueue to IndexedDB -> return { queued: true }
  +-- navigator.onLine = false?
        -> Enqueue to IndexedDB -> return { queued: true }

Browser 'online' event -> CommandQueueService.flushQueue()
  -> For each queued command (sequential):
    -> CommandService.sendCommand()
    -> Success: remove from queue
    -> Fail: increment attempts (max 3, then drop)
    -> 200ms delay between commands

OfflineModeService (Settings page, local network only):
  -> Polls ESP32 /offline-status every 15s
  -> Updates botStatus state
  -> ConnectionStatusBanner reflects status
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

**Remaining:** ~159KB free (safe margin)

### Camera Board (ESP32-CAM)
| Component | Memory Usage |
|-----------|--------------|
| Retry logic variables | ~12 bytes |
| **Total New Usage** | **~12 bytes** |

**Remaining:** ~180KB free (unchanged)

---

## Part 5: Testing Checklist

### Offline Command Queuing (PWA)
- [ ] Airplane mode -> send commands from Controls page -> verify queued in IndexedDB
- [ ] Go back online -> commands flush to Firebase automatically
- [ ] Command dedup: queue multiple `set_volume` -> only latest flushed
- [ ] Queue persistence: queue -> close app -> reopen -> queue intact -> online -> flushes
- [ ] Controls page: offline command -> toast says "Queued"
- [ ] Dashboard quick actions: offline -> shows "Queued" warning toast

### Banner Display (PWA)
- [ ] Disconnect WiFi -> banner shows with queued count on Dashboard and Controls
- [ ] Reconnect -> banner disappears after flush
- [ ] Settings page shows bot status when on local network

### Mode Selector (Settings)
- [ ] Mode selector shows AUTO / ONLINE / OFFLINE options with correct styling
- [ ] Select OFFLINE -> ESP32 receives mode=2 via `/set-mode` (local only)
- [ ] Select ONLINE -> ESP32 receives mode=1
- [ ] Select AUTO -> ESP32 receives mode=0
- [ ] Mode persists across app restarts (IndexedDB)

### Stale Data (Dashboard)
- [ ] 60s+ no data change -> Dashboard `isConnected=false` (existing behavior preserved)

### Local Communication Tests (Camera -> Main Board)
- [ ] Camera detects bird -> Main Board receives notification (same WiFi, NO internet)
- [ ] Camera detects bird -> Alarm triggers IMMEDIATELY
- [ ] Disconnect internet from router -> Camera still triggers Main Board
- [ ] Camera retry logic works when Main Board temporarily unavailable

### Offline Mode Tests (ESP32, No Internet)
- [ ] Unplug internet (keep WiFi router on) -> Bot continues detecting
- [ ] Unplug internet -> Alarm triggers on detection
- [ ] Detection queue fills to 20 -> Overflow replaces lowest confidence
- [ ] Sensor data queued during offline period

### Online Transition Tests (ESP32)
- [ ] Reconnect internet -> Sync starts automatically (AUTO mode)
- [ ] Queued detections appear in Firebase after sync
- [ ] Sensor history summary uploaded after sync

### Build Verification
- [ ] `npx vite build` passes with no errors

---

## Part 6: Implementation Order

1. **Main Board: State Machine** - Add connection states and update logic
2. **Main Board: Queue Structures** - Add detection and sensor queues with correct field names
3. **Main Board: HTTP Endpoints** - Add `/offline-status`, `/set-mode`, `/force-sync`
4. **Main Board: Integrate with Detection** - Queue when offline, sync when online
5. **Camera Board: Retry Logic** - Add retry for Main Board notification
6. **PWA: CommandQueueService** - Create service with offline queuing and dedup
7. **PWA: OfflineModeService** - Create service with mode management and polling
8. **PWA: UI Components** - Create `ConnectionStatusBanner` and `ConnectionModeSelector`
9. **PWA: Controls Integration** - Replace `CommandService` calls with `CommandQueueService`
10. **PWA: Dashboard Integration** - Add queue state and banner
11. **PWA: Settings Integration** - Add mode selector section
12. **PWA: UI Exports** - Update `src/components/ui/index.js`
13. **Testing** - Run through all test cases

---

## Critical Files Summary

| File | Changes |
|------|---------|
| `arduino/.../MainBoard_Firebase.ino` | State machine, queue, sync, HTTP endpoints |
| `arduino/.../CameraBoard_*.ino` | Retry logic for Main Board notification |
| `src/services/CommandQueueService.js` | NEW - Offline command queuing |
| `src/services/OfflineModeService.js` | NEW - Mode management, ESP32 polling |
| `src/components/ui/ConnectionStatusBanner.jsx` | NEW - Status banner |
| `src/components/ui/ConnectionModeSelector.jsx` | NEW - Mode selector UI |
| `src/components/ui/index.js` | Export new components |
| `src/pages/Dashboard.jsx` | CommandQueueService integration, banner |
| `src/pages/Controls.jsx` | CommandQueueService in executeCommand, banner |
| `src/pages/Settings.jsx` | Mode selector section, sync button |

---

## Key Design Decisions

1. **Local-First Communication:** Camera ALWAYS sends to Main Board via local HTTP - works without internet
2. **Alarm Always Works:** Bird detection -> alarm trigger is 100% local, no internet dependency
3. **Automatic Detection:** AUTO mode detects internet availability every 15 seconds via DNS check
4. **User Control:** Users can force AUTO, ONLINE, or OFFLINE mode from Settings
5. **PWA Command Queuing:** `navigator.onLine` + Firebase write try/catch for reliable offline detection
6. **Command Deduplication:** Only the latest value kept for slider-type commands (`set_volume`, `rotate_head`, etc.)
7. **Queue Priority (ESP32):** Higher confidence detections replace lower ones when queue full
8. **Queue Persistence (PWA):** Commands survive app close/reopen via IndexedDB
9. **Graceful Sync:** ESP32 syncs automatically on reconnect; PWA flushes on browser `online` event
10. **Minimal Memory:** Under 1KB additional memory on Main Board
11. **Conditional Polling:** Only polls ESP32 `/offline-status` when `ConnectionManager.getMode() === 'local'`
12. **Existing Patterns Preserved:** Dashboard staleness check (60s), smart update thresholds, VolumeContext dedup all continue working
