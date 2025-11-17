/**
 * BantayBot Camera Module - ESP32-CAM with Firebase
 *
 * Hardware: AI Thinker ESP32-CAM
 * Features: Camera stream, bird detection, Firebase Firestore integration
 *
 * Required Libraries:
 * - Firebase-ESP-Client by Mobizt (v4.x)
 * - ArduinoJson by Benoit Blanchon (v6.x)
 *
 * Pin Configuration: Same as original (see board_config.h)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Camera model
#include "board_config.h"

// ===========================
// Firebase Configuration
// ===========================
// TODO: Replace with your Firebase project credentials
#define FIREBASE_HOST "cloudbantaybot.firebaseio.com"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_PROJECT_ID "cloudbantaybot"

#define DEVICE_ID "camera_001"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===========================
// WiFi Configuration
// ===========================
const char* ssid = "HUAWEI-E5330-6AB9";
const char* password = "16yaa0a";

// ===========================
// Camera Settings
// ===========================
int cameraResolution = FRAMESIZE_QVGA;  // 320x240 for detection
int cameraBrightness = 0;
int cameraContrast = 0;
bool grayscaleMode = false;

// ===========================
// Bird Detection Settings
// ===========================
bool birdDetectionEnabled = true;
int detectionSensitivity = 2;
int detectionThreshold = 25;
int minBirdSize = 1000;
int maxBirdSize = 30000;
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;  // 10 seconds

// Detection buffers
uint8_t *prevGrayBuffer = NULL;
uint8_t *currGrayBuffer = NULL;
const int GRAY_BUFFER_SIZE = 320 * 240;

// ===========================
// Timing
// ===========================
unsigned long lastFirebaseUpdate = 0;
const unsigned long FIREBASE_UPDATE_INTERVAL = 2000;  // 2 seconds
unsigned long lastCommandCheck = 0;
const unsigned long COMMAND_CHECK_INTERVAL = 500;  // 500ms

// ===========================
// HTTP Server for Camera Stream
// ===========================
#include <ESPAsyncWebServer.h>
AsyncWebServer server(80);

// ===========================
// Function Declarations
// ===========================
void setupCamera();
void setupFirebase();
void uploadSensorData();
void checkCommands();
void performBirdDetection();
bool detectMotion();
void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer);

void setup() {
  Serial.begin(115200);
  Serial.println("\n📷 BantayBot Camera (Firebase) Starting...");

  // Setup camera
  setupCamera();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.print("📍 IP Address: ");
  Serial.println(WiFi.localIP());

  // Setup Firebase
  setupFirebase();

  // Allocate detection buffers
  prevGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
  currGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
  if (!prevGrayBuffer || !currGrayBuffer) {
    Serial.println("⚠️ Failed to allocate detection buffers");
  }

  // Setup camera stream server
  server.on("/stream", HTTP_GET, [](AsyncWebServerRequest *request){
    AsyncWebServerResponse *response = request->beginChunkedResponse("multipart/x-mixed-replace;boundary=frame", [](uint8_t *buffer, size_t maxLen, size_t index) -> size_t {
      camera_fb_t *fb = esp_camera_fb_get();
      if (!fb) return 0;

      size_t len = 0;
      if (index == 0) {
        len = snprintf((char *)buffer, maxLen, "--frame\r\nContent-Type: image/jpeg\r\n\r\n");
      }
      if (len < maxLen) {
        size_t fbLen = fb->len;
        if (fbLen < (maxLen - len)) {
          memcpy(buffer + len, fb->buf, fbLen);
          len += fbLen;
        }
      }
      esp_camera_fb_return(fb);
      return len;
    });
    request->send(response);
  });

  server.begin();
  Serial.println("✅ Camera stream server started on port 80");
}

void loop() {
  unsigned long now = millis();

  // Upload sensor data to Firebase
  if (now - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
    lastFirebaseUpdate = now;
    uploadSensorData();
  }

  // Check for commands from Firebase
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = now;
    checkCommands();
  }

  // Perform bird detection
  if (birdDetectionEnabled) {
    performBirdDetection();
  }

  delay(10);
}

void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = cameraResolution;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (psramFound()) {
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed: 0x%x\n", err);
    return;
  }
  Serial.println("✅ Camera initialized");
}

void setupFirebase() {
  config.api_key = API_KEY;
  config.database_url = FIREBASE_HOST;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Firebase connected (anonymous)");
  } else {
    Serial.printf("❌ Firebase signup failed: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void uploadSensorData() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("device_id", DEVICE_ID);
  json.set("birds_detected_today", birdsDetectedToday);
  json.set("detection_enabled", birdDetectionEnabled);
  json.set("detection_sensitivity", detectionSensitivity);
  json.set("camera_brightness", cameraBrightness);
  json.set("camera_contrast", cameraContrast);
  json.set("grayscale_mode", grayscaleMode);
  json.set("resolution", "QVGA");
  json.set("updated_at", String(millis()));

  String documentPath = "sensor_data/" + String(DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), json.raw(), "")) {
    Serial.println("✅ Sensor data uploaded");
  } else {
    Serial.println("❌ Upload failed: " + fbdo.errorReason());
  }
}

void checkCommands() {
  // TODO: Implement command polling from Firestore
  // Query commands/camera_001/pending collection for status == "pending"
  // Execute command and update status to "completed"
}

void performBirdDetection() {
  unsigned long now = millis();
  if (now - lastDetectionTime < DETECTION_COOLDOWN) return;

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) return;

  convertToGrayscale(fb, currGrayBuffer);

  if (detectMotion()) {
    birdsDetectedToday++;
    lastDetectionTime = now;
    Serial.printf("🐦 Bird detected! Total today: %d\n", birdsDetectedToday);

    // Log to Firebase detection_history
    FirebaseJson detectionJson;
    detectionJson.set("device_id", DEVICE_ID);
    detectionJson.set("timestamp", String(millis()));
    detectionJson.set("confidence", 0.85);
    detectionJson.set("triggered_alarm", true);

    String collectionPath = "detection_history";
    Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", collectionPath.c_str(), detectionJson.raw());
  }

  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);
  esp_camera_fb_return(fb);
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  // Simple grayscale conversion
  for (int i = 0; i < GRAY_BUFFER_SIZE && i < fb->len; i++) {
    grayBuffer[i] = fb->buf[i];
  }
}

bool detectMotion() {
  if (!prevGrayBuffer || !currGrayBuffer) return false;

  int diffCount = 0;
  for (int i = 0; i < GRAY_BUFFER_SIZE; i++) {
    int diff = abs(currGrayBuffer[i] - prevGrayBuffer[i]);
    if (diff > detectionThreshold) {
      diffCount++;
    }
  }

  return (diffCount >= minBirdSize && diffCount <= maxBirdSize);
}
