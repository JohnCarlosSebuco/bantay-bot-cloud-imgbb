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
const int HEAD_SCAN_MIN = -90;  // Minimum scan angle (degrees)
const int HEAD_SCAN_MAX = 90;   // Maximum scan angle (degrees)

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
  if (!firebaseConnected) return;

  Serial.println("📝 Logging bird detection to Firestore...");

  FirebaseJson json;
  json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
  json.set("fields/timestamp/integerValue", String(time(nullptr) * 1000LL));
  json.set("fields/imageUrl/stringValue", imageUrl);
  json.set("fields/birdSize/integerValue", String(birdSize));
  json.set("fields/confidence/integerValue", String(confidence));
  json.set("fields/detectionZone/stringValue", detectionZone);
  json.set("fields/triggered/booleanValue", true);

  String path = "detection_history";

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.println("✅ Detection logged to Firestore!");
    birdsDetectedToday++;
  } else {
    Serial.println("❌ Failed to log detection: " + fbdo.errorReason());
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
  Serial.println("⚙️  Stepper motor configured: 2000 steps/sec, 1000 accel");

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📍 IP address: " + WiFi.localIP().toString());

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

  // Firebase operations
  if (firebaseConnected) {
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
  }

  delay(10);
}
