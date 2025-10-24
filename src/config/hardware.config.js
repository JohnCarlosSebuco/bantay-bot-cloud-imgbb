/**
 * BantayBot Hardware Configuration
 *
 * This file contains all hardware specifications, pin mappings,
 * sensor thresholds, and constants used by both Arduino firmware
 * and the web application.
 *
 * DO NOT modify unless hardware setup changes!
 */

// ===========================
// ESP32-CAM Pin Configuration
// ===========================
export const CAMERA_PINS = {
  // Camera module pins (AI-Thinker ESP32-CAM)
  Y2_GPIO_NUM: 5,
  Y3_GPIO_NUM: 18,
  Y4_GPIO_NUM: 19,
  Y5_GPIO_NUM: 21,
  Y6_GPIO_NUM: 36,
  Y7_GPIO_NUM: 39,
  Y8_GPIO_NUM: 34,
  Y9_GPIO_NUM: 35,
  XCLK_GPIO_NUM: 0,
  PCLK_GPIO_NUM: 22,
  VSYNC_GPIO_NUM: 25,
  HREF_GPIO_NUM: 23,
  SIOD_GPIO_NUM: 26,  // SDA
  SIOC_GPIO_NUM: 27,  // SCL
  PWDN_GPIO_NUM: 32,
  RESET_GPIO_NUM: -1, // Not used

  // Camera settings
  DEFAULT_FRAME_SIZE: 'QVGA',  // 320x240
  DEFAULT_QUALITY: 12,
  STREAM_PORT: 80,
};

// ===========================
// ImgBB Configuration (Camera Snapshots)
// ===========================
export const IMGBB_CONFIG = {
  API_KEY: '20460a2ad6db9bb546648b430930c94a',  // Get from https://api.imgbb.com/
  UPLOAD_URL: 'https://api.imgbb.com/1/upload',
  SNAPSHOT_INTERVAL: 10000,  // 10 seconds between uploads
  DETECTION_QUALITY: 12,     // JPEG quality for normal snapshots (1-100)
  DETECTION_HIGH_QUALITY: 8, // JPEG quality for bird detection snapshots
};

// ===========================
// ESP32 Main Board Pin Configuration
// ===========================
export const MAIN_BOARD_PINS = {
  // DFPlayer Mini (Audio)
  DFPLAYER_RX: 27,  // Connect to DFPlayer TX
  DFPLAYER_TX: 26,  // Connect to DFPlayer RX
  DFPLAYER_SERIAL: 1,  // HardwareSerial(1)

  // RS485 Soil Sensor (Modbus)
  RS485_RX: 17,  // Connect to MAX485 RO
  RS485_TX: 16,  // Connect to MAX485 DI
  RS485_RE: 4,   // MAX485 DE/RE control pin
  RS485_SERIAL: 2,  // Serial2
  RS485_BAUD: 4800,
  RS485_SLAVE_ID: 0x01,

  // Stepper Motor (TMC2225/A4988/DRV8825)
  STEPPER_STEP: 25,
  STEPPER_DIR: 33,
  STEPPER_EN: 32,

  // PCA9685 Servo Driver (I2C)
  I2C_SDA: 21,  // Default ESP32 I2C SDA
  I2C_SCL: 22,  // Default ESP32 I2C SCL
  PCA9685_ADDRESS: 0x40,
  SERVO_ARM_LEFT: 0,   // PCA9685 channel 0
  SERVO_ARM_RIGHT: 1,  // PCA9685 channel 1

  // PIR Motion Sensor
  PIR_PIN: 14,

  // HTTP Server
  HTTP_PORT: 81,
};

// ===========================
// Audio Configuration (DFPlayer)
// ===========================
export const AUDIO_CONFIG = {
  TOTAL_TRACKS: 7,
  SKIP_TRACK: 3,  // Track 3 is not used
  MIN_VOLUME: 0,
  MAX_VOLUME: 30,
  DEFAULT_VOLUME: 20,
};

// ===========================
// Stepper Motor Configuration
// ===========================
export const STEPPER_CONFIG = {
  MIN_ANGLE: -180,
  MAX_ANGLE: 180,
  DEFAULT_STEP: 45,
  STEPS_PER_LOOP: 20,
  STEP_DELAY_US: 800,
  MAX_SPEED: 1000,  // Steps per second
  ACCELERATION: 500,
};

// ===========================
// Servo Configuration (Arms)
// ===========================
export const SERVO_CONFIG = {
  MIN_ANGLE: 0,
  MAX_ANGLE: 180,
  DEFAULT_ANGLE: 90,
  OSCILLATION_CYCLES: 6,
  OSCILLATION_INTERVAL: 30,  // milliseconds
  PWM_MIN: 120,  // PCA9685 pulse length
  PWM_MAX: 600,  // PCA9685 pulse length
};

// ===========================
// PIR Motion Sensor Configuration
// ===========================
export const PIR_CONFIG = {
  MOTION_TIMEOUT: 120000,  // 2 minutes
  MOTION_COOLDOWN: 30000,  // 30 seconds
};

// ===========================
// Bird Detection Configuration
// ===========================
export const DETECTION_CONFIG = {
  ENABLED_BY_DEFAULT: true,
  DEFAULT_SENSITIVITY: 2,  // 1=Low, 2=Medium, 3=High
  DEFAULT_THRESHOLD: 25,
  MIN_BIRD_SIZE: 1000,    // pixels
  MAX_BIRD_SIZE: 30000,   // pixels
  COOLDOWN: 10000,        // 10 seconds between detections
  DETECTION_ZONE_TOP: 0,
  DETECTION_ZONE_BOTTOM: 240,
  DETECTION_ZONE_LEFT: 0,
  DETECTION_ZONE_RIGHT: 320,
};

// ===========================
// Sensor Thresholds (RS485 Soil Sensor)
// ===========================
export const SENSOR_THRESHOLDS = {
  // Soil Humidity (%)
  SOIL_HUMIDITY_LOW: 40,      // Below 40% = Dry
  SOIL_HUMIDITY_OPTIMAL: 70,  // 40-70% = Optimal
  // Above 70% = Wet

  // Soil Temperature (°C)
  SOIL_TEMP_LOW: 20,          // Below 20°C = Cold
  SOIL_TEMP_OPTIMAL: 30,      // 20-30°C = Good
  // Above 30°C = Hot

  // Soil Conductivity (µS/cm)
  SOIL_CONDUCTIVITY_LOW: 200,     // Below 200 = Low nutrients
  SOIL_CONDUCTIVITY_OPTIMAL: 2000, // 200-2000 = Optimal
  // Above 2000 = High nutrients (oversaturated)

  // Soil pH (pH scale)
  SOIL_PH_LOW: 5.5,           // Below 5.5 = Too acidic
  SOIL_PH_OPTIMAL: 7.5,       // 5.5-7.5 = Balanced
  // Above 7.5 = Too alkaline

  // Air Temperature (DHT22 backup if available - °C)
  AIR_TEMP_HIGH: 35,
  AIR_TEMP_LOW: 10,

  // Air Humidity (DHT22 backup - %)
  AIR_HUMIDITY_HIGH: 80,
  AIR_HUMIDITY_LOW: 30,
};

// ===========================
// Crop Database
// ===========================
export const CROP_DATABASE = {
  tomato: {
    name: 'Tomato',
    nameTl: 'Kamatis',
    icon: '🍅',
    baseTemp: 10,
    requiredGDD: 2200,
    optimalTempMin: 18,
    optimalTempMax: 28,
    optimalMoistureMin: 40,
    optimalMoistureMax: 70,
    optimalPHMin: 6.0,
    optimalPHMax: 7.0,
    growthDays: 70,
    waterNeedLow: 25,
    waterNeedHigh: 50,
  },
  rice: {
    name: 'Rice',
    nameTl: 'Palay',
    icon: '🌾',
    baseTemp: 10,
    requiredGDD: 3000,
    optimalTempMin: 20,
    optimalTempMax: 35,
    optimalMoistureMin: 60,
    optimalMoistureMax: 90,
    optimalPHMin: 5.5,
    optimalPHMax: 6.5,
    growthDays: 120,
    waterNeedLow: 100,
    waterNeedHigh: 150,
  },
  corn: {
    name: 'Corn',
    nameTl: 'Mais',
    icon: '🌽',
    baseTemp: 10,
    requiredGDD: 2700,
    optimalTempMin: 18,
    optimalTempMax: 32,
    optimalMoistureMin: 50,
    optimalMoistureMax: 80,
    optimalPHMin: 5.5,
    optimalPHMax: 7.5,
    growthDays: 90,
    waterNeedLow: 40,
    waterNeedHigh: 60,
  },
  eggplant: {
    name: 'Eggplant',
    nameTl: 'Talong',
    icon: '🍆',
    baseTemp: 15,
    requiredGDD: 1800,
    optimalTempMin: 21,
    optimalTempMax: 30,
    optimalMoistureMin: 45,
    optimalMoistureMax: 75,
    optimalPHMin: 5.5,
    optimalPHMax: 6.5,
    growthDays: 80,
    waterNeedLow: 30,
    waterNeedHigh: 45,
  },
  default: {
    name: 'General Crop',
    nameTl: 'Pangkalahatang Pananim',
    icon: '🌱',
    baseTemp: 10,
    requiredGDD: 2000,
    optimalTempMin: 15,
    optimalTempMax: 30,
    optimalMoistureMin: 40,
    optimalMoistureMax: 70,
    optimalPHMin: 5.5,
    optimalPHMax: 7.5,
    growthDays: 90,
    waterNeedLow: 30,
    waterNeedHigh: 50,
  }
};

// ===========================
// Device Configuration
// ===========================
export const DEVICE_CONFIG = {
  CAMERA_DEVICE_ID: 'camera_001',
  MAIN_DEVICE_ID: 'main_001',

  // mDNS hostnames (for local network discovery)
  CAMERA_MDNS: 'bantaybot-camera.local',
  MAIN_MDNS: 'bantaybot-main.local',

  // WiFi AP mode settings
  CAMERA_AP_SSID: 'BantayBot-Camera-Setup',
  MAIN_AP_SSID: 'BantayBot-Main-Setup',
  AP_PASSWORD: 'bantaybot123',

  // Update intervals
  SENSOR_UPDATE_INTERVAL: 2000,  // 2 seconds
  COMMAND_POLL_INTERVAL: 500,    // 500ms
  CONNECTION_TEST_INTERVAL: 30000,  // 30 seconds
};

// ===========================
// Firebase Collections
// ===========================
export const FIREBASE_COLLECTIONS = {
  DEVICES: 'devices',
  SENSOR_DATA: 'sensor_data',
  COMMANDS: 'commands',
  DETECTION_HISTORY: 'detection_history',
  HARVEST_DATA: 'harvest_data',
  RAINFALL_LOG: 'rainfall_log',
  SETTINGS: 'settings',
};

// ===========================
// Command Types
// ===========================
export const COMMAND_TYPES = {
  // Audio commands
  PLAY_AUDIO: 'play_audio',
  STOP_AUDIO: 'stop_audio',
  NEXT_TRACK: 'next_track',
  PREV_TRACK: 'prev_track',
  SET_VOLUME: 'set_volume',
  SET_TRACK: 'set_track',

  // Motor commands
  ROTATE_HEAD: 'rotate_head',
  ROTATE_LEFT: 'rotate_left',
  ROTATE_RIGHT: 'rotate_right',
  ROTATE_CENTER: 'rotate_center',

  // Servo commands
  MOVE_SERVO: 'move_servo',
  OSCILLATE_ARMS: 'oscillate_arms',
  STOP_OSCILLATE: 'stop_oscillate',
  ARMS_REST: 'arms_rest',
  ARMS_ALERT: 'arms_alert',
  ARMS_WAVE: 'arms_wave',

  // Camera commands
  SET_BRIGHTNESS: 'set_brightness',
  SET_CONTRAST: 'set_contrast',
  SET_RESOLUTION: 'set_resolution',
  TOGGLE_GRAYSCALE: 'toggle_grayscale',

  // Detection commands
  ENABLE_DETECTION: 'enable_detection',
  DISABLE_DETECTION: 'disable_detection',
  SET_SENSITIVITY: 'set_sensitivity',

  // System commands
  RESTART: 'restart',
  TRIGGER_ALARM: 'trigger_alarm',
};

// ===========================
// App Configuration
// ===========================
export const APP_CONFIG = {
  DEFAULT_LANGUAGE: 'tl',  // Tagalog
  DEFAULT_THEME: 'light',
  MAX_DETECTION_HISTORY: 100,
  MAX_ENVIRONMENTAL_HISTORY_DAYS: 90,
  MAX_RAINFALL_LOG_DAYS: 90,
  REFRESH_INTERVAL: 1000,  // 1 second for real-time updates
};

export default {
  CAMERA_PINS,
  IMGBB_CONFIG,
  MAIN_BOARD_PINS,
  AUDIO_CONFIG,
  STEPPER_CONFIG,
  SERVO_CONFIG,
  PIR_CONFIG,
  DETECTION_CONFIG,
  SENSOR_THRESHOLDS,
  CROP_DATABASE,
  DEVICE_CONFIG,
  FIREBASE_COLLECTIONS,
  COMMAND_TYPES,
  APP_CONFIG,
};
