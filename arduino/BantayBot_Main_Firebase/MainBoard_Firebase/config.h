/**
 * BantayBot Main Board Configuration
 * ESP32 DevKit v1 Board Pin Definitions and Settings
 */

#ifndef CONFIG_H
#define CONFIG_H

// ===========================
// WiFi Configuration
// ===========================
#define WIFI_SSID "HUAWEI-E5330-6AB9"
#define WIFI_PASSWORD "16yaad0a"

// ===========================
// Firebase Configuration
// ===========================
#define FIREBASE_PROJECT_ID "bantaybot-dd590"
#define API_KEY "AIzaSyAthWHwp7HLlFCl_3Cx_nS1GZzYBDPwEd0"
#define FIREBASE_AUTH_DOMAIN "bantaybot-dd590.firebaseapp.com"

// Device IDs (must match React Native app)
#define MAIN_DEVICE_ID "main_001"
#define CAMERA_DEVICE_ID "camera_001"

// ===========================
// Pin Definitions
// ===========================

// DFPlayer Mini (MP3 Audio)
#define DFPLAYER_RX 27  // Connect to TX of DFPlayer
#define DFPLAYER_TX 26  // Connect to RX of DFPlayer

// RS485 Soil Sensor
#define RS485_RE 4      // Direction control
#define RS485_RX 17     // Serial2 RX
#define RS485_TX 16     // Serial2 TX

// Stepper Motor (Head Rotation) - Matches working hardware config
#define STEPPER_STEP_PIN 25
#define STEPPER_DIR_PIN 33
#define STEPPER_ENABLE_PIN 32

// Arm Steppers (NEMA 17 + A4988)
#define ARM1_STEP_PIN 2
#define ARM1_DIR_PIN 15
#define ARM1_ENABLE_PIN 5

#define ARM2_STEP_PIN 19
#define ARM2_DIR_PIN 18
#define ARM2_ENABLE_PIN 23

// Sensors
#define DHT_PIN 13      // DHT22 (backup sensor) - Changed from 2 to avoid conflict with ARM1_STEP_PIN
#define DHT_TYPE DHT22
#define SPEAKER_PIN 12  // Horn speaker relay

// ===========================
// Hardware Settings
// ===========================

// Stepper Motor
#define STEPS_PER_REVOLUTION 200   // Calibrated for actual head rotation

// Audio
#define TOTAL_TRACKS 7
#define DEFAULT_VOLUME 20

// ===========================
// Timing Configuration
// ===========================

// Firebase update intervals
#define FIREBASE_UPDATE_INTERVAL 30000      // 30 seconds (check interval)
#define FIREBASE_HEARTBEAT_INTERVAL 300000  // 5 minutes (force update even without changes)
#define COMMAND_CHECK_INTERVAL 500          // 500ms (keep fast for responsive commands)

// Sensor reading interval
#define SENSOR_READ_INTERVAL 10000          // 10 seconds (read sensors more frequently than Firebase writes)

// Available GPIO pins for general use:
// GPIO 0, 5, 18, 19, 23, 25, 32, 33, 34, 35, 36, 39

#endif // CONFIG_H
