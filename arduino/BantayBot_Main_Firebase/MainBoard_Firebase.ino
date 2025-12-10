/*
 * BantayBot Main Board - ESP32 with Firebase Integration
 * Refactored Architecture: Receives detection events from Camera, handles all logic and Firebase
 *
 * Features:
 * - Firebase Firestore integration (device status, sensor data, detection logging)
 * - HTTP endpoint to receive bird detections from Camera Board
 * - DFPlayer Mini audio control
 * - RS485 4-in-1 soil sensor
 * - Dual stepper arm control (direct GPIO pulses)
 * - TMC2225 stepper motor (head rotation)
 * - DHT22 temperature/humidity sensor
 * - Autonomous alarm triggering
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>
#include <DHT.h>
#include "DFRobotDFPlayerMini.h"
#include <base64.h>
#include <time.h>  // NTP time sync

// Firebase includes
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

// Configuration
#include "config.h"

// ===========================
// Hardware Objects
// ===========================
HardwareSerial dfPlayerSerial(1);  // Serial1 for DFPlayer
DFRobotDFPlayerMini dfPlayer;

DHT dht(DHT_PIN, DHT_TYPE);
AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);

AsyncWebServer server(81);  // Port 81 for main board

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

bool firebaseConnected = false;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;

// ===========================
// WiFi State Management (Offline/Online Mode)
// ===========================
enum WiFiState { WIFI_DISCONNECTED, WIFI_CONNECTING, WIFI_CONNECTED, WIFI_NO_INTERNET };
WiFiState wifiState = WIFI_DISCONNECTED;
unsigned long lastWiFiReconnectAttempt = 0;
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;    // 30 sec initial connection timeout
const unsigned long WIFI_RECONNECT_INTERVAL = 60000; // 60 sec between reconnect attempts
const unsigned long WIFI_RECONNECT_TIMEOUT = 10000;  // 10 sec per reconnect attempt
bool hasInternetAccess = false;
bool ntpSynced = false;

// ===========================
// Offline Data Queue - Memory Safe Design
// ===========================
#define MAX_SENSOR_QUEUE 10  // 10 readings max (~240 bytes total)
struct SensorReading {
    uint32_t timestamp;       // 4 bytes - Unix timestamp
    int16_t temperature;      // 2 bytes - temp * 10 (25.5°C = 255)
    int16_t humidity;         // 2 bytes - humidity * 10
    int16_t soilMoisture;     // 2 bytes - moisture * 10
    int16_t soilTemp;         // 2 bytes - soil temp * 10
    int16_t soilPH;           // 2 bytes - pH * 100 (6.5 = 650)
    int16_t soilConductivity; // 2 bytes - µS/cm
    uint8_t flags;            // 1 byte - bit 0: synced
};  // ~17 bytes per reading, padded to ~20 bytes
SensorReading sensorQueue[MAX_SENSOR_QUEUE];
uint8_t sensorQueueHead = 0;
uint8_t sensorQueueTail = 0;
uint8_t sensorQueueCount = 0;

#define MAX_DETECTION_QUEUE 10  // 10 events max (~80 bytes total)
struct DetectionEvent {
    uint32_t timestamp;       // 4 bytes
    int16_t birdSize;         // 2 bytes
    int8_t confidence;        // 1 byte (0-100)
    uint8_t flags;            // 1 byte - bit 0: synced
};  // 8 bytes per event
DetectionEvent detectionQueue[MAX_DETECTION_QUEUE];
uint8_t detectionQueueHead = 0;
uint8_t detectionQueueTail = 0;
uint8_t detectionQueueCount = 0;

// ===========================
// ImageBB Configuration (for Camera proxy)
// ===========================
const char *IMGBB_API_KEY = "3e8d9f103a965f49318d117decbedd77";
const char *IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

// Static buffer for upload (single upload at a time)
#define MAX_UPLOAD_SIZE 20480
char uploadBuffer[MAX_UPLOAD_SIZE];
size_t uploadBufferLen = 0;
bool uploadInProgress = false;

// ===========================
// System State
// ===========================
// Audio State
int currentTrack = 1;
int volumeLevel = DEFAULT_VOLUME;
bool audioPlaying = false;

// Arm Stepper State
bool armSteppersActive = false;
int armStepDirection = 1;              // 1 = up, -1 = down
int armCurrentStep1 = 0;
int armCurrentStep2 = 0;
int armSweepCount = 0;
const int ARM_HALF_SWEEP_STEPS = 400;   // ~180°
const int ARM_TARGET_SWEEPS = 6;        // 3 full cycles
const int ARM_STEP_INTERVAL_MS = 0;     // No delay for 4x faster movement
const int ARM_PULSE_DELAY_US = 100;     // Minimum stable pulse width for 4x speed
unsigned long lastArmStepUpdate = 0;

// RS485 Soil Sensor State
const byte cmd_humidity[] = {0x01,0x03,0x00,0x00,0x00,0x01,0x84,0x0A};
const byte cmd_temp[] = {0x01,0x03,0x00,0x01,0x00,0x01,0xD5,0xCA};
const byte cmd_conductivity[] = {0x01,0x03,0x00,0x02,0x00,0x01,0x25,0xCA};
const byte cmd_ph[] = {0x01,0x03,0x00,0x03,0x00,0x01,0x74,0x0A};
byte sensorValues[11];
float soilHumidity = 0.0;
float soilTemperature = 0.0;
float soilConductivity = 0.0;
float soilPH = 0.0;

// Smart Sensor Update - Last sent values for change detection
float lastSentHumidity = -999.0;
float lastSentTemperature = -999.0;
float lastSentConductivity = -999.0;
float lastSentPH = -999.0;

// Change thresholds - only update "latest" if values change beyond these
const float HUMIDITY_THRESHOLD = 2.0;       // ±2%
const float TEMPERATURE_THRESHOLD = 0.5;    // ±0.5°C
const float CONDUCTIVITY_THRESHOLD = 50.0;  // ±50 µS/cm
const float PH_THRESHOLD = 0.1;             // ±0.1

// Timing intervals for smart updates
const unsigned long LATEST_UPDATE_INTERVAL = 60000;  // 60 seconds for "latest" doc
const unsigned long HISTORY_UPDATE_INTERVAL = 900000; // 15 minutes for production
unsigned long lastLatestUpdate = 0;
unsigned long lastHistoryUpdate = 0;

// NTP Time Configuration (Philippines timezone: UTC+8)
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 8 * 3600;  // UTC+8 for Philippines
const int daylightOffset_sec = 0;     // No daylight saving in PH

// Stepper Motor State
int currentHeadPosition = 0;  // degrees
bool headMovementPaused = false;  // Pause head during arm movement
long pausedStepperTarget = 0;  // Store stepper target when paused
bool headScanningActive = false;  // Continuous head scanning mode
int headScanDirection = 1;  // 1 = right, -1 = left
const int HEAD_SCAN_MIN = 0;    // Minimum scan angle (degrees)
const int HEAD_SCAN_MAX = 360;  // Maximum scan angle (degrees) - oscillates 0→360→0

// Detection State
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;

// ===========================
// Firebase Functions
// ===========================

void tokenCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.printf("Token error: %s\n", info.error.message.c_str());
  }
}

void initializeFirebase() {
  Serial.println("🔥 Initializing Firebase...");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());

  // Configure Firebase
  fbConfig.api_key = API_KEY;
  fbConfig.host = "firestore.googleapis.com";  // Firestore host
  fbConfig.token_status_callback = tokenCallback;
  fbConfig.timeout.serverResponse = 10 * 1000;
  fbConfig.timeout.socketConnection = 10 * 1000;

  // Initialize Firebase
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // Sign up anonymously
  Serial.println("🔐 Signing up anonymously...");
  if (Firebase.signUp(&fbConfig, &auth, "", "")) {
    Serial.println("✅ Anonymous sign up successful!");
  } else {
    Serial.printf("⚠️ Sign up error: %s\n", fbConfig.signer.signupError.message.c_str());
  }

  // Wait for Firebase to be ready
  Serial.println("⏳ Waiting for Firebase...");
  int attempts = 0;
  while (!Firebase.ready() && attempts < 30) {
    Serial.print(".");
    delay(1000);
    attempts++;
  }

  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("\n✅ Firebase connected!");
    Serial.printf("📧 User ID: %s\n", auth.token.uid.c_str());
    updateDeviceStatus();
  } else {
    firebaseConnected = false;
    Serial.println("\n❌ Firebase connection failed");
  }
}

// ===========================
// WiFi Connection Management (Offline/Online Mode)
// ===========================

// Non-blocking WiFi connection with timeout
bool tryConnectWiFi(unsigned long timeout) {
    Serial.println("📶 Attempting WiFi connection...");
    wifiState = WIFI_CONNECTING;

    // Clean disconnect first to avoid stuck states
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    delay(100);
    WiFi.mode(WIFI_STA);
    delay(100);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long startTime = millis();

    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - startTime > timeout) {
            Serial.println("\n⚠️ WiFi timeout - continuing in OFFLINE MODE");
            WiFi.disconnect(true);
            wifiState = WIFI_DISCONNECTED;
            return false;
        }

        // Check for specific failure states
        wl_status_t status = WiFi.status();
        if (status == WL_CONNECT_FAILED || status == WL_NO_SSID_AVAIL) {
            Serial.printf("\n❌ WiFi failed (status: %d)\n", status);
            wifiState = WIFI_DISCONNECTED;
            return false;
        }

        delay(500);
        Serial.print(".");
    }

    Serial.println("\n✅ WiFi connected!");
    Serial.printf("📍 IP: %s, RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    wifiState = WIFI_CONNECTED;
    return true;
}

// Check if internet is available (quick HTTP test)
bool checkInternetAccess() {
    if (WiFi.status() != WL_CONNECTED) {
        hasInternetAccess = false;
        return false;
    }

    HTTPClient http;
    http.begin("http://www.google.com");
    http.setTimeout(5000);
    int httpCode = http.GET();
    http.end();

    hasInternetAccess = (httpCode > 0);

    if (hasInternetAccess) {
        Serial.println("🌐 Internet access confirmed");
        wifiState = WIFI_CONNECTED;
    } else {
        Serial.println("⚠️ No internet - local network only");
        wifiState = WIFI_NO_INTERNET;
    }

    return hasInternetAccess;
}

// NTP time sync with fallback
void syncNTP() {
    Serial.println("🕐 Syncing time with NTP server...");
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

    struct tm timeinfo;
    int retries = 0;
    while (!getLocalTime(&timeinfo) && retries < 10) {
        delay(500);
        retries++;
    }

    if (retries < 10) {
        ntpSynced = true;
        char timeStr[50];
        strftime(timeStr, sizeof(timeStr), "%m-%d-%Y %I:%M:%S %p", &timeinfo);
        Serial.printf("✅ Time synced: %s\n", timeStr);
    } else {
        ntpSynced = false;
        Serial.println("⚠️ NTP sync failed, using millis() fallback");
    }
}

// Get timestamp (NTP time if synced, else millis-based)
uint32_t getCurrentTimestamp() {
    if (ntpSynced) {
        return (uint32_t)time(nullptr);
    } else {
        // Return millis/1000 as a pseudo-timestamp (seconds since boot)
        return (uint32_t)(millis() / 1000);
    }
}

// Queue sensor reading when offline
bool queueSensorReading(float temp, float hum, float soilM, float soilT, float pH, float cond) {
    if (sensorQueueCount >= MAX_SENSOR_QUEUE) {
        // Queue full - overwrite oldest (circular buffer)
        sensorQueueTail = (sensorQueueTail + 1) % MAX_SENSOR_QUEUE;
        sensorQueueCount--;
        Serial.println("📊 Sensor queue full - dropping oldest");
    }

    SensorReading* reading = &sensorQueue[sensorQueueHead];
    reading->timestamp = getCurrentTimestamp();
    reading->temperature = (int16_t)(temp * 10);      // 25.5 -> 255
    reading->humidity = (int16_t)(hum * 10);
    reading->soilMoisture = (int16_t)(soilM * 10);
    reading->soilTemp = (int16_t)(soilT * 10);
    reading->soilPH = (int16_t)(pH * 100);            // 6.5 -> 650
    reading->soilConductivity = (int16_t)cond;
    reading->flags = 0;  // Not synced

    sensorQueueHead = (sensorQueueHead + 1) % MAX_SENSOR_QUEUE;
    sensorQueueCount++;

    Serial.printf("📊 Sensor queued (%d/%d)\n", sensorQueueCount, MAX_SENSOR_QUEUE);
    return true;
}

// Queue detection event when offline
bool queueDetectionEvent(int birdSize, int confidence) {
    if (detectionQueueCount >= MAX_DETECTION_QUEUE) {
        // Queue full - overwrite oldest
        detectionQueueTail = (detectionQueueTail + 1) % MAX_DETECTION_QUEUE;
        detectionQueueCount--;
        Serial.println("🐦 Detection queue full - dropping oldest");
    }

    DetectionEvent* event = &detectionQueue[detectionQueueHead];
    event->timestamp = getCurrentTimestamp();
    event->birdSize = (int16_t)birdSize;
    event->confidence = (int8_t)confidence;
    event->flags = 0;  // Not synced

    detectionQueueHead = (detectionQueueHead + 1) % MAX_DETECTION_QUEUE;
    detectionQueueCount++;

    Serial.printf("🐦 Detection queued (%d/%d)\n", detectionQueueCount, MAX_DETECTION_QUEUE);
    return true;
}

// Sync queued sensor data to Firebase
bool syncQueuedSensorData() {
    if (!firebaseConnected || sensorQueueCount == 0) return false;

    Serial.printf("📤 Syncing %d queued sensor readings...\n", sensorQueueCount);
    int synced = 0;

    while (sensorQueueCount > 0) {
        // Check memory before operation
        if (ESP.getFreeHeap() < 15000) {
            Serial.println("⚠️ Low memory - pausing sync");
            break;
        }

        SensorReading* reading = &sensorQueue[sensorQueueTail];

        FirebaseJson json;
        json.set("fields/deviceId/stringValue", MAIN_DEVICE_ID);
        json.set("fields/timestamp/integerValue", String((uint64_t)reading->timestamp * 1000LL));
        json.set("fields/temperature/doubleValue", reading->temperature / 10.0);
        json.set("fields/humidity/doubleValue", reading->humidity / 10.0);
        json.set("fields/soilMoisture/doubleValue", reading->soilMoisture / 10.0);
        json.set("fields/soilTemp/doubleValue", reading->soilTemp / 10.0);
        json.set("fields/soilPH/doubleValue", reading->soilPH / 100.0);
        json.set("fields/soilConductivity/doubleValue", (double)reading->soilConductivity);
        json.set("fields/queued/booleanValue", true);  // Mark as queued data

        String path = "sensor_history";
        if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
            synced++;
            sensorQueueTail = (sensorQueueTail + 1) % MAX_SENSOR_QUEUE;
            sensorQueueCount--;
        } else {
            Serial.printf("❌ Sync failed: %s\n", fbdo.errorReason().c_str());
            break;  // Stop on failure, retry next cycle
        }

        delay(100);  // Rate limit Firebase calls
    }

    Serial.printf("✅ Synced %d sensor readings, %d remaining\n", synced, sensorQueueCount);
    return synced > 0;
}

// Sync queued detection events to Firebase
bool syncQueuedDetections() {
    if (!firebaseConnected || detectionQueueCount == 0) return false;

    Serial.printf("📤 Syncing %d queued detections...\n", detectionQueueCount);
    int synced = 0;

    while (detectionQueueCount > 0) {
        if (ESP.getFreeHeap() < 15000) {
            Serial.println("⚠️ Low memory - pausing sync");
            break;
        }

        DetectionEvent* event = &detectionQueue[detectionQueueTail];

        FirebaseJson json;
        json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
        json.set("fields/timestamp/integerValue", String((uint64_t)event->timestamp * 1000LL));
        json.set("fields/birdSize/integerValue", String(event->birdSize));
        json.set("fields/confidence/integerValue", String(event->confidence));
        json.set("fields/imageUrl/stringValue", "");  // No image for queued detections
        json.set("fields/triggered/booleanValue", true);
        json.set("fields/queued/booleanValue", true);  // Mark as queued data

        String path = "detection_history";
        if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
            synced++;
            detectionQueueTail = (detectionQueueTail + 1) % MAX_DETECTION_QUEUE;
            detectionQueueCount--;
        } else {
            Serial.printf("❌ Sync failed: %s\n", fbdo.errorReason().c_str());
            break;
        }

        delay(100);
    }

    Serial.printf("✅ Synced %d detections, %d remaining\n", synced, detectionQueueCount);
    return synced > 0;
}

// Background WiFi reconnection handler (call from loop)
void handleWiFiReconnection() {
    unsigned long now = millis();

    // If connected, periodically verify connection
    if (wifiState == WIFI_CONNECTED || wifiState == WIFI_NO_INTERNET) {
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("📶 WiFi connection lost!");
            wifiState = WIFI_DISCONNECTED;
            firebaseConnected = false;
            hasInternetAccess = false;
        }
        return;
    }

    // If disconnected, try to reconnect periodically
    if (wifiState == WIFI_DISCONNECTED) {
        if (now - lastWiFiReconnectAttempt > WIFI_RECONNECT_INTERVAL) {
            lastWiFiReconnectAttempt = now;

            Serial.println("📶 Attempting WiFi reconnection...");
            if (tryConnectWiFi(WIFI_RECONNECT_TIMEOUT)) {
                // WiFi connected, check internet and reinitialize
                if (checkInternetAccess()) {
                    // Re-sync NTP if not synced
                    if (!ntpSynced) {
                        syncNTP();
                    }
                    // Re-initialize Firebase
                    initializeFirebase();

                    // Sync any queued data
                    if (firebaseConnected) {
                        syncQueuedSensorData();
                        syncQueuedDetections();
                    }
                } else {
                    Serial.println("📶 Local network only - Firebase disabled");
                }
            }
        }
    }
}

// Log memory status for debugging
void logMemoryStatus() {
    Serial.printf("💾 Memory: %d free, %d min\n",
                  ESP.getFreeHeap(), ESP.getMinFreeHeap());
}

void updateDeviceStatus() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  json.set("fields/ip_address/stringValue", WiFi.localIP().toString());
  json.set("fields/last_seen/integerValue", String(millis()));
  json.set("fields/status/stringValue", "online");
  json.set("fields/firmware_version/stringValue", "2.0.0-refactor");
  json.set("fields/heap_free/integerValue", String(ESP.getFreeHeap()));

  String path = "devices/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Device status updated");
  } else {
    Serial.println("❌ Status update failed: " + fbdo.errorReason());
  }
}

// Check if sensor values changed beyond thresholds
bool sensorValuesChanged() {
  if (abs(soilHumidity - lastSentHumidity) >= HUMIDITY_THRESHOLD) return true;
  if (abs(soilTemperature - lastSentTemperature) >= TEMPERATURE_THRESHOLD) return true;
  if (abs(soilConductivity - lastSentConductivity) >= CONDUCTIVITY_THRESHOLD) return true;
  if (abs(soilPH - lastSentPH) >= PH_THRESHOLD) return true;
  return false;
}

// Update "latest" sensor data - only if values changed
void updateSensorDataSmart() {
  if (!firebaseConnected) return;

  // Check if values changed beyond thresholds
  if (!sensorValuesChanged()) {
    Serial.println("📊 Sensor values unchanged, skipping update");
    return;
  }

  FirebaseJson json;
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);
  json.set("fields/currentTrack/integerValue", String(currentTrack));
  json.set("fields/volume/integerValue", String(volumeLevel));
  json.set("fields/servoActive/booleanValue", armSteppersActive);
  json.set("fields/headPosition/integerValue", String(currentHeadPosition));
  json.set("fields/timestamp/integerValue", String(time(nullptr) * 1000LL));

  String path = "sensor_data/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Sensor data updated (values changed)");
    // Update last sent values
    lastSentHumidity = soilHumidity;
    lastSentTemperature = soilTemperature;
    lastSentConductivity = soilConductivity;
    lastSentPH = soilPH;
  } else {
    Serial.println("❌ Sensor update failed: " + fbdo.errorReason());
  }
}

// Get formatted timestamp for document ID: main_001_MM-DD-YYYY_HH-MM-SS-AM/PM
String getFormattedTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // Fallback to millis if NTP failed
    return String(MAIN_DEVICE_ID) + "_" + String(millis());
  }

  char timestamp[40];
  // Format: MM-DD-YYYY_HH-MM-SS-AM (Firestore doesn't allow : or /)
  strftime(timestamp, sizeof(timestamp), "%m-%d-%Y_%I-%M-%S-%p", &timeinfo);

  return String(MAIN_DEVICE_ID) + "_" + String(timestamp);
}

// Get readable timestamp for storing in document field
String getReadableTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "Time not synced";
  }

  char timestamp[50];
  strftime(timestamp, sizeof(timestamp), "%B %d, %Y %I:%M:%S %p", &timeinfo);
  return String(timestamp);
}

// Save sensor history snapshot - always writes (every 15 min)
void saveSensorHistory() {
  if (!firebaseConnected) return;

  String docId = getFormattedTimestamp();
  String readableTime = getReadableTimestamp();

  Serial.printf("📜 Saving sensor history: %s\n", docId.c_str());

  FirebaseJson json;
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);
  json.set("fields/currentTrack/integerValue", String(currentTrack));
  json.set("fields/volume/integerValue", String(volumeLevel));
  json.set("fields/headPosition/integerValue", String(currentHeadPosition));
  json.set("fields/deviceId/stringValue", MAIN_DEVICE_ID);
  json.set("fields/timestamp/stringValue", readableTime);

  String path = "sensor_history/" + docId;

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.println("✅ Sensor history saved!");
  } else {
    Serial.println("❌ History save failed: " + fbdo.errorReason());
  }
}

void logBirdDetection(String imageUrl, int birdSize, int confidence, String detectionZone) {
  // Always count detection locally
  birdsDetectedToday++;

  // If offline, queue the detection for later sync
  if (!firebaseConnected || !hasInternetAccess) {
    Serial.println("📦 Offline - queuing bird detection...");
    queueDetectionEvent(birdSize, confidence);
    return;
  }

  Serial.println("📝 Logging bird detection to Firestore...");

  // Create doc ID with camera device ID and formatted timestamp (like sensor_history)
  struct tm timeinfo;
  String docId;
  String readableTime;

  if (getLocalTime(&timeinfo)) {
    char timestamp[40];
    strftime(timestamp, sizeof(timestamp), "%m-%d-%Y_%I-%M-%S-%p", &timeinfo);
    docId = String(CAMERA_DEVICE_ID) + "_" + String(timestamp);

    char readableTs[50];
    strftime(readableTs, sizeof(readableTs), "%B %d, %Y %I:%M:%S %p", &timeinfo);
    readableTime = String(readableTs);
  } else {
    // Fallback if NTP not synced
    docId = String(CAMERA_DEVICE_ID) + "_" + String(millis());
    readableTime = "Time not synced";
  }

  FirebaseJson json;
  json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
  json.set("fields/timestamp/stringValue", readableTime);
  json.set("fields/imageUrl/stringValue", imageUrl);
  json.set("fields/birdSize/integerValue", String(birdSize));
  json.set("fields/confidence/integerValue", String(confidence));
  json.set("fields/detectionZone/stringValue", detectionZone);
  json.set("fields/triggered/booleanValue", true);

  String path = "detection_history/" + docId;

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.println("✅ Detection logged to Firestore!");
  } else {
    Serial.println("❌ Failed to log detection: " + fbdo.errorReason());
    // Queue it if logging failed
    queueDetectionEvent(birdSize, confidence);
  }
}

// ===========================
// RS485 Soil Sensor Functions
// ===========================

byte readRS485(const byte* query, byte* values) {
  // Set RS485 to transmit mode
  digitalWrite(RS485_RE, HIGH);
  delay(10);

  // Send query
  Serial2.write(query, 8);
  Serial2.flush();

  // Set RS485 to receive mode
  digitalWrite(RS485_RE, LOW);
  delay(100);

  // Read response
  byte index = 0;
  unsigned long startTime = millis();
  while (Serial2.available() && index < 11) {
    values[index++] = Serial2.read();
    if (millis() - startTime > 500) break;  // Timeout
  }

  return index;
}

void readRS485Sensor() {
  // Read humidity
  if (readRS485(cmd_humidity, sensorValues) >= 7) {
    soilHumidity = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
  delay(100);

  // Read temperature
  if (readRS485(cmd_temp, sensorValues) >= 7) {
    soilTemperature = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
  delay(100);

  // Read conductivity
  if (readRS485(cmd_conductivity, sensorValues) >= 7) {
    soilConductivity = ((sensorValues[3] << 8) | sensorValues[4]);
  }
  delay(100);

  // Read pH
  if (readRS485(cmd_ph, sensorValues) >= 7) {
    soilPH = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
}

// ===========================
// Audio Functions
// ===========================

void playAudio(int track) {
  // Skip track 3 as specified
  if (track == 3) {
    Serial.println("⚠️  Track 3 is disabled, skipping");
    return;
  }

  if (track >= 1 && track <= TOTAL_TRACKS) {
    dfPlayer.play(track);
    currentTrack = track;
    audioPlaying = true;
    Serial.printf("🎵 Playing track %d\n", track);
  }
}

void stopAudio() {
  dfPlayer.pause();
  audioPlaying = false;
  Serial.println("⏸️  Audio stopped");
}

void setVolume(int level) {
  if (level >= 0 && level <= 30) {
    dfPlayer.volume(level);
    volumeLevel = level;
    Serial.printf("🔊 Volume set to %d\n", level);
  }
}

// ===========================
// Arm Stepper Functions
// ===========================

void enableArmSteppers(bool enable) {
  digitalWrite(ARM1_ENABLE_PIN, enable ? LOW : HIGH);
  digitalWrite(ARM2_ENABLE_PIN, enable ? LOW : HIGH);
}

void startArmStepperSequence() {
  armSteppersActive = true;
  armSweepCount = 0;
  armStepDirection = 1;
  armCurrentStep1 = 0;
  armCurrentStep2 = ARM_HALF_SWEEP_STEPS;
  enableArmSteppers(true);
  Serial.println("👋 Starting arm stepper sweeps (3 full cycles)");
}

void stopArmStepperSequence() {
  armSteppersActive = false;
  enableArmSteppers(false);
  Serial.println("✅ Arm stepper sequence complete");

  // Resume head movement after arms finish
  if (headMovementPaused) {
    headMovementPaused = false;
    digitalWrite(STEPPER_ENABLE_PIN, LOW);  // Enable stepper (active LOW)
    stepper.moveTo(pausedStepperTarget);  // Resume to previous target
    // Resume continuous scanning after reaching paused position
    startHeadScanning();
    Serial.println("▶️  Head movement resumed - scanning restarted");
  }
}

void updateArmSteppers() {
  // Safety check: Only update arms if they are explicitly active
  // Arms should only be active during detection sequences
  if (!armSteppersActive) {
    // Ensure arms are disabled if somehow they're not
    enableArmSteppers(false);
    return;
  }

  // Set direction for both arms (opposite directions)
  digitalWrite(ARM1_DIR_PIN, (armStepDirection == 1) ? HIGH : LOW);
  digitalWrite(ARM2_DIR_PIN, (armStepDirection == 1) ? LOW : HIGH);

  // RAPID SWEEP: Execute all steps in tight loop for fast continuous motion
  while ((armStepDirection == 1 && armCurrentStep1 < ARM_HALF_SWEEP_STEPS) ||
         (armStepDirection == -1 && armCurrentStep1 > 0)) {

    // Pulse both arms simultaneously
    digitalWrite(ARM1_STEP_PIN, HIGH);
    digitalWrite(ARM2_STEP_PIN, HIGH);
    delayMicroseconds(ARM_PULSE_DELAY_US);

    digitalWrite(ARM1_STEP_PIN, LOW);
    digitalWrite(ARM2_STEP_PIN, LOW);
    delayMicroseconds(ARM_PULSE_DELAY_US);

    // Inter-step delay - allows motors to physically move (1000 steps/sec)
    delayMicroseconds(800);

    // Increment step counters
    armCurrentStep1 += armStepDirection;
    armCurrentStep2 -= armStepDirection;
  }

  // Pause for 1 second between half-sweeps for dramatic effect
  delay(1000);

  // Reverse direction after completing half-sweep
  armStepDirection = -armStepDirection;
  armSweepCount++;

  // Stop after completing target number of sweeps
  if (armSweepCount >= ARM_TARGET_SWEEPS) {
    stopArmStepperSequence();
  }
}

// ===========================
// Stepper Motor Functions
// ===========================

void rotateHead(int targetDegrees) {
  // Enable stepper motor (active LOW)
  digitalWrite(STEPPER_ENABLE_PIN, LOW);

  long targetSteps = (long)targetDegrees * STEPS_PER_REVOLUTION / 360;
  stepper.moveTo(targetSteps);
  currentHeadPosition = targetDegrees;

  Serial.printf("🔄 Rotating head to %d degrees (%ld steps)\n", targetDegrees, targetSteps);
}

void startHeadScanning() {
  headScanningActive = true;
  digitalWrite(STEPPER_ENABLE_PIN, LOW);  // Enable stepper
  // Start scanning from current position or center
  if (stepper.distanceToGo() == 0) {
    // If head is stationary, start from center
    rotateHead(0);
    headScanDirection = 1;  // Start scanning right
  }
  Serial.println("👁️  Head scanning started");
}

void stopHeadScanning() {
  headScanningActive = false;
  Serial.println("⏸️  Head scanning stopped");
}

void updateHeadScanning() {
  if (!headScanningActive || headMovementPaused || armSteppersActive) return;
  
  // Check if head has reached target
  if (stepper.distanceToGo() == 0) {
    // Calculate next scan position
    int nextPosition = currentHeadPosition + (headScanDirection * 30);  // Move 30 degrees at a time
    
    // Reverse direction if we hit limits
    if (nextPosition >= HEAD_SCAN_MAX) {
      nextPosition = HEAD_SCAN_MAX;
      headScanDirection = -1;  // Reverse to left
    } else if (nextPosition <= HEAD_SCAN_MIN) {
      nextPosition = HEAD_SCAN_MIN;
      headScanDirection = 1;   // Reverse to right
    }
    
    // Move to next position
    rotateHead(nextPosition);
  }
}

// ===========================
// Alarm Functions
// ===========================

void triggerAlarmSequence() {
  Serial.println("🚨 TRIGGERING ALARM SEQUENCE!");

  // Pause head movement - store current target and stop stepper
  if (!headMovementPaused) {
    pausedStepperTarget = stepper.targetPosition();
    headMovementPaused = true;
    stopHeadScanning();  // Stop continuous scanning
    digitalWrite(STEPPER_ENABLE_PIN, HIGH);  // Disable stepper (active LOW)
    Serial.println("⏸️  Head movement paused");
  }

  // Play audio (random track, skip track 3)
  int track = random(1, TOTAL_TRACKS + 1);
  if (track == 3) track = 4;  // Skip track 3
  playAudio(track);

  // Start arm sweeps
  startArmStepperSequence();

  // Note: Head rotation removed - head stays paused during arm movement

  Serial.println("✅ Alarm sequence initiated");
}

// ===========================
// ImageBB Upload Functions (Camera Proxy)
// ===========================

String urlEncode(String str) {
  String encoded = "";
  char c;

  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == '+') {
      encoded += "%2B";
    } else if (c == '/') {
      encoded += "%2F";
    } else if (c == '=') {
      encoded += "%3D";
    } else {
      encoded += c;
    }
  }
  return encoded;
}

String uploadToImageBB(String base64Image) {
  Serial.println("📤 Uploading to ImageBB via HTTPS...");
  Serial.printf("📊 Base64 size: %d bytes\n", base64Image.length());

  // URL encode the base64 string
  String encodedImage = urlEncode(base64Image);
  Serial.printf("📊 Encoded size: %d bytes\n", encodedImage.length());

  // Prepare HTTPS client
  WiFiClientSecure client;
  client.setInsecure();  // Skip certificate verification

  HTTPClient http;
  http.begin(client, IMGBB_UPLOAD_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  http.setTimeout(20000);  // 20 second timeout

  // Build POST data
  String postData = "key=" + String(IMGBB_API_KEY) + "&image=" + encodedImage;
  Serial.printf("📡 POST data size: %d bytes\n", postData.length());

  // Send POST request
  Serial.println("🌐 Sending to ImageBB...");
  int httpResponseCode = http.POST(postData);
  Serial.printf("📊 Response code: %d\n", httpResponseCode);

  String imageUrl = "";

  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("📥 ImageBB response received");

    // Parse JSON response
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      if (doc["success"].as<bool>()) {
        imageUrl = doc["data"]["url"].as<String>();
        Serial.println("✅ ImageBB upload successful!");
        Serial.println("🔗 Image URL: " + imageUrl);
      } else {
        Serial.println("❌ ImageBB API error");
        if (doc.containsKey("error")) {
          String errorMsg = doc["error"]["message"].as<String>();
          Serial.println("Error: " + errorMsg);
        }
      }
    } else {
      Serial.println("❌ JSON parsing failed");
    }
  } else {
    Serial.printf("❌ ImageBB upload failed: %d\n", httpResponseCode);
  }

  http.end();
  return imageUrl;
}

// ===========================
// HTTP Endpoints
// ===========================

void setupHTTPEndpoints() {
  // Bird detection endpoint - receives notifications from camera
  server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println("📡 Received bird detection from camera!");

      // Parse JSON payload
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.println("❌ JSON parsing failed");
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
      }

      // Extract data
      String deviceId = doc["deviceId"].as<String>();
      String imageUrl = doc["imageUrl"].as<String>();
      int birdSize = doc["birdSize"];
      int confidence = doc["confidence"];
      String detectionZone = doc["detectionZone"].as<String>();

      Serial.printf("🐦 Detection: Size=%d, Confidence=%d%%\n", birdSize, confidence);
      Serial.println("🔗 Image URL: " + imageUrl);

      // Log to Firestore
      logBirdDetection(imageUrl, birdSize, confidence, detectionZone);

      // Trigger alarm
      triggerAlarmSequence();

      // Respond to camera
      request->send(200, "application/json", "{\"status\":\"ok\",\"action\":\"alarm_triggered\"}");
    }
  );

  // Image upload proxy endpoint - receives images from camera and uploads to ImageBB
  server.on("/upload-image", HTTP_POST,
    [](AsyncWebServerRequest *request) {
      // This shouldn't be called if body handler works
      request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Body handler not triggered\"}");
    },
    NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      // Check if upload already in progress
      if (index == 0) {
        if (uploadInProgress) {
          Serial.println("⚠️ Upload already in progress, rejecting");
          request->send(503, "application/json", "{\"status\":\"error\",\"message\":\"Server busy\"}");
          return;
        }

        // Check size limit
        if (total > MAX_UPLOAD_SIZE) {
          Serial.printf("❌ Payload too large: %d bytes (max: %d)\n", total, MAX_UPLOAD_SIZE);
          request->send(413, "application/json", "{\"status\":\"error\",\"message\":\"Payload too large\"}");
          return;
        }

        uploadInProgress = true;
        uploadBufferLen = 0;
        Serial.println("📸 Received image upload request from camera");
        Serial.printf("📦 Total size: %d bytes\n", total);
        Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
      }

      // Append chunk to static buffer
      if (uploadBufferLen + len <= MAX_UPLOAD_SIZE) {
        memcpy(uploadBuffer + uploadBufferLen, data, len);
        uploadBufferLen += len;
        Serial.printf("📊 Chunk: %d/%d bytes\n", uploadBufferLen, total);
      } else {
        Serial.println("❌ Buffer overflow");
        uploadInProgress = false;
        uploadBufferLen = 0;
        request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Buffer overflow\"}");
        return;
      }

      // Check if this is the last chunk
      if (index + len >= total) {
        Serial.println("✅ All chunks received, processing...");

        // Null-terminate for safety
        uploadBuffer[uploadBufferLen] = '\0';

        // Parse complete JSON payload
        DynamicJsonDocument doc(20480);
        DeserializationError error = deserializeJson(doc, uploadBuffer, uploadBufferLen);

        if (error) {
          Serial.printf("❌ JSON parsing failed: %s\n", error.c_str());
          uploadInProgress = false;
          uploadBufferLen = 0;
          request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
          return;
        }

        // Extract image data
        String deviceId = doc["deviceId"].as<String>();
        String imageData = doc["imageData"].as<String>();
        String format = doc["format"].as<String>();

        Serial.printf("📦 Received from %s: %d bytes (%s)\n", deviceId.c_str(), imageData.length(), format.c_str());

        // Reset upload state
        uploadInProgress = false;
        uploadBufferLen = 0;

        // Upload to ImageBB
        String imageUrl = uploadToImageBB(imageData);

        if (imageUrl.length() > 0) {
          // Success - return image URL to camera
          DynamicJsonDocument responseDoc(512);
          responseDoc["status"] = "ok";
          responseDoc["imageUrl"] = imageUrl;

          String response;
          serializeJson(responseDoc, response);

          Serial.println("✅ Proxy upload successful, returning URL to camera");
          request->send(200, "application/json", response);
        } else {
          // Failed to upload to ImageBB
          Serial.println("❌ Proxy upload failed");
          request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"ImageBB upload failed\"}");
        }
      }
    }
  );

  // Status endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(512);
    doc["device"] = "main_board";
    doc["status"] = "online";
    doc["firebase"] = firebaseConnected;
    doc["soilHumidity"] = soilHumidity;
    doc["soilTemperature"] = soilTemperature;
    doc["soilConductivity"] = soilConductivity;
    doc["ph"] = soilPH;
    doc["currentTrack"] = currentTrack;
    doc["volume"] = volumeLevel;
    doc["servoActive"] = armSteppersActive;
    doc["headPosition"] = currentHeadPosition;
    doc["birdsToday"] = birdsDetectedToday;
    doc["freeHeap"] = ESP.getFreeHeap();

    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Manual alarm trigger endpoint
  server.on("/trigger-alarm", HTTP_GET, [](AsyncWebServerRequest *request) {
    triggerAlarmSequence();
    request->send(200, "application/json", "{\"status\":\"alarm_triggered\"}");
  });

  // Audio control endpoint
  server.on("/play", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("track")) {
      int track = request->getParam("track")->value().toInt();
      playAudio(track);
      request->send(200, "application/json", "{\"status\":\"playing\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing track parameter\"}");
    }
  });

  // Volume control endpoint
  server.on("/volume", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("level")) {
      int level = request->getParam("level")->value().toInt();
      setVolume(level);
      request->send(200, "application/json", "{\"status\":\"volume_set\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing level parameter\"}");
    }
  });

  // Servo control endpoint
  server.on("/move-arms", HTTP_GET, [](AsyncWebServerRequest *request) {
    startArmStepperSequence();
    request->send(200, "application/json", "{\"status\":\"oscillating\"}");
  });

  // Head rotation endpoint
  server.on("/rotate-head", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("angle")) {
      int angle = request->getParam("angle")->value().toInt();
      rotateHead(angle);
      request->send(200, "application/json", "{\"status\":\"rotating\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing angle parameter\"}");
    }
  });

  Serial.println("✅ HTTP endpoints configured");
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🤖 BantayBot Main Board with Firebase - Starting...");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());

  // Initialize pins
  pinMode(RS485_RE, OUTPUT);
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(RS485_RE, LOW);
  digitalWrite(STEPPER_ENABLE_PIN, HIGH); // Disable stepper initially
  digitalWrite(SPEAKER_PIN, LOW);

  // Arm stepper pins
  pinMode(ARM1_STEP_PIN, OUTPUT);
  pinMode(ARM1_DIR_PIN, OUTPUT);
  pinMode(ARM1_ENABLE_PIN, OUTPUT);
  pinMode(ARM2_STEP_PIN, OUTPUT);
  pinMode(ARM2_DIR_PIN, OUTPUT);
  pinMode(ARM2_ENABLE_PIN, OUTPUT);
  digitalWrite(ARM1_STEP_PIN, LOW);
  digitalWrite(ARM2_STEP_PIN, LOW);
  enableArmSteppers(false);

  // Initialize RS485 for soil sensor
  Serial2.begin(4800, SERIAL_8N1, RS485_RX, RS485_TX);

  // Initialize DFPlayer Mini
  dfPlayerSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
  delay(500);
  if (!dfPlayer.begin(dfPlayerSerial)) {
    Serial.println("❌ DFPlayer Mini initialization failed!");
  } else {
    Serial.println("✅ DFPlayer Mini initialized");
    dfPlayer.volume(volumeLevel);
  }

  // Initialize DHT sensor
  dht.begin();

  // Initialize stepper motor
  stepper.setMaxSpeed(2000);     // Increased from 1000
  stepper.setAcceleration(1000);  // Increased from 500
  stepper.setCurrentPosition(0); // Set initial position to 0
  Serial.println("⚙️  Stepper motor configured: 2000 steps/sec, 1000 accel");

  // Connect to WiFi (non-blocking with timeout)
  Serial.println("📶 Attempting initial WiFi connection (30s timeout)...");
  bool wifiConnected = tryConnectWiFi(WIFI_CONNECT_TIMEOUT);

  if (wifiConnected) {
    // Check internet access
    if (checkInternetAccess()) {
      // Sync NTP time
      syncNTP();
      // Initialize Firebase
      initializeFirebase();
    } else {
      Serial.println("📶 Local network only - Firebase disabled");
    }
  } else {
    Serial.println("═══════════════════════════════════════════");
    Serial.println("⚠️  OFFLINE MODE ACTIVE");
    Serial.println("═══════════════════════════════════════════");
    Serial.println("📊 Sensors, audio, motors will work locally");
    Serial.println("🔄 WiFi reconnection every 60 seconds");
    Serial.println("📦 Data will be queued and synced when online");
    Serial.println("═══════════════════════════════════════════");
  }

  // Setup HTTP endpoints
  setupHTTPEndpoints();

  // Configure server limits for large image uploads
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");

  // Start HTTP server
  server.begin();
  Serial.println("🌐 HTTP server started on port 81");
  Serial.println("📦 Max body size configured for image uploads");

  // Start continuous head scanning for detection
  startHeadScanning();

  Serial.println("🚀 BantayBot Main Board ready!");
  Serial.println("🔥 Firebase: " + String(firebaseConnected ? "ENABLED" : "DISABLED"));
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
}

// ===========================
// Firebase Command Polling
// ===========================

void checkFirebaseCommands() {
  if (!firebaseConnected) return;
  if (millis() - lastCommandCheck < COMMAND_CHECK_INTERVAL) return;

  lastCommandCheck = millis();

  String path = "commands/main_001/pending";

  // Use listDocuments with proper parameters
  if (Firebase.Firestore.listDocuments(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(),
                                       1, "", "", "", false)) {
    // Parse response payload
    String payload = fbdo.payload();

    if (payload.length() > 0) {
      FirebaseJson json;
      FirebaseJsonData result;
      json.setJsonData(payload);

      // Get documents array using FirebaseJsonData
      json.get(result, "documents");

      if (result.success && result.type == "array") {
        // Get the array string and parse it
        String arrayStr = result.stringValue;
        FirebaseJsonArray docs;
        docs.setJsonArrayData(arrayStr);

        if (docs.size() > 0) {
          FirebaseJsonData docData;
          docs.get(docData, 0);

          if (docData.success) {
            FirebaseJson docJson;
            docJson.setJsonData(docData.stringValue);

            // Get action field
            FirebaseJsonData actionData;
            docJson.get(actionData, "fields/action/stringValue");
            String action = actionData.stringValue;

            Serial.println("📥 Received command: " + action);

            // Execute command
            if (action == "play_audio") {
              FirebaseJsonData trackData;
              docJson.get(trackData, "fields/params/mapValue/fields/track/integerValue");
              int track = trackData.intValue;
              playAudio(track);
            }
            else if (action == "set_volume") {
              FirebaseJsonData volumeData;
              docJson.get(volumeData, "fields/params/mapValue/fields/volume/integerValue");
              int volume = volumeData.intValue;
              setVolume(volume);
            }
            else if (action == "oscillate_arms") {
              startArmStepperSequence();
            }
            else if (action == "rotate_head") {
              FirebaseJsonData angleData;
              docJson.get(angleData, "fields/params/mapValue/fields/angle/integerValue");
              int angle = angleData.intValue;
              rotateHead(angle);
            }
            else if (action == "trigger_alarm") {
              triggerAlarmSequence();
            }
            else if (action == "stop_movement") {
              // Stop all motors
              stopArmStepperSequence();
              stopHeadScanning();
              Serial.println("⏹️ All movement stopped");
            }
            else if (action == "test_buzzer") {
              // Test buzzer with a short beep
              digitalWrite(SPEAKER_PIN, HIGH);
              delay(500);
              digitalWrite(SPEAKER_PIN, LOW);
              Serial.println("🔊 Buzzer tested");
            }
            else if (action == "calibrate_sensors") {
              // Recalibrate sensors by reading fresh data
              readRS485Sensor();
              Serial.println("🔧 Sensors recalibrated");
            }
            else if (action == "reset_system" || action == "restart") {
              // Restart the ESP32
              Serial.println("🔄 System reset requested");
              delay(100);
              ESP.restart();
            }
            // Audio commands
            else if (action == "stop_audio") {
              stopAudio();
            }
            else if (action == "next_track") {
              int nextTrack = currentTrack + 1;
              if (nextTrack > TOTAL_TRACKS) nextTrack = 1;
              if (nextTrack == 3) nextTrack = 4;  // Skip track 3
              playAudio(nextTrack);
            }
            else if (action == "prev_track") {
              int prevTrack = currentTrack - 1;
              if (prevTrack < 1) prevTrack = TOTAL_TRACKS;
              if (prevTrack == 3) prevTrack = 2;  // Skip track 3
              playAudio(prevTrack);
            }
            else if (action == "set_track") {
              FirebaseJsonData trackData;
              docJson.get(trackData, "fields/params/mapValue/fields/track/integerValue");
              int track = trackData.intValue;
              playAudio(track);
            }
            // Head rotation shortcuts
            else if (action == "rotate_left") {
              rotateHead(-90);
            }
            else if (action == "rotate_right") {
              rotateHead(90);
            }
            else if (action == "rotate_center") {
              rotateHead(0);
            }
            // Arm commands
            else if (action == "stop_oscillate") {
              stopArmStepperSequence();
            }
            else if (action == "arms_rest") {
              stopArmStepperSequence();
              Serial.println("🦾 Arms at rest position");
            }
            else if (action == "arms_alert" || action == "arms_wave") {
              startArmStepperSequence();
              Serial.println("🦾 Arms alert/wave sequence");
            }
            else if (action == "move_servo") {
              // Legacy servo command - map to arm oscillation
              startArmStepperSequence();
              Serial.println("🦾 Move servo mapped to arm oscillation");
            }
            else {
              Serial.println("⚠️ Unknown command: " + action);
            }

            // Delete command after execution to prevent race condition
            // (Previously marked as "completed" but PWA deletion was slower than device polling)
            FirebaseJsonData nameData;
            docJson.get(nameData, "name");
            String docName = nameData.stringValue;

            // Extract just the document ID from the full path
            int lastSlash = docName.lastIndexOf('/');
            String docId = docName.substring(lastSlash + 1);
            String completePath = path + "/" + docId;

            Serial.printf("🗑️ Deleting command: %s\n", completePath.c_str());

            if (Firebase.Firestore.deleteDocument(&fbdo, FIREBASE_PROJECT_ID, "", completePath.c_str())) {
              Serial.println("✅ Command deleted successfully!");
            } else {
              Serial.println("❌ Failed to delete command: " + fbdo.errorReason());
            }
          }
        }
      }
    }
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Handle WiFi reconnection in background (non-blocking)
  handleWiFiReconnection();

  // Periodic memory check (every 60 seconds)
  static unsigned long lastMemCheck = 0;
  if (currentTime - lastMemCheck > 60000) {
    lastMemCheck = currentTime;
    logMemoryStatus();
    if (ESP.getFreeHeap() < 20000) {
      Serial.println("⚠️ WARNING: Low memory!");
    }
  }

  // Read sensors periodically
  static unsigned long lastSensorRead = 0;
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readRS485Sensor();
    lastSensorRead = currentTime;

    Serial.printf("📊 Sensors - Humidity: %.1f%%, Temp: %.1fC, Conductivity: %.0f, pH: %.2f\n",
                  soilHumidity, soilTemperature, soilConductivity, soilPH);
  }

  // Update arm stepper motion (only if arms are active)
  // Arms should only be active during detection sequences
  updateArmSteppers();

  // Safety check: Ensure arms are disabled if they completed their sequence
  // This prevents arms from staying active when they shouldn't be
  if (armSteppersActive && armSweepCount >= ARM_TARGET_SWEEPS) {
    stopArmStepperSequence();
  }

  // Update continuous head scanning (when no detection/arms active)
  updateHeadScanning();

  // Run stepper motor only if not paused
  if (!headMovementPaused) {
    stepper.run();
  }

  // Firebase operations (online mode)
  if (firebaseConnected && hasInternetAccess) {
    // Check for Firebase commands
    checkFirebaseCommands();

    // Smart sensor update - every 60 sec, only if values changed
    if (currentTime - lastLatestUpdate >= LATEST_UPDATE_INTERVAL) {
      updateDeviceStatus();
      updateSensorDataSmart();
      lastLatestUpdate = currentTime;
    }

    // History snapshot - every 15 min, always saves
    if (currentTime - lastHistoryUpdate >= HISTORY_UPDATE_INTERVAL) {
      saveSensorHistory();
      lastHistoryUpdate = currentTime;
    }
  } else {
    // Offline mode - queue sensor data periodically
    if (currentTime - lastHistoryUpdate >= HISTORY_UPDATE_INTERVAL) {
      // Read DHT sensor for temperature/humidity
      float h = dht.readHumidity();
      float t = dht.readTemperature();
      if (!isnan(h) && !isnan(t)) {
        queueSensorReading(t, h, soilHumidity, soilTemperature, soilPH, soilConductivity);
      }
      lastHistoryUpdate = currentTime;
    }
  }

  delay(10);
}
