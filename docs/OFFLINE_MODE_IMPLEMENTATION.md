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
| Sensor history | `sensor_history/{deviceId}_MM-DD-YYYY_HH-MM-SS-AM` | 15-min snapshots |
| Detection history | `detection_history/{cameraId}_MM-DD-YYYY_HH-MM-SS-AM` | Bird detections |
| Commands | `commands/main_001/pending/{docId}` | Pending commands (device polls & deletes) |
| Notification tokens | `notification_tokens/{docId}` | FCM tokens + user preferences |
| Notification state | `notification_state/global` | Last-sent timestamps per type |

### Push Notifications (Cloud Functions)
Push notifications are handled by **Firebase Cloud Functions** (not the ESP32):
- `onSensorDataUpdate` — Firestore trigger on `sensor_data/{deviceId}` update, checks thresholds
- `onBirdDetection` — Firestore trigger on `detection_history/{docId}` create
- ESP32 does NOT send notifications directly — it just writes to Firestore
- Cloud Functions read user preferences from `notification_tokens` and throttle via `notification_state/global`

### Current Sensor Fields (Dual RS485 Sensors)
```
soil1Humidity, soil1Temperature, soil1Conductivity, soil1PH
soil2Humidity, soil2Temperature, soil2Conductivity, soil2PH
soilHumidity, soilTemperature, soilConductivity, soilPH  (averaged)
dhtTemperature, dhtHumidity
currentTrack, volume, servoActive, headPosition, timestamp
```

### Smart Update Thresholds (sensor_data writes)
ESP32 only writes to `sensor_data/main_001` when values change beyond:
- Humidity: +/-2%
- Temperature: +/-0.5C
- Conductivity: +/-50 uS/cm
- pH: +/-0.1

History snapshots (`sensor_history`) are saved every 15 minutes regardless.

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
  -> CommandService.monitorCommandLifecycle(docRef) (60s timeout)
  -> ESP32 polls every COMMAND_CHECK_INTERVAL (500ms)
  -> ESP32 executes first pending document
  -> ESP32 deletes document after execution
```

### Current Timing Configuration (config.h)
```
FIREBASE_UPDATE_INTERVAL      30000   // 30s (unused, replaced by LATEST_UPDATE_INTERVAL)
FIREBASE_HEARTBEAT_INTERVAL   300000  // 5 min (unused)
COMMAND_CHECK_INTERVAL        500     // 500ms (responsive command polling)
SENSOR_READ_INTERVAL          10000   // 10s (read sensors locally)
LATEST_UPDATE_INTERVAL        60000   // 60s (smart update if values changed)
HISTORY_UPDATE_INTERVAL       900000  // 15 min (always save snapshot)
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
| Push Notifications | YES | Cloud Functions trigger on Firestore writes -> FCM |
| Remote Mobile Access | YES | Outside local network |
| Detection History in Cloud | YES | Firestore storage (also triggers bird notif) |
| Sensor Data in Cloud | YES | Firestore storage (also triggers threshold notifs) |
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

## Current ESP32 Gaps (What Needs Implementation)

The current `MainBoard_Firebase.ino` has **NO offline infrastructure**:

| Issue | Current Behavior | Impact |
|-------|-----------------|--------|
| WiFi blocks forever | `while (WiFi.status() != WL_CONNECTED)` in setup() | Device hangs if WiFi unavailable at boot |
| No reconnection | If WiFi drops after boot, never reconnects | Device loses all cloud functionality permanently |
| `logBirdDetection()` | Returns silently if `!firebaseConnected` | **Detection data LOST** |
| `saveSensorHistory()` | Returns silently if `!firebaseConnected` | **History data LOST** |
| `updateSensorDataSmart()` | Returns silently if `!firebaseConnected` | Latest sensor data not synced |
| No queues | No data structures for buffering | Nothing preserved during outages |
| No state machine | Uses simple `firebaseConnected` boolean | No transition handling or sync |

---

## Part 1: ESP32 Main Board Implementation

### File: `arduino/BantayBot_Main_Firebase/MainBoard_Firebase/MainBoard_Firebase.ino`

### Design Principles
1. **Reactive detection**: Detect offline state from WiFi status + Firebase write failures (zero overhead)
2. **Non-blocking reconnection**: Use `WiFi.reconnect()` with rate-limiting, never block the loop
3. **Minimal changes**: Add fallback paths to existing functions, don't rewrite working code
4. **Memory-safe**: Queue sizes chosen for ~1KB total additional RAM

---

### 1.1 Add Connection State Variables

Add these after the existing `firebaseConnected` variable (line ~50):

```cpp
// ========== OFFLINE MODE STATE ==========
enum ConnectionState { CONN_ONLINE, CONN_OFFLINE, CONN_TRANSITIONING };
ConnectionState connectionState = CONN_ONLINE;
unsigned long offlineSince = 0;

// Non-blocking WiFi reconnection
unsigned long lastReconnectAttempt = 0;
const unsigned long RECONNECT_INTERVAL = 30000;  // Try reconnect every 30s
bool wifiWasConnected = false;  // Track if we ever connected successfully

// User mode preference from mobile app
// 0 = AUTO (detect automatically), 1 = FORCE_ONLINE, 2 = FORCE_OFFLINE
int userModePreference = 0;
```

### 1.2 Add Queue Data Structures

Add after the state variables. Memory budget: ~1KB total.

```cpp
// ========== DETECTION QUEUE (Circular Buffer) ==========
struct QueuedDetection {
  unsigned long timestamp;       // millis() when detected
  int birdSize;                  // Detected bird size in pixels
  int confidence;                // Detection confidence 0-100
  char detectionZone[20];        // "x,y,w,h" string
  bool alarmTriggered;           // Was alarm triggered for this detection
};  // ~32 bytes per entry

#define MAX_DETECTION_QUEUE 10
QueuedDetection detectionQueue[MAX_DETECTION_QUEUE];
int detectionQueueHead = 0;
int detectionQueueCount = 0;

// ========== SENSOR HISTORY QUEUE ==========
struct QueuedSensorSnapshot {
  unsigned long timestamp;
  float soil1Humidity, soil1Temperature, soil1Conductivity, soil1PH;
  float soil2Humidity, soil2Temperature, soil2Conductivity, soil2PH;
};  // ~36 bytes per entry

#define MAX_SENSOR_QUEUE 6
QueuedSensorSnapshot sensorQueue[MAX_SENSOR_QUEUE];
int sensorQueueCount = 0;
```

### 1.3 Non-Blocking WiFi Reconnection

This replaces the blocking WiFi in setup() and adds reconnection in the loop.

**Change in `setup()`** — Replace the blocking WiFi connection (lines 1153-1158):

```cpp
// Connect to WiFi (non-blocking with timeout)
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
Serial.print("Connecting to WiFi");
int wifiAttempts = 0;
while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
  delay(500);
  Serial.print(".");
  wifiAttempts++;
}

if (WiFi.status() == WL_CONNECTED) {
  wifiWasConnected = true;
  Serial.println("\nWiFi connected!");
  Serial.println("IP address: " + WiFi.localIP().toString());
} else {
  Serial.println("\nWiFi connection failed - starting in OFFLINE mode");
  Serial.println("Bot will still detect birds and trigger alarms locally");
  connectionState = CONN_OFFLINE;
  offlineSince = millis();
}
```

**Also change Firebase init** — wrap NTP and Firebase init to skip if no WiFi:

```cpp
if (WiFi.status() == WL_CONNECTED) {
  // Initialize NTP time sync
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  // ... existing NTP code ...

  // Initialize Firebase
  initializeFirebase();
} else {
  Serial.println("Skipping NTP/Firebase init (no WiFi)");
}
```

**New function for reconnection in loop:**

```cpp
// Non-blocking WiFi reconnection - call in loop()
void handleWiFiReconnection() {
  // Skip if user forced offline
  if (userModePreference == 2) return;

  if (WiFi.status() == WL_CONNECTED) {
    // WiFi is connected
    if (connectionState == CONN_OFFLINE && !wifiWasConnected) {
      // First time connecting (failed at boot)
      wifiWasConnected = true;
      Serial.println("WiFi connected for first time!");
      Serial.println("IP: " + WiFi.localIP().toString());

      // Initialize NTP + Firebase now
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      initializeFirebase();
    }
    return;
  }

  // WiFi is disconnected - rate-limit reconnection attempts
  if (millis() - lastReconnectAttempt < RECONNECT_INTERVAL) return;
  lastReconnectAttempt = millis();

  Serial.println("WiFi disconnected - attempting reconnect...");
  WiFi.reconnect();  // Non-blocking, returns immediately

  // Mark as offline if not already
  if (connectionState != CONN_OFFLINE) {
    connectionState = CONN_OFFLINE;
    offlineSince = millis();
    firebaseConnected = false;
    Serial.println("Switched to OFFLINE mode - bot continues locally");
  }
}
```

### 1.4 Connection State Management

This uses Firebase write success/failure as the primary connectivity indicator (zero overhead — no extra network calls).

```cpp
// Update connection state based on WiFi + Firebase status
// Called in loop() - purely reactive, no network calls
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

  // Check if we should transition to ONLINE
  if (connectionState == CONN_OFFLINE) {
    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      // Internet is back - sync queued data
      connectionState = CONN_TRANSITIONING;
      Serial.println("Internet restored - syncing queued data...");
      syncQueuedData();
      connectionState = CONN_ONLINE;
      offlineSince = 0;
      firebaseConnected = true;
      Serial.println("Now in ONLINE mode");
    }
  }
  // Check if we should transition to OFFLINE
  else if (connectionState == CONN_ONLINE) {
    if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) {
      connectionState = CONN_OFFLINE;
      offlineSince = millis();
      firebaseConnected = false;
      Serial.println("Lost connectivity - switching to OFFLINE mode");
    }
  }
}
```

### 1.5 Queue Management Functions

```cpp
// Queue a bird detection for later sync
void queueDetection(int birdSize, int confidence, String detectionZone, bool alarmTriggered) {
  int targetIndex;

  if (detectionQueueCount < MAX_DETECTION_QUEUE) {
    targetIndex = (detectionQueueHead + detectionQueueCount) % MAX_DETECTION_QUEUE;
    detectionQueueCount++;
  } else {
    // Queue full - overwrite oldest entry
    targetIndex = detectionQueueHead;
    detectionQueueHead = (detectionQueueHead + 1) % MAX_DETECTION_QUEUE;
    Serial.println("Detection queue full - overwriting oldest");
  }

  detectionQueue[targetIndex].timestamp = millis();
  detectionQueue[targetIndex].birdSize = birdSize;
  detectionQueue[targetIndex].confidence = confidence;
  detectionQueue[targetIndex].alarmTriggered = alarmTriggered;

  // Copy detection zone string safely
  strncpy(detectionQueue[targetIndex].detectionZone,
          detectionZone.c_str(),
          sizeof(detectionQueue[targetIndex].detectionZone) - 1);
  detectionQueue[targetIndex].detectionZone[sizeof(detectionQueue[targetIndex].detectionZone) - 1] = '\0';

  Serial.printf("Detection queued [%d/%d]\n", detectionQueueCount, MAX_DETECTION_QUEUE);
}

// Queue a sensor history snapshot for later sync
void queueSensorSnapshot() {
  if (sensorQueueCount >= MAX_SENSOR_QUEUE) {
    // Shift queue - drop oldest
    for (int i = 0; i < MAX_SENSOR_QUEUE - 1; i++) {
      sensorQueue[i] = sensorQueue[i + 1];
    }
    sensorQueueCount = MAX_SENSOR_QUEUE - 1;
  }

  QueuedSensorSnapshot& snap = sensorQueue[sensorQueueCount];
  snap.timestamp = millis();
  snap.soil1Humidity = soil1Humidity;
  snap.soil1Temperature = soil1Temperature;
  snap.soil1Conductivity = soil1Conductivity;
  snap.soil1PH = soil1PH;
  snap.soil2Humidity = soil2Humidity;
  snap.soil2Temperature = soil2Temperature;
  snap.soil2Conductivity = soil2Conductivity;
  snap.soil2PH = soil2PH;

  sensorQueueCount++;
  Serial.printf("Sensor snapshot queued [%d/%d]\n", sensorQueueCount, MAX_SENSOR_QUEUE);
}
```

### 1.6 Sync Protocol (On Reconnection)

```cpp
// Sync all queued data to Firebase when coming back online
void syncQueuedData() {
  if (!Firebase.ready()) {
    Serial.println("Firebase not ready - sync aborted");
    connectionState = CONN_OFFLINE;
    return;
  }

  // Check heap before syncing (memory safety)
  if (ESP.getFreeHeap() < 20000) {
    Serial.println("Low memory - deferring sync");
    return;
  }

  // Sync queued detections
  int synced = 0;
  while (detectionQueueCount > 0) {
    QueuedDetection& det = detectionQueue[detectionQueueHead];

    String docId = String(CAMERA_DEVICE_ID) + "_offline_" + String(det.timestamp);
    String path = "detection_history/" + docId;

    FirebaseJson json;
    json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
    json.set("fields/birdSize/integerValue", String(det.birdSize));
    json.set("fields/confidence/integerValue", String(det.confidence));
    json.set("fields/detectionZone/stringValue", String(det.detectionZone));
    json.set("fields/alarmTriggered/booleanValue", det.alarmTriggered);
    json.set("fields/syncedFromOffline/booleanValue", true);
    json.set("fields/triggered/booleanValue", true);

    if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
      synced++;
      detectionQueueHead = (detectionQueueHead + 1) % MAX_DETECTION_QUEUE;
      detectionQueueCount--;
      Serial.printf("  Synced detection %d\n", synced);
    } else {
      Serial.println("  Sync failed - will retry later");
      break;  // Stop on first failure, retry next time
    }

    delay(100);  // Rate limiting between writes
    yield();
  }

  // Sync queued sensor snapshots (as averaged summary)
  if (sensorQueueCount > 0) {
    syncSensorSnapshots();
  }

  Serial.printf("Sync complete: %d detections synced, %d remaining\n",
                synced, detectionQueueCount);
}

// Sync sensor snapshots as a summary document
void syncSensorSnapshots() {
  if (sensorQueueCount == 0) return;

  // Average all queued snapshots
  float avgS1H = 0, avgS1T = 0, avgS1EC = 0, avgS1pH = 0;
  float avgS2H = 0, avgS2T = 0, avgS2EC = 0, avgS2pH = 0;

  for (int i = 0; i < sensorQueueCount; i++) {
    avgS1H += sensorQueue[i].soil1Humidity;
    avgS1T += sensorQueue[i].soil1Temperature;
    avgS1EC += sensorQueue[i].soil1Conductivity;
    avgS1pH += sensorQueue[i].soil1PH;
    avgS2H += sensorQueue[i].soil2Humidity;
    avgS2T += sensorQueue[i].soil2Temperature;
    avgS2EC += sensorQueue[i].soil2Conductivity;
    avgS2pH += sensorQueue[i].soil2PH;
  }

  int n = sensorQueueCount;
  avgS1H /= n; avgS1T /= n; avgS1EC /= n; avgS1pH /= n;
  avgS2H /= n; avgS2T /= n; avgS2EC /= n; avgS2pH /= n;

  String docId = String(MAIN_DEVICE_ID) + "_offline_" + String(millis());
  String path = "sensor_history/" + docId;

  FirebaseJson json;
  json.set("fields/deviceId/stringValue", MAIN_DEVICE_ID);
  json.set("fields/soil1Humidity/doubleValue", avgS1H);
  json.set("fields/soil1Temperature/doubleValue", avgS1T);
  json.set("fields/soil1Conductivity/doubleValue", avgS1EC);
  json.set("fields/soil1PH/doubleValue", avgS1pH);
  json.set("fields/soil2Humidity/doubleValue", avgS2H);
  json.set("fields/soil2Temperature/doubleValue", avgS2T);
  json.set("fields/soil2Conductivity/doubleValue", avgS2EC);
  json.set("fields/soil2PH/doubleValue", avgS2pH);
  json.set("fields/readingCount/integerValue", String(n));
  json.set("fields/offlinePeriod/booleanValue", true);
  json.set("fields/timestamp/stringValue", "Offline period summary");

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.printf("Sensor history synced (%d snapshots averaged)\n", n);
    sensorQueueCount = 0;  // Clear queue
  } else {
    Serial.println("Sensor history sync failed - will retry");
  }
}
```

### 1.7 Modify Existing Functions (Non-Breaking Changes)

These are **minimal edits** to existing functions to add offline fallback paths.

#### 1.7.1 Modify `logBirdDetection()` — Add queue fallback

Change the early return at the top of `logBirdDetection()` (line ~369):

```cpp
void logBirdDetection(String imageUrl, int birdSize, int confidence, String detectionZone) {
  // CHANGED: Queue instead of silently dropping
  if (!firebaseConnected || connectionState != CONN_ONLINE) {
    Serial.println("Offline - queuing detection for later sync");
    queueDetection(birdSize, confidence, detectionZone, true);
    birdsDetectedToday++;
    return;
  }

  // ... rest of existing function unchanged ...
}
```

#### 1.7.2 Modify `saveSensorHistory()` — Add queue fallback

Change the early return at the top of `saveSensorHistory()` (line ~326):

```cpp
void saveSensorHistory() {
  // CHANGED: Queue instead of silently dropping
  if (!firebaseConnected || connectionState != CONN_ONLINE) {
    Serial.println("Offline - queuing sensor snapshot");
    queueSensorSnapshot();
    return;
  }

  // ... rest of existing function unchanged ...
}
```

#### 1.7.3 Modify `/bird_detected` endpoint — Ensure queuing

The existing `/bird_detected` handler (line ~876) already calls `logBirdDetection()`, which will now queue when offline. But we should ensure the alarm **always** triggers:

```cpp
// In the /bird_detected handler, ensure alarm triggers BEFORE Firebase logging:
server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
  [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
    Serial.println("*** BIRD DETECTION RECEIVED FROM CAMERA ***");

    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
      request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }

    String imageUrl = doc["imageUrl"].as<String>();
    int birdSize = doc["birdSize"];
    int confidence = doc["confidence"];
    String detectionZone = doc["detectionZone"].as<String>();

    Serial.printf("Bird detected! Size: %d, Confidence: %d%%\n", birdSize, confidence);

    // ALWAYS trigger alarm FIRST (local hardware, no internet needed)
    triggerAlarmSequence();

    // Log to Firebase (will queue if offline - never loses data)
    logBirdDetection(imageUrl, birdSize, confidence, detectionZone);

    request->send(200, "application/json", "{\"success\":true,\"alarm\":true}");
  }
);
```

### 1.8 New HTTP Endpoints for Offline Mode

Add these in `setupHTTPEndpoints()` alongside existing endpoints:

```cpp
// Get offline status - mobile app polls this when on local network
server.on("/offline-status", HTTP_GET, [](AsyncWebServerRequest *request) {
  DynamicJsonDocument doc(256);
  doc["connectionState"] = (connectionState == CONN_ONLINE ? "online" :
                            connectionState == CONN_OFFLINE ? "offline" : "syncing");
  doc["queuedDetections"] = detectionQueueCount;
  doc["queuedSensorSnapshots"] = sensorQueueCount;
  doc["offlineDuration"] = (connectionState == CONN_OFFLINE) ?
                            (millis() - offlineSince) / 1000 : 0;
  doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["firebaseConnected"] = firebaseConnected;
  doc["userModePreference"] = userModePreference;
  doc["freeHeap"] = ESP.getFreeHeap();

  String json;
  serializeJson(doc, json);
  request->send(200, "application/json", json);
});

// Set mode preference from mobile app (0=AUTO, 1=FORCE_ONLINE, 2=FORCE_OFFLINE)
server.on("/set-mode", HTTP_GET, [](AsyncWebServerRequest *request) {
  if (request->hasParam("mode")) {
    int mode = request->getParam("mode")->value().toInt();
    if (mode >= 0 && mode <= 2) {
      userModePreference = mode;
      Serial.printf("Mode set to: %s\n",
                    mode == 0 ? "AUTO" : (mode == 1 ? "FORCE_ONLINE" : "FORCE_OFFLINE"));
      request->send(200, "application/json", "{\"success\":true}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Invalid mode (0-2)\"}");
    }
  } else {
    request->send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
  }
});

// Force sync now (user-triggered from mobile app)
server.on("/force-sync", HTTP_GET, [](AsyncWebServerRequest *request) {
  if (detectionQueueCount == 0 && sensorQueueCount == 0) {
    request->send(200, "application/json", "{\"success\":true,\"message\":\"Nothing to sync\"}");
    return;
  }
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) {
    request->send(503, "application/json", "{\"error\":\"No internet connection\"}");
    return;
  }
  connectionState = CONN_TRANSITIONING;
  syncQueuedData();
  connectionState = (WiFi.status() == WL_CONNECTED && Firebase.ready()) ? CONN_ONLINE : CONN_OFFLINE;
  request->send(200, "application/json", "{\"success\":true}");
});
```

> **Note:** Using HTTP_GET for `/set-mode` and `/force-sync` for simplicity since these are local-only endpoints called from the same WiFi network. No security concern as there's no internet exposure.

### 1.9 Update Main Loop

Add the new calls at the **beginning** of `loop()` (before existing sensor read):

```cpp
void loop() {
  unsigned long currentTime = millis();

  // === NEW: Non-blocking WiFi reconnection ===
  handleWiFiReconnection();

  // === NEW: Update connection state (reactive, zero-cost) ===
  updateConnectionState();

  // Read sensors periodically (UNCHANGED - always runs)
  static unsigned long lastSensorRead = 0;
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readRS485Sensor();
    lastSensorRead = currentTime;
    // ... existing sensor print code ...
  }

  // Update arm stepper motion (UNCHANGED - always runs)
  updateArmSteppers();

  // ... existing arm safety check ...

  // Update continuous head scanning (UNCHANGED - always runs)
  updateHeadScanning();

  // Run stepper motor (UNCHANGED)
  if (!headMovementPaused) {
    stepper.run();
  }

  // Firebase operations - CHANGED: guard with connectionState
  if (connectionState == CONN_ONLINE && firebaseConnected) {
    checkFirebaseCommands();

    if (currentTime - lastLatestUpdate >= LATEST_UPDATE_INTERVAL) {
      updateDeviceStatus();
      updateSensorDataSmart();
      lastLatestUpdate = currentTime;
    }

    if (currentTime - lastHistoryUpdate >= HISTORY_UPDATE_INTERVAL) {
      saveSensorHistory();  // Will queue if offline (via 1.7.2 change)
      lastHistoryUpdate = currentTime;
    }
  } else {
    // === NEW: Queue sensor snapshots while offline (every 15 min) ===
    if (currentTime - lastHistoryUpdate >= HISTORY_UPDATE_INTERVAL) {
      queueSensorSnapshot();
      lastHistoryUpdate = currentTime;
    }
  }

  delay(10);
}
```

---

## Part 2: ESP32 Camera Board Implementation

### File: `arduino/BantayBot_Camera_Firebase/CameraBoard_ImageBB/CameraBoard_ImageBB.ino`

### Current State
- `notifyMainBoard()` has a single attempt with 5s timeout
- If Main Board doesn't respond, detection is lost
- Camera does NOT need to know about online/offline mode (it only talks to Main Board locally)

### 2.1 Add Retry Logic

Replace the existing `notifyMainBoard()` function with a retry wrapper:

```cpp
// Original function renamed (keep as-is)
bool notifyMainBoardOnce(String imageUrl, int birdSize, int confidence) {
  // ... existing notifyMainBoard code unchanged ...
}

// New wrapper with retry
bool notifyMainBoard(String imageUrl, int birdSize, int confidence) {
  const int MAX_RETRIES = 3;
  const int RETRY_DELAY_MS = 500;

  for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    Serial.printf("Notifying Main Board (attempt %d/%d)...\n", attempt, MAX_RETRIES);

    if (notifyMainBoardOnce(imageUrl, birdSize, confidence)) {
      return true;
    }

    if (attempt < MAX_RETRIES) {
      Serial.printf("Retry in %dms...\n", RETRY_DELAY_MS);
      delay(RETRY_DELAY_MS);
    }
  }

  Serial.println("All retries failed - Main Board may be restarting");
  return false;
}
```

This is the **only change** needed on the Camera Board.

---

## Part 3: Mobile App (PWA) Implementation

### Current PWA Services Reference
- **CommandService** (`src/services/CommandService.js`) — Writes to Firestore `commands/{deviceId}/pending`, monitors lifecycle (60s timeout)
- **ConnectionManager** (`src/services/ConnectionManager.js`) — Auto-switches local/remote; `getMode()` returns `'local'`, `'remote'`, or `'none'`; monitors every 30s
- **ConfigService** (`src/services/ConfigService.js`) — localStorage config; defaults: `mainBoardIP: '172.24.26.193'`, `mainBoardPort: 81`
- **indexedDBService** (`src/services/indexedDBService.js`) — 7 object stores; `saveSetting(key, value)` / `getSetting(key)`
- **DeviceService** — Subscribes to Firestore sensor data and detection history

---

### 3.1 CommandQueueService (NEW: `src/services/CommandQueueService.js`)

Wraps `CommandService.sendCommand()` with offline detection and queuing.

```javascript
/**
 * Command Queue Service for BantayBot PWA
 * Wraps CommandService with offline detection and IndexedDB persistence.
 */

import CommandService from './CommandService';
import indexedDBService from './indexedDBService';

const QUEUE_STORAGE_KEY = 'offline_command_queue';
const MAX_ATTEMPTS = 3;
const FLUSH_DELAY_MS = 200;

// Actions where only the latest value matters (deduplication)
const DEDUP_ACTIONS = ['set_volume', 'rotate_head'];

class CommandQueueService {
  constructor() {
    this.queue = [];
    this.listeners = new Set();
    this.isFlushing = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const savedQueue = await indexedDBService.getSetting(QUEUE_STORAGE_KEY);
      if (Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        console.log(`[CommandQueue] Loaded ${this.queue.length} queued commands`);
      }
    } catch (error) {
      console.warn('[CommandQueue] Failed to load queue:', error);
    }

    window.addEventListener('online', () => {
      console.log('[CommandQueue] Browser online - flushing queue');
      this.flushQueue();
    });

    this.initialized = true;

    if (navigator.onLine && this.queue.length > 0) {
      this.flushQueue();
    }
  }

  /**
   * Send a command - directly or queue if offline.
   * @returns {{ success: boolean, queued?: boolean }}
   */
  async sendCommand(deviceId, action, params = {}) {
    if (!navigator.onLine) {
      return this.enqueue(deviceId, action, params);
    }

    try {
      const result = await CommandService.sendCommand(deviceId, action, params);
      if (result.success) return { success: true };
      return this.enqueue(deviceId, action, params);
    } catch (error) {
      console.warn('[CommandQueue] Direct send failed, queuing:', error.message);
      return this.enqueue(deviceId, action, params);
    }
  }

  enqueue(deviceId, action, params) {
    if (DEDUP_ACTIONS.includes(action)) {
      this.queue = this.queue.filter(
        cmd => !(cmd.deviceId === deviceId && cmd.action === action)
      );
    }

    this.queue.push({ deviceId, action, params, attempts: 0, queuedAt: Date.now() });
    this.persistQueue();
    this.notifyListeners();
    return { success: false, queued: true };
  }

  async flushQueue() {
    if (this.isFlushing || this.queue.length === 0 || !navigator.onLine) return;

    this.isFlushing = true;
    this.notifyListeners();
    const remaining = [];

    for (const cmd of this.queue) {
      try {
        const result = await CommandService.sendCommand(cmd.deviceId, cmd.action, cmd.params);
        if (!result.success) throw new Error('Send failed');
        console.log(`[CommandQueue] Flushed: ${cmd.action}`);
      } catch (error) {
        cmd.attempts++;
        if (cmd.attempts < MAX_ATTEMPTS) {
          remaining.push(cmd);
        } else {
          console.error(`[CommandQueue] Dropped after ${MAX_ATTEMPTS} attempts: ${cmd.action}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, FLUSH_DELAY_MS));
    }

    this.queue = remaining;
    this.persistQueue();
    this.isFlushing = false;
    this.notifyListeners();
  }

  getQueueCount() { return this.queue.length; }

  onQueueChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async persistQueue() {
    try {
      await indexedDBService.saveSetting(QUEUE_STORAGE_KEY, this.queue);
    } catch (error) {
      console.warn('[CommandQueue] Persist failed:', error);
    }
  }

  notifyListeners() {
    const data = { count: this.queue.length, isFlushing: this.isFlushing };
    this.listeners.forEach(cb => cb(data));
  }
}

export default new CommandQueueService();
```

---

### 3.2 OfflineModeService (NEW: `src/services/OfflineModeService.js`)

Manages connection mode preference and polls ESP32 for offline status when on local network.

```javascript
/**
 * Offline Mode Service for BantayBot PWA
 * Manages connection modes and polls ESP32 /offline-status
 */

import indexedDBService from './indexedDBService';
import ConnectionManager from './ConnectionManager';

const MODE_KEY = 'connection_mode_preference';

export const CONNECTION_MODES = { AUTO: 0, ONLINE: 1, OFFLINE: 2 };

class OfflineModeService {
  constructor() {
    this.mode = CONNECTION_MODES.AUTO;
    this.botStatus = null;
    this.listeners = new Set();
    this.pollInterval = null;
  }

  async initialize() {
    try {
      const saved = await indexedDBService.getSetting(MODE_KEY);
      if (saved !== null && saved !== undefined) this.mode = saved;
    } catch (e) { /* ignore */ }

    window.addEventListener('online', () => this.notifyListeners());
    window.addEventListener('offline', () => this.notifyListeners());
    return this.mode;
  }

  async setMode(mode, mainBoardIP, port = 81) {
    if (mode < 0 || mode > 2) return false;
    this.mode = mode;
    await indexedDBService.saveSetting(MODE_KEY, mode);

    // Send to ESP32 if on local network
    if (ConnectionManager.getMode() === 'local') {
      try {
        await fetch(`http://${mainBoardIP}:${port}/set-mode?mode=${mode}`, {
          signal: AbortSignal.timeout(5000)
        });
      } catch (e) {
        console.warn('[OfflineMode] Failed to send mode to ESP32:', e.message);
      }
    }

    this.notifyListeners();
    return true;
  }

  getMode() { return this.mode; }

  async fetchBotStatus(mainBoardIP, port = 81) {
    try {
      const response = await fetch(
        `http://${mainBoardIP}:${port}/offline-status`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        this.botStatus = await response.json();
        this.notifyListeners();
      }
    } catch (e) {
      this.botStatus = { connectionState: 'unreachable' };
      this.notifyListeners();
    }
    return this.botStatus;
  }

  async forceSync(mainBoardIP, port = 81) {
    const response = await fetch(`http://${mainBoardIP}:${port}/force-sync`, {
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    await this.fetchBotStatus(mainBoardIP, port);
    return result;
  }

  startPolling(mainBoardIP, port = 81, intervalMs = 15000) {
    this.stopPolling();
    if (ConnectionManager.getMode() !== 'local') return;

    this.fetchBotStatus(mainBoardIP, port);
    this.pollInterval = setInterval(() => {
      if (ConnectionManager.getMode() === 'local') {
        this.fetchBotStatus(mainBoardIP, port);
      } else {
        this.stopPolling();
      }
    }, intervalMs);
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
    this.listeners.forEach(cb => cb({
      mode: this.mode,
      botStatus: this.botStatus,
      pwaOnline: navigator.onLine
    }));
  }
}

export default new OfflineModeService();
```

---

### 3.3 ConnectionStatusBanner (NEW: `src/components/ui/ConnectionStatusBanner.jsx`)

```jsx
import React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';

export default function ConnectionStatusBanner({
  pwaOnline = true,
  botConnectionState = 'unknown',
  queuedCommands = 0,
  isSyncing = false,
  onRetry,
  language = 'en'
}) {
  const t = language === 'tl' ? {
    pwaOffline: 'Ikaw ay offline',
    botOffline: 'Bot offline - nagbabantay pa rin',
    syncing: 'Nagsi-sync ng data...',
    unreachable: 'Hindi maabot ang bot',
    queued: 'nakapila'
  } : {
    pwaOffline: 'You are offline',
    botOffline: 'Bot offline - still protecting crops',
    syncing: 'Syncing queued data...',
    unreachable: 'Cannot reach bot locally',
    queued: 'queued'
  };

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

  if (!pwaOnline) {
    return (
      <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff size={16} className="text-error" />
          <span className="text-xs text-secondary font-medium">{t.pwaOffline}</span>
        </div>
        {queuedCommands > 0 && (
          <span className="text-xs text-tertiary">{queuedCommands} {t.queued}</span>
        )}
      </div>
    );
  }

  if (botConnectionState === 'offline') {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff size={16} className="text-warning" />
          <span className="text-xs text-secondary font-medium">{t.botOffline}</span>
        </div>
        {onRetry && <button onClick={onRetry} className="text-xs text-brand underline">{language === 'tl' ? 'I-retry' : 'Retry'}</button>}
      </div>
    );
  }

  if (botConnectionState === 'unreachable') {
    return (
      <div className="bg-tertiary border border-primary rounded-lg px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="text-tertiary" />
          <span className="text-xs text-secondary font-medium">{t.unreachable}</span>
        </div>
        {onRetry && <button onClick={onRetry} className="text-xs text-brand underline">{language === 'tl' ? 'I-retry' : 'Retry'}</button>}
      </div>
    );
  }

  return null;  // Online - no banner
}
```

---

### 3.4 ConnectionModeSelector (NEW: `src/components/ui/ConnectionModeSelector.jsx`)

```jsx
import React from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

const MODES = [
  { value: CONNECTION_MODES.AUTO, label: 'Auto', icon: Zap, color: 'info' },
  { value: CONNECTION_MODES.ONLINE, label: 'Online', icon: Wifi, color: 'success' },
  { value: CONNECTION_MODES.OFFLINE, label: 'Offline', icon: WifiOff, color: 'warning' }
];

export default function ConnectionModeSelector({ currentMode, onModeChange, disabled = false }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map(({ value, label, icon: Icon, color }) => {
        const isSelected = currentMode === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onModeChange(value)}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-all
              ${isSelected ? `border-${color} bg-${color}/10` : 'surface-primary border-primary hover:bg-secondary'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon size={20} className={`mx-auto mb-1 ${isSelected ? `text-${color}` : 'text-tertiary'}`} />
            <div className={`text-xs font-medium text-center ${isSelected ? 'text-primary' : 'text-secondary'}`}>
              {label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

### 3.5 Page Integrations

#### Dashboard.jsx — Add command queuing

```jsx
// Add import
import CommandQueueService from '../services/CommandQueueService';

// In component, add state
const [queuedCommands, setQueuedCommands] = useState(0);

// In initialization useEffect
CommandQueueService.initialize();
const unsubQueue = CommandQueueService.onQueueChange(({ count }) => setQueuedCommands(count));
// Add to cleanup: unsubQueue();

// Replace CommandService calls with CommandQueueService:
const result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, 'trigger_alarm');
if (result.queued) {
  showWarning('Queued', 'Command will send when online');
}
```

#### Controls.jsx — Replace executeCommand

```jsx
// Add import
import CommandQueueService from '../services/CommandQueueService';

// In executeCommand, replace CommandService calls:
const result = await CommandQueueService.sendCommand(CONFIG.DEVICE_ID, actionName);
if (result.queued) {
  showWarning('Queued', 'Command queued - will send when online');
} else {
  showSuccess(t.success, `${commandName} ${t.successMessage}`);
}
```

#### Settings.jsx — Add Connection Mode section

```jsx
// Add imports
import OfflineModeService, { CONNECTION_MODES } from '../services/OfflineModeService';
import ConnectionModeSelector from '../components/ui/ConnectionModeSelector';

// Add state
const [connectionMode, setConnectionMode] = useState(CONNECTION_MODES.AUTO);

// In useEffect
OfflineModeService.initialize().then(mode => setConnectionMode(mode));
const mainBoardIP = ConfigService.getValue('mainBoardIP', '172.24.26.193');
OfflineModeService.startPolling(mainBoardIP, 81);
// Cleanup: OfflineModeService.stopPolling();

// Handler
const handleModeChange = async (mode) => {
  setConnectionMode(mode);
  await OfflineModeService.setMode(mode, mainBoardIP, 81);
  showSuccess('Mode Updated', 'Connection mode changed');
};

// In JSX (new section after Push Notifications):
<ConnectionModeSelector currentMode={connectionMode} onModeChange={handleModeChange} />
```

---

## Part 4: Memory Budget

### Main Board (ESP32 DevKit v1)
| Component | Size |
|-----------|------|
| Detection Queue (10 x 32 bytes) | 320 bytes |
| Sensor Queue (6 x 36 bytes) | 216 bytes |
| State variables | ~20 bytes |
| **Total New Usage** | **~556 bytes** |

Remaining: ~159KB free (safe margin).

### Camera Board (ESP32-CAM)
| Component | Size |
|-----------|------|
| Retry logic variables | ~4 bytes |
| **Total New Usage** | **~4 bytes** |

---

## Part 5: Testing Checklist

### ESP32 Offline Mode
- [ ] Boot without WiFi -> starts in OFFLINE mode, alarm works locally
- [ ] Unplug internet -> bot switches to OFFLINE, continues detecting
- [ ] Bird detection offline -> queued (check Serial output)
- [ ] Sensor history offline -> queued (check Serial output)
- [ ] Reconnect internet -> auto-syncs queued data to Firebase
- [ ] Detection queue fills to 10 -> oldest overwritten
- [ ] `/offline-status` returns correct JSON when polled
- [ ] `/set-mode?mode=2` switches to FORCE_OFFLINE
- [ ] `/force-sync` syncs queued data on demand

### Camera Board Retry
- [ ] Main Board temporarily offline -> Camera retries 3x
- [ ] Main Board comes back -> Camera successfully notifies

### PWA Command Queuing
- [ ] Airplane mode -> send commands -> queued in IndexedDB
- [ ] Go online -> commands flush automatically
- [ ] Dedup: multiple `set_volume` -> only latest flushed
- [ ] Queue persists across app close/reopen
- [ ] Controls page: offline command -> "Queued" toast

### PWA Mode Selector (Settings)
- [ ] AUTO / ONLINE / OFFLINE buttons work
- [ ] Mode persists across app restarts
- [ ] Mode sent to ESP32 when on local network

---

## Part 6: Implementation Order

1. **Main Board: State + Queues** — Add enums, structs, queue arrays (sections 1.1-1.2)
2. **Main Board: WiFi Reconnection** — Non-blocking setup + loop reconnection (section 1.3)
3. **Main Board: Connection State** — Reactive state management (section 1.4)
4. **Main Board: Queue Functions** — queueDetection, queueSensorSnapshot (section 1.5)
5. **Main Board: Sync Protocol** — syncQueuedData, syncSensorSnapshots (section 1.6)
6. **Main Board: Modify Existing** — Add fallbacks to logBirdDetection, saveSensorHistory, /bird_detected (section 1.7)
7. **Main Board: HTTP Endpoints** — /offline-status, /set-mode, /force-sync (section 1.8)
8. **Main Board: Loop Update** — Add calls to new functions (section 1.9)
9. **Camera Board: Retry** — notifyMainBoardWithRetry wrapper (section 2.1)
10. **PWA: CommandQueueService** — New service (section 3.1)
11. **PWA: OfflineModeService** — New service (section 3.2)
12. **PWA: UI Components** — Banner + Mode Selector (sections 3.3-3.4)
13. **PWA: Page Integrations** — Dashboard, Controls, Settings (section 3.5)

---

## Key Design Decisions

1. **Reactive offline detection** — Uses WiFi.status() + Firebase.ready() instead of active DNS/HTTP probes (zero network overhead)
2. **Non-blocking reconnection** — WiFi.reconnect() in loop with 30s rate-limit (never blocks detection/alarm)
3. **Non-breaking changes** — Existing functions get fallback paths, not rewrites. All current behavior preserved when online
4. **Alarm always first** — /bird_detected triggers alarm BEFORE attempting Firebase logging
5. **Graceful boot failure** — If WiFi unavailable at boot, device starts in OFFLINE mode and still operates locally
6. **Memory-safe sync** — Checks heap > 20KB before syncing, stops on first failure
7. **Circular buffer** — Detection queue overwrites oldest on overflow (guaranteed bounded memory)
8. **PWA command dedup** — Only latest value kept for slider-type commands (set_volume, rotate_head)
9. **Queue persistence** — PWA queue survives app close via IndexedDB
10. **Conditional polling** — Only polls ESP32 /offline-status when ConnectionManager reports 'local' mode
11. **Cloud Functions unaffected** — When ESP32 syncs queued data, Cloud Functions auto-fire notifications for threshold violations and bird detections
12. **Simple mode endpoint** — Uses HTTP GET with query params for /set-mode (simpler than POST body parsing on ESP32)
