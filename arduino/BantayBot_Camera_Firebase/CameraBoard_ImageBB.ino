/*
 * BantayBot Camera Board - ESP32-CAM with ImageBB Smart Usage
 * Optimized for FREE ImageBB tier (5000 uploads/month = ~166/day)
 * Uses Main Board HTTPS proxy for uploads
 *
 * Features:
 * - Bird detection with automatic upload to ImageBB (10s cooldown)
 * - Smart manual capture: returns cached URL if recent (<5s)
 * - Local preview endpoint (no upload) for quick checks via /preview
 * - Upload statistics tracking (daily counter, rate limit monitoring)
 * - HTTP settings endpoint for remote configuration
 * - HTTP notification to Main Board with image URL + detected flag
 * - Smart upload caching to prevent redundant uploads
 * - Status endpoint /stats showing upload usage stats
 * - No Firebase library (saves memory)
 * - Memory efficient: ~180KB free heap
 *
 * Daily Upload Budget: 166 uploads/day (5000/month free tier)
 * - Bird detections: ~50-100/day (varies)
 * - Manual snapshots: ~50/day (cached aggressively)
 * - Safety margin: Stay under 150/day to be safe
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>
#include <ESPAsyncWebServer.h>
#include "board_config.h"

// ===========================
// Feature Flags
// ===========================
// Set to true to enable ImgBB uploads (detection will be slower)
// Set to false for faster detection response (no image uploads)
#define ENABLE_IMGBB_UPLOAD false

// ===========================
// WiFi Credentials
// ===========================
const char *WIFI_SSID = "HUAWEI-E5330-6AB9";
const char *WIFI_PASSWORD = "16yaad0a";

// ===========================
// ImageBB Configuration
// ===========================
const char *IMGBB_API_KEY = "3e8d9f103a965f49318d117decbedd77";  // Get free API key from https://api.imgbb.com/
const char *IMGBB_UPLOAD_URL = "http://api.imgbb.com/1/upload";  // Using HTTP to avoid ESP32 TLS memory issues

// ===========================
// Main Board Configuration
// ===========================
const char *MAIN_BOARD_IP = "192.168.8.101";  // Update with your main board IP
const int MAIN_BOARD_PORT = 81;

// Device IDs
#define CAMERA_DEVICE_ID "camera_001"

// ===========================
// Bird Detection Settings
// ===========================
bool birdDetectionEnabled = true;
int detectionSensitivity = 2;  // 1=low, 2=medium, 3=high
int detectionThreshold = 25;    // Pixel difference threshold
int minBirdSize = 1000;         // Minimum pixels for bird
int maxBirdSize = 30000;        // Maximum pixels for bird
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;  // 10 second cooldown

// On-Demand Capture & Upload Tracking
unsigned long lastUploadTime = 0;  // Track last upload (detection or manual)
String lastImageUrl = "";  // Cache last uploaded image URL
const unsigned long UPLOAD_COOLDOWN = 5000;  // 5 seconds between any uploads (increased for smarter caching)

// Upload Statistics (for rate limit management)
int uploadsToday = 0;           // Total uploads today
int detectionUploads = 0;       // Bird detection uploads
int manualUploads = 0;          // Manual snapshot uploads
unsigned long lastResetTime = 0; // Last time we reset daily counter
const unsigned long DAY_MS = 86400000;  // 24 hours in milliseconds
const int DAILY_UPLOAD_LIMIT = 150;  // Conservative limit (166 available, keep margin)

// ===========================
// WiFi State Management (Offline/Online Mode)
// ===========================
enum WiFiState { WIFI_DISCONNECTED, WIFI_CONNECTING, WIFI_CONNECTED, WIFI_NO_INTERNET };
WiFiState wifiState = WIFI_DISCONNECTED;
unsigned long lastWiFiReconnectAttempt = 0;
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;    // 30 sec initial connection timeout
const unsigned long WIFI_RECONNECT_INTERVAL = 60000; // 60 sec between reconnect attempts
const unsigned long WIFI_RECONNECT_TIMEOUT = 10000;  // 10 sec per reconnect attempt
bool mainBoardReachable = false;

// ===========================
// Offline Detection Queue - Memory Safe Design
// ===========================
#define MAX_CAM_QUEUE 10  // 10 events max (~80 bytes total)
struct CamDetection {
    uint32_t timestamp;       // 4 bytes (millis/1000 as pseudo-timestamp)
    int16_t birdSize;         // 2 bytes
    int8_t confidence;        // 1 byte
    uint8_t flags;            // 1 byte - bit 0: notified
};  // 8 bytes per event
CamDetection camQueue[MAX_CAM_QUEUE];
uint8_t camQueueHead = 0;
uint8_t camQueueTail = 0;
uint8_t camQueueCount = 0;

// Frame Buffer for Motion Detection
camera_fb_t *currentFrame = NULL;  // Temporary frame buffer (returned immediately after use)
uint8_t *prevGrayBuffer = NULL;    // Previous frame grayscale data for comparison
uint8_t *currGrayBuffer = NULL;    // Current frame grayscale data
const int GRAY_BUFFER_SIZE = 320 * 240;  // QVGA resolution (320x240 pixels)

// Detection Zone (default: upper 60% of frame)
int detectionZoneTop = 0;
int detectionZoneBottom = 144;  // 60% of 240 pixels
int detectionZoneLeft = 0;
int detectionZoneRight = 320;

// Camera Settings
int cameraResolution = FRAMESIZE_QVGA;  // Default QVGA for detection
int cameraBrightness = 0;   // -2 to 2
int cameraContrast = 0;     // -2 to 2

// HTTP Server
AsyncWebServer server(80);  // Camera on port 80

// ===========================
// Camera Functions
// ===========================

void setupCamera() {
  Serial.println("🔍 Checking PSRAM status:");
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;  // Grayscale for motion detection (1 byte/pixel)

  // Frame size and quality - Use DRAM instead of PSRAM
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;  // Not used for grayscale, but keep for compatibility
  config.fb_count = 1;       // Only 1 buffer (we return it immediately after use)
  config.fb_location = CAMERA_FB_IN_DRAM;  // Use internal RAM
  config.grab_mode = CAMERA_GRAB_LATEST;

  Serial.println("📷 Camera config: QVGA Grayscale, 1 buffer in DRAM");

  // Camera init with error handling
  Serial.println("🔧 Initializing camera...");
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }

  Serial.println("✅ Camera initialized successfully!");
  Serial.printf("💾 Remaining heap: %d bytes\n", ESP.getFreeHeap());

  // Test camera by taking a frame
  Serial.println("📸 Testing camera capture...");
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("✅ Camera test successful! Frame size: %d bytes\n", fb->len);
    esp_camera_fb_return(fb);
  } else {
    Serial.println("⚠️  Camera test failed - could not capture frame");
  }
}

// ===========================
// ImageBB Upload Functions
// ===========================

String urlEncode(String str) {
  String encoded = "";
  char c;
  char code0;
  char code1;

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

String uploadViaMainBoard(camera_fb_t *fb) {
  if (!fb) {
    Serial.println("❌ No frame buffer to upload");
    return "";
  }

  Serial.println("📤 Uploading image via Main Board proxy...");
  Serial.printf("📊 Raw image size: %d bytes (format: %d)\n", fb->len, fb->format);

  // Convert grayscale frame to JPEG
  uint8_t *jpg_buf = NULL;
  size_t jpg_len = 0;

  if (fb->format == PIXFORMAT_GRAYSCALE) {
    Serial.println("🔧 Converting grayscale to JPEG...");
    bool converted = frame2jpg(fb, 40, &jpg_buf, &jpg_len);  // 40% quality (reduced from 60% for smaller payloads)

    if (!converted || !jpg_buf) {
      Serial.println("❌ Failed to convert grayscale to JPEG");
      return "";
    }
    Serial.printf("✅ JPEG conversion successful: %d bytes\n", jpg_len);
  } else {
    jpg_buf = fb->buf;
    jpg_len = fb->len;
  }

  // Convert JPEG to base64
  String base64Image = base64::encode(jpg_buf, jpg_len);
  Serial.printf("📊 Base64 size: %d bytes\n", base64Image.length());

  // Build JSON payload for Main Board
  DynamicJsonDocument doc(base64Image.length() + 256);
  doc["deviceId"] = "camera_001";
  doc["imageData"] = base64Image;
  doc["format"] = "jpeg";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Free JPEG buffer if we allocated it
  if (fb->format == PIXFORMAT_GRAYSCALE && jpg_buf) {
    free(jpg_buf);
  }

  // Send to Main Board
  Serial.printf("💾 Free heap before HTTP: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📡 Payload size: %d bytes\n", jsonPayload.length());

  HTTPClient http;
  String mainBoardUrl = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/upload-image";
  http.begin(mainBoardUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(40000);  // 40 second timeout (Main Board needs time to process and upload to ImageBB)

  Serial.println("🌐 Sending to Main Board...");
  int httpResponseCode = http.POST(jsonPayload);
  Serial.printf("📊 Response code: %d\n", httpResponseCode);

  String imageUrl = "";

  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("📥 Main Board response received");

    // Parse JSON response from Main Board
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      if (responseDoc["status"] == "ok") {
        imageUrl = responseDoc["imageUrl"].as<String>();
        Serial.println("✅ Upload successful!");
        Serial.println("🔗 Image URL: " + imageUrl);

        // Cache URL and timestamp
        lastImageUrl = imageUrl;
        lastUploadTime = millis();
      } else {
        String errorMsg = responseDoc["message"] | "Unknown error";
        Serial.println("❌ Main Board upload failed: " + errorMsg);
      }
    } else {
      Serial.println("❌ JSON parsing failed");
      Serial.println("Response: " + response.substring(0, 200));
    }
  } else {
    Serial.printf("❌ Main Board request failed: %d\n", httpResponseCode);
  }

  http.end();
  return imageUrl;
}

// ===========================
// Upload Statistics & Rate Limiting
// ===========================

void checkAndResetDailyCounter() {
  unsigned long now = millis();

  // Reset counter every 24 hours
  if (now - lastResetTime > DAY_MS) {
    Serial.println("📊 Resetting daily upload counter");
    Serial.printf("Yesterday's stats - Total: %d | Detection: %d | Manual: %d\n",
                  uploadsToday, detectionUploads, manualUploads);

    uploadsToday = 0;
    detectionUploads = 0;
    manualUploads = 0;
    lastResetTime = now;
  }
}

bool canUpload() {
  checkAndResetDailyCounter();

  if (uploadsToday >= DAILY_UPLOAD_LIMIT) {
    Serial.printf("⚠️  Daily upload limit reached (%d/%d)\n", uploadsToday, DAILY_UPLOAD_LIMIT);
    return false;
  }

  return true;
}

void recordUpload(bool isDetection) {
  uploadsToday++;
  if (isDetection) {
    detectionUploads++;
  } else {
    manualUploads++;
  }

  Serial.printf("📊 Upload stats - Today: %d/%d | Detection: %d | Manual: %d\n",
                uploadsToday, DAILY_UPLOAD_LIMIT, detectionUploads, manualUploads);
}

// ===========================
// Main Board Communication
// ===========================

bool notifyMainBoard(String imageUrl, int birdSize, int confidence) {
  Serial.println("📡 Notifying Main Board...");
  Serial.printf("🔗 Target URL: http://%s:%d/bird_detected\n", MAIN_BOARD_IP, MAIN_BOARD_PORT);

  HTTPClient http;
  String url = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/bird_detected";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout

  // Build JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = CAMERA_DEVICE_ID;
  doc["timestamp"] = millis();
  doc["imageUrl"] = imageUrl;
  doc["birdSize"] = birdSize;
  doc["confidence"] = confidence;
  doc["detectionZone"] = String(detectionZoneLeft) + "," + String(detectionZoneTop) + "," +
                         String(detectionZoneRight) + "," + String(detectionZoneBottom);
  doc["detected"] = (birdSize > 0);  // True if bird, false if stream update

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("📦 Payload: " + jsonString);

  // Send POST request
  int httpResponseCode = http.POST(jsonString);

  bool success = false;
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Main Board responded: %d\n", httpResponseCode);
    Serial.println("📥 Response: " + response);
    success = true;
  } else {
    Serial.printf("❌ Failed to contact Main Board: %d\n", httpResponseCode);
  }

  http.end();
  return success;
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

// Check if main board is reachable on local network
bool checkMainBoardReachable() {
    if (WiFi.status() != WL_CONNECTED) {
        mainBoardReachable = false;
        return false;
    }

    HTTPClient http;
    String url = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/status";
    http.begin(url);
    http.setTimeout(3000);  // 3 second timeout
    int httpCode = http.GET();
    http.end();

    mainBoardReachable = (httpCode == 200);

    if (mainBoardReachable) {
        Serial.printf("✅ Main board reachable at %s\n", MAIN_BOARD_IP);
    } else {
        Serial.printf("⚠️ Main board not reachable (code: %d)\n", httpCode);
    }

    return mainBoardReachable;
}

// Queue detection event when main board unreachable
bool queueCamDetection(int birdSize, int confidence) {
    if (camQueueCount >= MAX_CAM_QUEUE) {
        // Queue full - overwrite oldest
        camQueueTail = (camQueueTail + 1) % MAX_CAM_QUEUE;
        camQueueCount--;
        Serial.println("🐦 Cam queue full - dropping oldest");
    }

    CamDetection* event = &camQueue[camQueueHead];
    event->timestamp = (uint32_t)(millis() / 1000);  // Pseudo-timestamp (seconds since boot)
    event->birdSize = (int16_t)birdSize;
    event->confidence = (int8_t)confidence;
    event->flags = 0;  // Not notified

    camQueueHead = (camQueueHead + 1) % MAX_CAM_QUEUE;
    camQueueCount++;

    Serial.printf("🐦 Detection queued (%d/%d)\n", camQueueCount, MAX_CAM_QUEUE);
    return true;
}

// Sync queued detections to main board
bool syncCamQueue() {
    if (!mainBoardReachable || camQueueCount == 0) return false;

    Serial.printf("📤 Syncing %d queued detections to main board...\n", camQueueCount);
    int synced = 0;

    while (camQueueCount > 0) {
        CamDetection* event = &camQueue[camQueueTail];

        // Notify main board (with empty image URL for queued events)
        if (notifyMainBoard("", event->birdSize, event->confidence)) {
            synced++;
            camQueueTail = (camQueueTail + 1) % MAX_CAM_QUEUE;
            camQueueCount--;
        } else {
            Serial.println("❌ Sync failed, will retry later");
            break;
        }

        delay(100);  // Rate limit
    }

    Serial.printf("✅ Synced %d detections, %d remaining\n", synced, camQueueCount);
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
            mainBoardReachable = false;
        }
        return;
    }

    // If disconnected, try to reconnect periodically
    if (wifiState == WIFI_DISCONNECTED) {
        if (now - lastWiFiReconnectAttempt > WIFI_RECONNECT_INTERVAL) {
            lastWiFiReconnectAttempt = now;

            Serial.println("📶 Attempting WiFi reconnection...");
            if (tryConnectWiFi(WIFI_RECONNECT_TIMEOUT)) {
                // WiFi connected, check main board
                if (checkMainBoardReachable()) {
                    // Sync any queued detections
                    syncCamQueue();
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

// ===========================
// Bird Detection Functions
// ===========================

void setupBirdDetection() {
  // Allocate memory for grayscale buffers
  prevGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
  currGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);

  if (!prevGrayBuffer || !currGrayBuffer) {
    Serial.println("❌ Failed to allocate memory for bird detection");
    birdDetectionEnabled = false;
    return;
  }

  Serial.println("✅ Bird detection initialized");
  Serial.printf("💾 Free heap after detection buffers: %d bytes\n", ESP.getFreeHeap());
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  if (fb->format == PIXFORMAT_GRAYSCALE) {
    // Already grayscale! Just copy directly (1 byte per pixel)
    memcpy(grayBuffer, fb->buf, fb->len);
  } else if (fb->format == PIXFORMAT_RGB565) {
    // Convert RGB565 to grayscale for motion detection
    // RGB565: RRRRR GGGGGG BBBBB (16 bits per pixel)
    for (int i = 0; i < fb->len; i += 2) {
      // Read RGB565 pixel (little endian)
      uint16_t pixel = (fb->buf[i+1] << 8) | fb->buf[i];

      // Extract RGB components and expand to 8 bits
      uint8_t r = (pixel >> 11) << 3;        // 5 bits -> 8 bits
      uint8_t g = ((pixel >> 5) & 0x3F) << 2; // 6 bits -> 8 bits
      uint8_t b = (pixel & 0x1F) << 3;       // 5 bits -> 8 bits

      // Convert to grayscale using standard weights
      grayBuffer[i/2] = (uint8_t)(r * 0.299 + g * 0.587 + b * 0.114);
    }
  } else {
    // For other formats, log warning
    Serial.println("⚠️  Unsupported pixel format for motion detection");
  }
}

bool detectBirdMotion() {
  if (!birdDetectionEnabled) return false;

  // Capture current frame
  currentFrame = esp_camera_fb_get();
  if (!currentFrame) {
    Serial.println("❌ Failed to capture frame for detection");
    return false;
  }

  // Convert to grayscale
  convertToGrayscale(currentFrame, currGrayBuffer);

  bool birdDetected = false;
  static bool hasFirstFrame = false;

  // If we have a previous frame buffer (grayscale data), perform motion detection
  if (hasFirstFrame) {
    int changedPixels = 0;
    int totalPixels = 0;

    // Compare frames within detection zone
    for (int y = detectionZoneTop; y < detectionZoneBottom; y++) {
      for (int x = detectionZoneLeft; x < detectionZoneRight; x++) {
        int index = y * 320 + x;
        if (index < GRAY_BUFFER_SIZE) {
          int diff = abs(currGrayBuffer[index] - prevGrayBuffer[index]);
          if (diff > detectionThreshold) {
            changedPixels++;
          }
          totalPixels++;
        }
      }
    }

    // Check if motion indicates a bird
    if (changedPixels > minBirdSize && changedPixels < maxBirdSize) {
      unsigned long now = millis();
      if (now - lastDetectionTime > DETECTION_COOLDOWN) {
        birdDetected = true;
        lastDetectionTime = now;

        int confidence = map(changedPixels, minBirdSize, maxBirdSize, 50, 95);
        Serial.printf("🐦 BIRD DETECTED! Size: %d pixels, Confidence: %d%%\n", changedPixels, confidence);

        // Check if we can upload (rate limit check)
        String imageUrl = "";

        #if ENABLE_IMGBB_UPLOAD
        if (canUpload()) {
          // Upload image to ImageBB (uses currentFrame before we return it)
          imageUrl = uploadViaMainBoard(currentFrame);

          if (imageUrl.length() > 0) {
            recordUpload(true);  // Record as detection upload
            birdsDetectedToday++;
          }
        } else {
          Serial.println("⚠️  Daily upload limit reached, skipping ImageBB upload");
        }
        #else
        Serial.println("📸 ImgBB upload disabled - detection only mode");
        birdsDetectedToday++;  // Count locally even without upload
        #endif

        // Notify main board if reachable, otherwise queue for later
        if (mainBoardReachable && wifiState == WIFI_CONNECTED) {
          if (!notifyMainBoard(imageUrl, changedPixels, confidence)) {
            // Notification failed - queue it
            Serial.println("📦 Main board notification failed - queuing...");
            queueCamDetection(changedPixels, confidence);
            mainBoardReachable = false;  // Mark as unreachable
          }
        } else {
          // Offline - queue detection for later sync
          Serial.println("📦 Offline - queuing bird detection...");
          queueCamDetection(changedPixels, confidence);
        }
      }
    }
  }

  // ✅ CRITICAL FIX: Return frame buffer immediately after use
  // We only need the grayscale data in currGrayBuffer, not the frame buffer itself
  esp_camera_fb_return(currentFrame);
  currentFrame = NULL;

  // Copy current gray buffer to previous for next iteration comparison
  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);
  hasFirstFrame = true;  // Mark that we now have data in prevGrayBuffer

  return birdDetected;
}

// ===========================
// Camera Settings Application
// ===========================

void applyCameraSettings() {
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, cameraBrightness);
    s->set_contrast(s, cameraContrast);
    s->set_framesize(s, (framesize_t)cameraResolution);
    Serial.println("✅ Camera settings applied");
  }
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("📷 BantayBot Camera Board with ImageBB - Starting...");

  // Print initial memory status
  Serial.println("🔍 Initial memory status:");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

  // Setup camera
  setupCamera();

  // Setup bird detection
  setupBirdDetection();

  // Connect to WiFi (non-blocking with timeout)
  Serial.println("📶 Attempting initial WiFi connection (30s timeout)...");
  bool wifiConnected = tryConnectWiFi(WIFI_CONNECT_TIMEOUT);

  if (wifiConnected) {
    // Test internet connectivity
    Serial.println("🌐 Testing internet connectivity...");
    HTTPClient http;
    http.begin("http://www.google.com");
    http.setTimeout(5000);
    int testCode = http.GET();
    http.end();

    if (testCode > 0) {
      Serial.printf("✅ Internet accessible (HTTP %d)\n", testCode);
      wifiState = WIFI_CONNECTED;
    } else {
      Serial.printf("⚠️ No internet (code: %d) - local detection still works\n", testCode);
      wifiState = WIFI_NO_INTERNET;
    }

    // Check main board reachability
    checkMainBoardReachable();
  } else {
    Serial.println("═══════════════════════════════════════════");
    Serial.println("⚠️  OFFLINE MODE ACTIVE");
    Serial.println("═══════════════════════════════════════════");
    Serial.println("🐦 Bird detection will work locally");
    Serial.println("🔄 WiFi reconnection every 60 seconds");
    Serial.println("📦 Detections will be queued for sync");
    Serial.println("═══════════════════════════════════════════");
  }

  // HTTP endpoint for settings changes
  server.on("/settings", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println("📡 Received settings update");

      DynamicJsonDocument doc(512);
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.println("❌ JSON parsing failed");
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
      }

      // Apply settings
      if (doc.containsKey("brightness")) {
        cameraBrightness = doc["brightness"];
        Serial.printf("🔆 Brightness: %d\n", cameraBrightness);
      }
      if (doc.containsKey("contrast")) {
        cameraContrast = doc["contrast"];
        Serial.printf("🎨 Contrast: %d\n", cameraContrast);
      }
      // Note: streamInterval and streamingEnabled removed - using on-demand capture instead

      applyCameraSettings();

      request->send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Settings applied\"}");
    }
  );

  #if ENABLE_IMGBB_UPLOAD
  // On-demand capture endpoint (uploads to ImageBB)
  server.on("/capture", HTTP_GET, [](AsyncWebServerRequest *request) {
    unsigned long now = millis();

    // Check if recent upload occurred (detection or previous manual capture)
    if (now - lastUploadTime < UPLOAD_COOLDOWN && lastImageUrl.length() > 0) {
      Serial.println("📸 Recent upload detected, returning cached URL");
      int secondsAgo = (now - lastUploadTime) / 1000;
      String response = "{\"status\":\"cached\",\"imageUrl\":\"" + lastImageUrl + "\",\"message\":\"Recent image (" + String(secondsAgo) + "s ago)\",\"uploadsToday\":" + String(uploadsToday) + "}";
      request->send(200, "application/json", response);
      return;
    }

    // Check daily upload limit
    if (!canUpload()) {
      Serial.println("⚠️  Daily upload limit reached");
      String response = "{\"status\":\"error\",\"message\":\"Daily upload limit reached (" + String(uploadsToday) + "/" + String(DAILY_UPLOAD_LIMIT) + ")\",\"imageUrl\":\"" + lastImageUrl + "\"}";
      request->send(429, "application/json", response);  // 429 Too Many Requests
      return;
    }

    Serial.println("📸 Manual capture requested");

    // Capture new frame
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Manual capture failed");
      request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Camera capture failed\"}");
      return;
    }

    // Upload via Main Board proxy
    String imageUrl = uploadViaMainBoard(fb);
    esp_camera_fb_return(fb);

    if (imageUrl.length() > 0) {
      recordUpload(false);  // Record as manual upload
      Serial.println("✅ Manual capture uploaded");
      String response = "{\"status\":\"ok\",\"imageUrl\":\"" + imageUrl + "\",\"message\":\"New capture uploaded\",\"uploadsToday\":" + String(uploadsToday) + "}";
      request->send(200, "application/json", response);
    } else {
      Serial.println("❌ Upload failed");
      request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Upload failed via Main Board proxy\"}");
    }
  });
  #else
  // Disabled: ImgBB upload feature is turned off
  server.on("/capture", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(503, "application/json", "{\"status\":\"disabled\",\"message\":\"ImgBB upload feature is currently disabled\"}");
  });
  #endif

  #if ENABLE_IMGBB_UPLOAD
  // Local preview endpoint (no ImageBB upload - just returns JPEG)
  server.on("/preview", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("👁️  Local preview requested");

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      request->send(500, "text/plain", "Camera capture failed");
      return;
    }

    // Convert grayscale to JPEG if needed
    uint8_t *jpg_buf = NULL;
    size_t jpg_len = 0;

    if (fb->format == PIXFORMAT_GRAYSCALE) {
      bool converted = frame2jpg(fb, 60, &jpg_buf, &jpg_len);
      if (!converted || !jpg_buf) {
        esp_camera_fb_return(fb);
        request->send(500, "text/plain", "JPEG conversion failed");
        return;
      }

      AsyncWebServerResponse *response = request->beginResponse_P(200, "image/jpeg", jpg_buf, jpg_len);
      response->addHeader("Cache-Control", "no-cache");
      request->send(response);

      free(jpg_buf);
      esp_camera_fb_return(fb);
    } else {
      AsyncWebServerResponse *response = request->beginResponse_P(200, "image/jpeg", fb->buf, fb->len);
      response->addHeader("Cache-Control", "no-cache");
      request->send(response);
      esp_camera_fb_return(fb);
    }

    Serial.println("✅ Local preview sent (no upload)");
  });
  #else
  // Disabled: Preview feature is turned off
  server.on("/preview", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(503, "application/json", "{\"status\":\"disabled\",\"message\":\"Preview feature is currently disabled\"}");
  });
  #endif

  // Upload statistics endpoint
  server.on("/stats", HTTP_GET, [](AsyncWebServerRequest *request) {
    checkAndResetDailyCounter();

    DynamicJsonDocument doc(512);
    doc["uploadsToday"] = uploadsToday;
    doc["detectionUploads"] = detectionUploads;
    doc["manualUploads"] = manualUploads;
    doc["dailyLimit"] = DAILY_UPLOAD_LIMIT;
    doc["remainingUploads"] = DAILY_UPLOAD_LIMIT - uploadsToday;
    doc["uploadCooldown"] = UPLOAD_COOLDOWN / 1000;  // seconds
    doc["lastImageUrl"] = lastImageUrl;
    doc["birdsDetectedToday"] = birdsDetectedToday;

    unsigned long secondsSinceLastUpload = (millis() - lastUploadTime) / 1000;
    doc["secondsSinceLastUpload"] = secondsSinceLastUpload;

    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  server.begin();
  Serial.println("🌐 HTTP server started on port 80");

  // Initialize daily counter
  lastResetTime = millis();

  // Print final memory status
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 Final free PSRAM: %d bytes\n", ESP.getFreePsram());

  Serial.println("\n🚀 BantayBot Camera Board ready!");
  Serial.println("📸 Bird detection: " + String(birdDetectionEnabled ? "ENABLED" : "DISABLED"));

  #if ENABLE_IMGBB_UPLOAD
  Serial.println("🌐 ImgBB uploads: ENABLED");
  #else
  Serial.println("🌐 ImgBB uploads: DISABLED (detection-only mode)");
  #endif

  Serial.println("\n📡 Endpoints:");
  Serial.println("  🔗 Main Board: http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT));

  #if ENABLE_IMGBB_UPLOAD
  Serial.println("  📷 Capture (ImageBB): GET http://" + WiFi.localIP().toString() + "/capture");
  Serial.println("  👁️  Preview (local): GET http://" + WiFi.localIP().toString() + "/preview");
  Serial.println("  📊 Statistics: GET http://" + WiFi.localIP().toString() + "/stats");
  Serial.println("\n📊 Upload Budget: " + String(DAILY_UPLOAD_LIMIT) + " uploads/day");
  Serial.println("💡 Use /preview for quick checks (no upload), /capture for ImageBB storage");
  #else
  Serial.println("  📷 Capture: DISABLED (ImgBB uploads off)");
  Serial.println("  👁️  Preview: DISABLED (ImgBB uploads off)");
  Serial.println("  📊 Statistics: GET http://" + WiFi.localIP().toString() + "/stats");
  Serial.println("\n⚡ Performance Mode: Fast detection response (no image uploads)");
  #endif

  Serial.println("  ⚙️  Settings: POST http://" + WiFi.localIP().toString() + "/settings");
}

void loop() {
  // Handle WiFi reconnection in background (non-blocking)
  handleWiFiReconnection();

  // Periodic memory check (every 60 seconds)
  static unsigned long lastMemCheck = 0;
  unsigned long now = millis();
  if (now - lastMemCheck > 60000) {
    lastMemCheck = now;
    logMemoryStatus();
    if (ESP.getFreeHeap() < 20000) {
      Serial.println("⚠️ WARNING: Low memory!");
    }
  }

  // Bird detection (works offline - queues when main board unreachable)
  detectBirdMotion();

  // Small delay to prevent overwhelming the system
  delay(100);
}
