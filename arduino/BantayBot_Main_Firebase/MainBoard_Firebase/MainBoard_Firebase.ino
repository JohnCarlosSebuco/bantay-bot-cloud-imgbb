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
bool firebaseInitialized = false;  // Tracks if Firebase.begin() was ever called
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;

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

// Sensor 1 values
float soil1Humidity = 0.0;
float soil1Temperature = 0.0;
float soil1Conductivity = 0.0;
float soil1PH = 0.0;

// Sensor 2 values
float soil2Humidity = 0.0;
float soil2Temperature = 0.0;
float soil2Conductivity = 0.0;
float soil2PH = 0.0;

// Averaged values (backward compatibility)
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
const int HEAD_SCAN_MIN = -45;   // Minimum scan angle (degrees) - 45° left of center
const int HEAD_SCAN_MAX = 45;    // Maximum scan angle (degrees) - 45° right of center (90° total range)

// Stop-and-scan behavior
bool headIsScanning = false;          // True when stopped and actively scanning (not moving)
unsigned long lastScanArrivalTime = 0; // When head arrived at current scan position
const unsigned long SCAN_DWELL_TIME = 3000;  // 3 seconds dwell at each position before moving

// Detection State
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;

// Push Notification Throttle - DISABLED: Now handled by Cloud Functions
// unsigned long lastNotifMoisture = 0;
// unsigned long lastNotifTemp = 0;
// unsigned long lastNotifPH = 0;
// unsigned long lastNotifConductivity = 0;
// unsigned long lastNotifBird = 0;
// const unsigned long NOTIF_COOLDOWN = 1800000; // 30 minutes

// Pending notification queue - DISABLED: Now handled by Cloud Functions
// bool pendingBirdNotif = false;

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
  firebaseInitialized = true;

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

  // Sensor 1 data (NEW)
  json.set("fields/soil1Humidity/doubleValue", soil1Humidity);
  json.set("fields/soil1Temperature/doubleValue", soil1Temperature);
  json.set("fields/soil1Conductivity/doubleValue", soil1Conductivity);
  json.set("fields/soil1PH/doubleValue", soil1PH);

  // Sensor 2 data (NEW)
  json.set("fields/soil2Humidity/doubleValue", soil2Humidity);
  json.set("fields/soil2Temperature/doubleValue", soil2Temperature);
  json.set("fields/soil2Conductivity/doubleValue", soil2Conductivity);
  json.set("fields/soil2PH/doubleValue", soil2PH);

  // Averaged data (backward compatibility)
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);

  // Other fields
  json.set("fields/currentTrack/integerValue", String(currentTrack));
  json.set("fields/volume/integerValue", String(volumeLevel));
  json.set("fields/servoActive/booleanValue", armSteppersActive);
  json.set("fields/headPosition/integerValue", String(currentHeadPosition));
  json.set("fields/timestamp/integerValue", String(millis()));

  String path = "sensor_data/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Sensor data updated (values changed)");
    Serial.printf("   S1: H=%.1f T=%.1f EC=%.0f pH=%.1f\n", soil1Humidity, soil1Temperature, soil1Conductivity, soil1PH);
    Serial.printf("   S2: H=%.1f T=%.1f EC=%.0f pH=%.1f\n", soil2Humidity, soil2Temperature, soil2Conductivity, soil2PH);
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
  if (!firebaseConnected || connectionState != CONN_ONLINE) {
    Serial.println("📴 Offline - queuing sensor snapshot");
    queueSensorSnapshot();
    return;
  }

  String docId = getFormattedTimestamp();
  String readableTime = getReadableTimestamp();

  Serial.printf("📜 Saving sensor history: %s\n", docId.c_str());

  FirebaseJson json;

  // Sensor 1 data (NEW)
  json.set("fields/soil1Humidity/doubleValue", soil1Humidity);
  json.set("fields/soil1Temperature/doubleValue", soil1Temperature);
  json.set("fields/soil1Conductivity/doubleValue", soil1Conductivity);
  json.set("fields/soil1PH/doubleValue", soil1PH);

  // Sensor 2 data (NEW)
  json.set("fields/soil2Humidity/doubleValue", soil2Humidity);
  json.set("fields/soil2Temperature/doubleValue", soil2Temperature);
  json.set("fields/soil2Conductivity/doubleValue", soil2Conductivity);
  json.set("fields/soil2PH/doubleValue", soil2PH);

  // Averaged data (backward compatibility)
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);

  // Other fields
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
  if (!firebaseConnected || connectionState != CONN_ONLINE) {
    Serial.println("📴 Offline - queuing detection for later sync");
    queueDetection(birdSize, confidence, detectionZone, true);
    birdsDetectedToday++;
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
    birdsDetectedToday++;
    // Push notification now handled by Cloud Functions (onBirdDetection trigger)
    // pendingBirdNotif = true;
  } else {
    Serial.println("❌ Failed to log detection: " + fbdo.errorReason());
  }
}

// ===========================
// Push Notification via Pipedream - DISABLED: Now handled by Cloud Functions
// ===========================

// void sendPushNotification(String type, String value) {
//   if (WiFi.status() != WL_CONNECTED) return;
//   HTTPClient http;
//   http.begin(PIPEDREAM_WEBHOOK);
//   http.addHeader("Content-Type", "application/json");
//   http.setTimeout(5000);
//   String payload = "{\"type\":\"" + type + "\",\"value\":\"" + value + "\"}";
//   int httpCode = http.POST(payload);
//   if (httpCode >= 200 && httpCode < 300) {
//     Serial.println("📲 Push notification sent: " + type);
//   } else if (httpCode > 0) {
//     Serial.println("⚠️ Push notification HTTP error " + String(httpCode) + ": " + type);
//   } else {
//     Serial.println("❌ Push notification failed: " + http.errorToString(httpCode));
//   }
//   http.end();
// }

// ===========================
// RS485 Soil Sensor Functions
// ===========================

// Parameterized RS485 read function for dual sensor support
float readRS485SensorValue(HardwareSerial &port, int rePin, const byte *command) {
  byte values[11];

  // Ensure both RE pins are LOW first (receive mode)
  digitalWrite(RS485_RE1, LOW);
  digitalWrite(RS485_RE2, LOW);

  // Set target sensor to transmit mode
  digitalWrite(rePin, HIGH);
  delay(10);

  // Send command
  for (int i = 0; i < 8; i++) {
    port.write(command[i]);
  }
  port.flush();

  // Switch to receive mode
  digitalWrite(rePin, LOW);
  delay(200);

  // Read response
  int i = 0;
  unsigned long startTime = millis();
  while (port.available() > 0 && i < 11) {
    values[i++] = port.read();
    if (millis() - startTime > 500) break;  // Timeout
  }

  if (i < 5) return -999;  // Invalid response
  return ((values[3] << 8) | values[4]);
}

// Read all sensors (both sensor 1 and sensor 2)
void readAllSensors() {
  float raw;

  // ===== Read Sensor 1 (Serial2) =====
  raw = readRS485SensorValue(Serial2, RS485_RE1, cmd_humidity);
  if (raw != -999) soil1Humidity = raw / 10.0;

  raw = readRS485SensorValue(Serial2, RS485_RE1, cmd_temp);
  if (raw != -999) soil1Temperature = raw / 10.0;

  raw = readRS485SensorValue(Serial2, RS485_RE1, cmd_conductivity);
  if (raw != -999) soil1Conductivity = raw;

  raw = readRS485SensorValue(Serial2, RS485_RE1, cmd_ph);
  if (raw != -999) soil1PH = raw / 10.0;

  // ===== Read Sensor 2 (Serial1 - temporarily switch from DFPlayer) =====
  // Reinitialize Serial1 for sensor 2 (4800 baud for RS485)
  dfPlayerSerial.end();
  delay(10);
  dfPlayerSerial.begin(4800, SERIAL_8N1, RS485_RX2, RS485_TX2);
  delay(50);

  raw = readRS485SensorValue(dfPlayerSerial, RS485_RE2, cmd_humidity);
  if (raw != -999) soil2Humidity = raw / 10.0;

  raw = readRS485SensorValue(dfPlayerSerial, RS485_RE2, cmd_temp);
  if (raw != -999) soil2Temperature = raw / 10.0;

  raw = readRS485SensorValue(dfPlayerSerial, RS485_RE2, cmd_conductivity);
  if (raw != -999) soil2Conductivity = raw;

  raw = readRS485SensorValue(dfPlayerSerial, RS485_RE2, cmd_ph);
  if (raw != -999) soil2PH = raw / 10.0;

  // Reinitialize Serial1 back to DFPlayer (9600 baud)
  dfPlayerSerial.end();
  delay(10);
  dfPlayerSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
  delay(50);

  // ===== Calculate averages (backward compatibility) =====
  soilHumidity = (soil1Humidity + soil2Humidity) / 2.0;
  soilTemperature = (soil1Temperature + soil2Temperature) / 2.0;
  soilConductivity = (soil1Conductivity + soil2Conductivity) / 2.0;
  soilPH = (soil1PH + soil2PH) / 2.0;

  // Sensor alerts now handled by Cloud Functions (onSensorDataUpdate trigger)
  // checkSensorAlerts();
}

// checkSensorAlerts() - DISABLED: Now handled by Cloud Functions
// void checkSensorAlerts() {
//   unsigned long now = millis();
//   // Soil Moisture
//   if (soilHumidity > 0 && (now - lastNotifMoisture > NOTIF_COOLDOWN)) {
//     if (soilHumidity < 20) {
//       sendPushNotification("soil_moisture_critical", String(soilHumidity, 1));
//       lastNotifMoisture = now;
//     } else if (soilHumidity < 40) {
//       sendPushNotification("soil_moisture_warning", String(soilHumidity, 1));
//       lastNotifMoisture = now;
//     }
//   }
//   // Soil Temperature
//   if (soilTemperature > 0 && (now - lastNotifTemp > NOTIF_COOLDOWN)) {
//     if (soilTemperature > 35) {
//       sendPushNotification("soil_temperature_high", String(soilTemperature, 1));
//       lastNotifTemp = now;
//     } else if (soilTemperature < 10) {
//       sendPushNotification("soil_temperature_low", String(soilTemperature, 1));
//       lastNotifTemp = now;
//     }
//   }
//   // Soil pH
//   if (soilPH > 0 && (now - lastNotifPH > NOTIF_COOLDOWN)) {
//     if (soilPH < 4.0) {
//       sendPushNotification("soil_ph_acidic", String(soilPH, 1));
//       lastNotifPH = now;
//     } else if (soilPH > 8.5) {
//       sendPushNotification("soil_ph_alkaline", String(soilPH, 1));
//       lastNotifPH = now;
//     }
//   }
//   // Soil Conductivity
//   if (soilConductivity > 0 && (now - lastNotifConductivity > NOTIF_COOLDOWN)) {
//     if (soilConductivity < 100) {
//       sendPushNotification("nutrient_low", String(soilConductivity, 0));
//       lastNotifConductivity = now;
//     }
//   }
// }

// Legacy function for backward compatibility
void readRS485Sensor() {
  readAllSensors();
}

// ===========================
// Audio Functions
// ===========================

void playAudio(int track) {
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

  // Set direction for both arms (same DIR signal = opposite physical motion due to mirrored mounting)
  digitalWrite(ARM1_DIR_PIN, (armStepDirection == 1) ? HIGH : LOW);
  digitalWrite(ARM2_DIR_PIN, (armStepDirection == 1) ? HIGH : LOW);

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
  headIsScanning = false;  // Will be set true when head arrives at position
  digitalWrite(STEPPER_ENABLE_PIN, LOW);  // Enable stepper

  // Start scanning from center position (0°)
  if (stepper.distanceToGo() == 0) {
    rotateHead(0);  // Go to center first
    headScanDirection = 1;  // Start scanning right after center
  }
  Serial.println("👁️  Head scanning started (90° range: -45° to +45°, 3s dwell)");
}

void stopHeadScanning() {
  headScanningActive = false;
  Serial.println("⏸️  Head scanning stopped");
}

void updateHeadScanning() {
  if (!headScanningActive || headMovementPaused || armSteppersActive) return;

  // If head is currently moving, don't scan - wait for it to arrive
  if (stepper.distanceToGo() != 0) {
    headIsScanning = false;  // Not scanning while moving
    return;
  }

  // Head has reached target position
  if (!headIsScanning) {
    // Just arrived at position - start scanning (dwell)
    headIsScanning = true;
    lastScanArrivalTime = millis();
    Serial.printf("👁️  Head at %d° - scanning for %d seconds\n", currentHeadPosition, SCAN_DWELL_TIME / 1000);
    return;
  }

  // Currently scanning (dwelling) at position - check if dwell time has passed
  if (millis() - lastScanArrivalTime < SCAN_DWELL_TIME) {
    return;  // Still scanning at current position, wait
  }

  // Dwell time complete - move to next scan position
  headIsScanning = false;

  // Calculate next scan position (15° increments for smoother coverage)
  int nextPosition = currentHeadPosition + (headScanDirection * 15);

  // Reverse direction if we hit limits
  if (nextPosition >= HEAD_SCAN_MAX) {
    nextPosition = HEAD_SCAN_MAX;
    headScanDirection = -1;  // Reverse to left
    Serial.println("↩️  Head reached right limit, reversing");
  } else if (nextPosition <= HEAD_SCAN_MIN) {
    nextPosition = HEAD_SCAN_MIN;
    headScanDirection = 1;   // Reverse to right
    Serial.println("↪️  Head reached left limit, reversing");
  }

  // Move to next position
  Serial.printf("🔄 Moving head: %d° → %d°\n", currentHeadPosition, nextPosition);
  rotateHead(nextPosition);
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

  // Play audio (random track)
  int track = random(1, TOTAL_TRACKS + 1);
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
// Offline Mode Functions
// ===========================

// Non-blocking WiFi reconnection - call in loop()
void handleWiFiReconnection() {
  // Skip if user forced offline
  if (userModePreference == 2) return;

  if (WiFi.status() == WL_CONNECTED) {
    return;  // WiFi is fine, nothing to do
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

// Sync all queued data to Firebase when coming back online
void syncQueuedData() {
  if (!firebaseInitialized || !Firebase.ready()) {
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

  // Sync queued sensor snapshots
  if (sensorQueueCount > 0) {
    syncSensorSnapshots();
  }

  Serial.printf("Sync complete: %d detections synced, %d remaining\n",
                synced, detectionQueueCount);
}

// Update connection state based on WiFi + Firebase status
// Called in loop() - checks connectivity state
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
    if (WiFi.status() != WL_CONNECTED) return;  // No WiFi, stay offline
    if (!firebaseInitialized) return;  // Firebase never started, stay offline until reboot

    // Rate-limit Firebase.ready() checks (may trigger internal token refresh)
    static unsigned long lastReadyCheck = 0;
    if (millis() - lastReadyCheck < 10000) return;  // Check every 10s max
    lastReadyCheck = millis();

    if (Firebase.ready()) {
      // Firebase reconnected - sync queued data
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
    if (WiFi.status() != WL_CONNECTED || (firebaseInitialized && !Firebase.ready())) {
      connectionState = CONN_OFFLINE;
      offlineSince = millis();
      firebaseConnected = false;
      Serial.println("Lost connectivity - switching to OFFLINE mode");
    }
  }
}

// ===========================
// HTTP Endpoints
// ===========================

void setupHTTPEndpoints() {
  // Bird detection endpoint - receives notifications from camera (LOCAL HTTP - always works)
  server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println("🐦 *** BIRD DETECTION RECEIVED FROM CAMERA ***");

      // Parse JSON payload
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.println("❌ JSON parsing failed");
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
      }

      // Extract data
      String imageUrl = doc["imageUrl"].as<String>();
      int birdSize = doc["birdSize"];
      int confidence = doc["confidence"];
      String detectionZone = doc["detectionZone"].as<String>();

      Serial.printf("🐦 Detection: Size=%d, Confidence=%d%%\n", birdSize, confidence);

      // ALWAYS trigger alarm FIRST (local hardware, no internet needed)
      triggerAlarmSequence();
      Serial.println("🚨 ALARM TRIGGERED LOCALLY");

      // Log to Firebase (will queue if offline - never loses data)
      logBirdDetection(imageUrl, birdSize, confidence, detectionZone);

      // Respond to camera
      request->send(200, "application/json", "{\"success\":true,\"alarm\":true}");
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
    DynamicJsonDocument doc(1024);
    doc["device"] = "main_board";
    doc["status"] = "online";
    doc["firebase"] = firebaseConnected;

    // Sensor 1 data
    doc["soil1Humidity"] = soil1Humidity;
    doc["soil1Temperature"] = soil1Temperature;
    doc["soil1Conductivity"] = soil1Conductivity;
    doc["soil1PH"] = soil1PH;

    // Sensor 2 data
    doc["soil2Humidity"] = soil2Humidity;
    doc["soil2Temperature"] = soil2Temperature;
    doc["soil2Conductivity"] = soil2Conductivity;
    doc["soil2PH"] = soil2PH;

    // Averaged data (backward compatibility)
    doc["soilHumidity"] = soilHumidity;
    doc["soilTemperature"] = soilTemperature;
    doc["soilConductivity"] = soilConductivity;
    doc["ph"] = soilPH;

    // Other fields
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

  // ===== Offline Mode Endpoints =====

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
        Serial.printf("📡 Mode set to: %s\n",
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
    if (WiFi.status() != WL_CONNECTED || !firebaseInitialized || !Firebase.ready()) {
      request->send(503, "application/json", "{\"error\":\"No internet connection\"}");
      return;
    }
    connectionState = CONN_TRANSITIONING;
    syncQueuedData();
    connectionState = (firebaseConnected && Firebase.ready()) ? CONN_ONLINE : CONN_OFFLINE;
    request->send(200, "application/json", "{\"success\":true}");
  });

  Serial.println("✅ HTTP endpoints configured (including offline mode)");
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🤖 BantayBot Main Board with Firebase - Starting...");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());

  // Initialize RS485 pins for both sensors
  pinMode(RS485_RE1, OUTPUT);
  pinMode(RS485_RE2, OUTPUT);
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(RS485_RE1, LOW);  // Sensor 1 receive mode
  digitalWrite(RS485_RE2, LOW);  // Sensor 2 receive mode
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

  // Initialize RS485 for soil sensors
  // Sensor 1 on Serial2
  Serial2.begin(4800, SERIAL_8N1, RS485_RX1, RS485_TX1);
  Serial.println("📡 Soil Sensor 1 initialized on Serial2 (pins 17/16)");

  // Note: Sensor 2 uses Serial1 which is also used by DFPlayer
  // We'll reinitialize Serial1 for sensor reading when needed
  // For now, DFPlayer gets priority on Serial1

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

  // Initialize stepper motor - slower speed for smooth scanning
  stepper.setMaxSpeed(600);       // Slower speed for scan movement
  stepper.setAcceleration(300);   // Gentle acceleration
  stepper.setCurrentPosition(0);  // Set initial position to 0 (center)
  Serial.println("⚙️  Stepper motor configured: 600 steps/sec, 300 accel (slow scan mode)");

  // Connect to WiFi (non-blocking with timeout)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Connecting to WiFi");
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiWasConnected = true;
    Serial.println("\n✅ WiFi connected!");
    Serial.println("📍 IP address: " + WiFi.localIP().toString());

    // Test internet connectivity before initializing Firebase
    Serial.println("🌐 Testing internet connectivity...");
    HTTPClient http;
    http.begin("http://www.google.com");
    http.setTimeout(5000);
    int testCode = http.GET();
    http.end();
    bool hasInternet = (testCode > 0);

    if (hasInternet) {
      Serial.printf("✅ Internet accessible (HTTP %d)\n", testCode);

      // Initialize NTP time sync
      Serial.println("🕐 Syncing time with NTP server...");
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

      // Wait for time to sync
      struct tm timeinfo;
      int retries = 0;
      while (!getLocalTime(&timeinfo) && retries < 10) {
        Serial.print(".");
        delay(500);
        retries++;
      }
      if (retries < 10) {
        Serial.println("\n✅ Time synced!");
        char timeStr[50];
        strftime(timeStr, sizeof(timeStr), "%m-%d-%Y %I:%M:%S %p", &timeinfo);
        Serial.printf("📅 Current time: %s\n", timeStr);
      } else {
        Serial.println("\n⚠️ Time sync failed, using millis() fallback");
      }

      // Initialize Firebase
      initializeFirebase();
    } else {
      Serial.printf("⚠️ No internet (code: %d) - skipping Firebase\n", testCode);
      Serial.println("🤖 WiFi connected locally - bird detection still works");
      connectionState = CONN_OFFLINE;
      offlineSince = millis();
    }
  } else {
    Serial.println("\n⚠️ WiFi connection failed - starting in OFFLINE mode");
    Serial.println("🤖 Bot will still detect birds and trigger alarms locally");
    connectionState = CONN_OFFLINE;
    offlineSince = millis();
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
              playAudio(nextTrack);
            }
            else if (action == "prev_track") {
              int prevTrack = currentTrack - 1;
              if (prevTrack < 1) prevTrack = TOTAL_TRACKS;
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

  // === Non-blocking WiFi reconnection ===
  handleWiFiReconnection();

  // === Update connection state (reactive, zero-cost) ===
  updateConnectionState();

  // Read sensors periodically (ALWAYS runs - local hardware)
  static unsigned long lastSensorRead = 0;
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readRS485Sensor();
    lastSensorRead = currentTime;

    Serial.println("📊 Dual Sensor Readings:");
    Serial.printf("   Sensor 1: H=%.1f%%, T=%.1f°C, EC=%.0f µS/cm, pH=%.2f\n",
                  soil1Humidity, soil1Temperature, soil1Conductivity, soil1PH);
    Serial.printf("   Sensor 2: H=%.1f%%, T=%.1f°C, EC=%.0f µS/cm, pH=%.2f\n",
                  soil2Humidity, soil2Temperature, soil2Conductivity, soil2PH);
    Serial.printf("   Average:  H=%.1f%%, T=%.1f°C, EC=%.0f µS/cm, pH=%.2f\n",
                  soilHumidity, soilTemperature, soilConductivity, soilPH);
  }

  // Update arm stepper motion (ALWAYS runs - local hardware)
  updateArmSteppers();

  // Safety check: Ensure arms are disabled if they completed their sequence
  if (armSteppersActive && armSweepCount >= ARM_TARGET_SWEEPS) {
    stopArmStepperSequence();
  }

  // Update continuous head scanning (ALWAYS runs - local hardware)
  updateHeadScanning();

  // Run stepper motor only if not paused
  if (!headMovementPaused) {
    stepper.run();
  }

  // Firebase operations - only when ONLINE
  if (connectionState == CONN_ONLINE && firebaseConnected) {
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
    // OFFLINE: Queue sensor snapshots every 15 min
    if (currentTime - lastHistoryUpdate >= HISTORY_UPDATE_INTERVAL) {
      queueSensorSnapshot();
      lastHistoryUpdate = currentTime;
    }
  }

  delay(10);
}
