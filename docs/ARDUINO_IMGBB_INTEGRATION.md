# ESP32-CAM ImgBB Integration Guide

This guide shows how to modify your ESP32-CAM firmware to upload snapshots to ImgBB instead of Firebase Storage.

---

## Required Libraries

Install via Arduino Library Manager:
- ✅ Firebase-ESP-Client (already installed)
- ✅ ArduinoJson (already installed)
- ✅ HTTPClient (ESP32 built-in)
- ✅ base64 (ESP32 built-in)

---

## Step 1: Get ImgBB API Key

1. Visit https://api.imgbb.com/
2. Click "Get API Key"
3. Sign up (free, takes 1 minute)
4. Copy your API key
5. Paste it in the code below

---

## Step 2: Add ImgBB Configuration

At the top of your `BantayBot_Camera_Firebase.ino`, add:

```cpp
// ImgBB Configuration
#define IMGBB_API_KEY "YOUR_IMGBB_API_KEY_HERE"  // Get from https://api.imgbb.com/
#define IMGBB_UPLOAD_URL "https://api.imgbb.com/1/upload"
```

---

## Step 3: Add ImgBB Upload Function

Add this function after your existing functions:

```cpp
/**
 * Upload image to ImgBB and return public URL
 */
String uploadToImgBB(camera_fb_t *fb) {
  if (!fb) {
    Serial.println("❌ No framebuffer provided");
    return "";
  }

  HTTPClient http;
  http.begin(IMGBB_UPLOAD_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  http.setTimeout(15000);  // 15 second timeout

  // Convert image to base64
  String base64Image = base64::encode(fb->buf, fb->len);

  // Build POST data
  String postData = "key=" + String(IMGBB_API_KEY);
  postData += "&image=" + base64Image;
  postData += "&name=bantaybot_" + String(millis());

  Serial.println("📤 Uploading to ImgBB...");
  int httpCode = http.POST(postData);
  String imageUrl = "";

  if (httpCode == 200) {
    String response = http.getString();

    // Parse JSON response
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["success"]) {
      imageUrl = doc["data"]["url"].as<String>();
      Serial.println("✅ Uploaded to ImgBB: " + imageUrl);
    } else {
      Serial.println("❌ JSON parse error");
    }
  } else {
    Serial.printf("❌ ImgBB upload failed: HTTP %d\n", httpCode);
  }

  http.end();
  return imageUrl;
}
```

---

## Step 4: Add Function to Update Firestore with URL

```cpp
/**
 * Update Firestore with latest snapshot URL
 */
void updateSnapshotInFirestore(String imageUrl) {
  if (imageUrl.length() == 0) {
    Serial.println("⚠️ No image URL to update");
    return;
  }

  FirebaseJson json;
  json.set("latest_snapshot_url", imageUrl);
  json.set("last_snapshot_time", Firebase.getCurrentTime());
  json.set("updated_at", String(millis()));

  String documentPath = "devices/" + String(DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID,
      "", documentPath.c_str(), json.raw(), "")) {
    Serial.println("✅ Firestore updated with snapshot URL");
  } else {
    Serial.println("❌ Firestore update failed: " + fbdo.errorReason());
  }
}
```

---

## Step 5: Update Main Loop

Replace your existing loop() with:

```cpp
unsigned long lastSnapshotUpload = 0;
const unsigned long SNAPSHOT_INTERVAL = 10000;  // 10 seconds

void loop() {
  unsigned long now = millis();

  // Upload snapshot to ImgBB periodically
  if (now - lastSnapshotUpload >= SNAPSHOT_INTERVAL) {
    lastSnapshotUpload = now;

    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      String imageUrl = uploadToImgBB(fb);
      if (imageUrl.length() > 0) {
        updateSnapshotInFirestore(imageUrl);
      }
      esp_camera_fb_return(fb);
    } else {
      Serial.println("❌ Camera capture failed");
    }
  }

  // Bird detection (keep existing code)
  if (birdDetectionEnabled) {
    performBirdDetection();
  }

  // Update sensor data to Firestore (keep existing code)
  if (now - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
    lastFirebaseUpdate = now;
    uploadSensorData();  // Your existing function
  }

  // Check for commands (keep existing code)
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = now;
    checkCommands();  // Your existing function
  }

  delay(10);
}
```

---

## Step 6: Update Bird Detection

Modify your `performBirdDetection()` function to upload detection snapshots:

```cpp
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

    // Upload high-quality detection snapshot to ImgBB
    String detectionImageUrl = uploadToImgBB(fb);

    if (detectionImageUrl.length() > 0) {
      // Log to Firestore detection_history
      FirebaseJson detectionJson;
      detectionJson.set("device_id", DEVICE_ID);
      detectionJson.set("timestamp", Firebase.getCurrentTime());
      detectionJson.set("snapshot_url", detectionImageUrl);
      detectionJson.set("confidence", 0.85);
      detectionJson.set("triggered_alarm", true);
      detectionJson.set("birds_today", birdsDetectedToday);

      String collectionPath = "detection_history";
      if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID,
          "", collectionPath.c_str(), detectionJson.raw())) {
        Serial.println("✅ Detection logged to Firestore");
      }
    }
  }

  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);
  esp_camera_fb_return(fb);
}
```

---

## Complete Example Code Structure

Your final `BantayBot_Camera_Firebase.ino` should have this structure:

```cpp
// ===== Includes =====
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Firebase_ESP_Client.h>
#include <base64.h>

// ===== Configuration =====
#define IMGBB_API_KEY "your_imgbb_api_key"
#define FIREBASE_HOST "your-project.firebaseio.com"
#define API_KEY "your_firebase_api_key"
#define FIREBASE_PROJECT_ID "your-project-id"
#define DEVICE_ID "camera_001"

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ===== Global Variables =====
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSnapshotUpload = 0;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;
const unsigned long SNAPSHOT_INTERVAL = 10000;
const unsigned long FIREBASE_UPDATE_INTERVAL = 2000;
const unsigned long COMMAND_CHECK_INTERVAL = 500;

int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;

// ===== Functions =====
String uploadToImgBB(camera_fb_t *fb) { /* see above */ }
void updateSnapshotInFirestore(String imageUrl) { /* see above */ }
void setupCamera() { /* your existing code */ }
void setupFirebase() { /* your existing code */ }
void uploadSensorData() { /* your existing code */ }
void performBirdDetection() { /* see above */ }
void checkCommands() { /* your existing code */ }

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  setupCamera();
  connectWiFi();
  setupFirebase();
  // ... rest of your setup
}

// ===== Loop =====
void loop() {
  // See Step 5 above
}
```

---

## Testing

### 1. Upload and Monitor

After uploading the code:

1. Open Serial Monitor (115200 baud)
2. Look for these messages:

```
✅ WiFi connected!
✅ Firebase connected
📤 Uploading to ImgBB...
✅ Uploaded to ImgBB: https://i.ibb.co/abc123/snap.jpg
✅ Firestore updated with snapshot URL
```

### 2. Check Firestore

In Firebase Console → Firestore:

```
devices/camera_001
  ├─ latest_snapshot_url: "https://i.ibb.co/abc123/snap.jpg"
  ├─ last_snapshot_time: Timestamp
  └─ updated_at: "1234567890"
```

### 3. Check PWA

Open your BantayBot PWA:
- Dashboard should show camera snapshot
- Snapshot should update every 10 seconds
- "X seconds ago" timestamp should update

---

## Troubleshooting

### "❌ ImgBB upload failed: HTTP 400"
- Check API key is correct
- Ensure image is properly base64 encoded
- Try reducing image quality

### "❌ JSON parse error"
- Increase JSON document size: `DynamicJsonDocument doc(8192);`
- Check ImgBB response format hasn't changed

### "❌ Camera capture failed"
- Check camera initialization
- Ensure adequate power (5V 2A)
- Verify camera ribbon cable

### Uploads too slow
- Reduce image quality in camera config
- Use smaller resolution (QVGA = 320x240)
- Increase timeout: `http.setTimeout(20000);`

### Memory issues
- Free framebuffer immediately after upload
- Use `esp_camera_fb_return(fb);`
- Reduce detection buffer sizes if needed

---

## Performance Tips

### Optimize Upload Speed
```cpp
// Reduce image quality for faster uploads
config.jpeg_quality = 15;  // Lower = smaller file, faster upload
config.frame_size = FRAMESIZE_QVGA;  // 320x240 is plenty
```

### Bandwidth Usage
- QVGA @ quality 12: ~30KB per image
- 10 second interval: ~10MB per hour
- 8 hours per day: ~80MB per day
- **Monthly: ~2.4GB** (very reasonable!)

### Battery/Solar Optimization
```cpp
// Upload less frequently to save power
const unsigned long SNAPSHOT_INTERVAL = 30000;  // 30 seconds
// Monthly: ~800MB (even better!)
```

---

## What to Keep from Original Code

**DON'T change:**
- ✅ Camera pin configuration
- ✅ Firebase connection setup
- ✅ Sensor data upload (`uploadSensorData()`)
- ✅ Command processing (`checkCommands()`)
- ✅ Bird detection algorithm

**DO change:**
- 🔄 Add ImgBB upload function
- 🔄 Add Firestore URL update function
- 🔄 Modify loop to upload snapshots
- 🔄 Modify bird detection to upload to ImgBB

---

## Summary

You're essentially:
1. Keeping all your existing Firebase code
2. Adding ImgBB uploads for camera images
3. Storing ImgBB URLs in Firestore (not the images!)
4. PWA reads URLs from Firestore and displays images from ImgBB

**Result:** Zero storage costs, unlimited bandwidth, works from anywhere! 🎉

---

## Need Help?

If you encounter issues:
1. Check Serial Monitor for error messages
2. Verify ImgBB API key is correct
3. Test ImgBB API manually: https://api.imgbb.com/
4. Ensure Firestore security rules allow writes
5. Check ESP32 has stable internet connection

**Happy coding! 📷🚀**
