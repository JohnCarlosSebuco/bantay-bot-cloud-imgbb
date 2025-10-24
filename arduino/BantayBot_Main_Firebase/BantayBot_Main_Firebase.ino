/**
 * BantayBot Main Board - ESP32 with Firebase
 *
 * Hardware: ESP32 DevKit v1
 * Features: Audio (DFPlayer), Servos (PCA9685), Stepper, RS485 Soil Sensor, PIR
 *
 * Required Libraries:
 * - Firebase-ESP-Client by Mobizt
 * - DFRobotDFPlayerMini
 * - Adafruit_PWMServoDriver
 * - Wire (built-in)
 */

#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"

// ===========================
// Firebase Configuration
// ===========================
#define FIREBASE_HOST "cloudbantaybot.firebaseio.com"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define DEVICE_ID "main_001"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===========================
// WiFi Configuration
// ===========================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ==== DFPlayer Mini ====
HardwareSerial mySerial(1);
DFRobotDFPlayerMini player;
int currentTrack = 1;
const int totalTracks = 7;
int volumeLevel = 20;
bool isPlaying = false;

// ==== Soil Sensor (RS485) ====
#define RE 4
#define RXD2 17
#define TXD2 16
const byte humi[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x84, 0x0A};
const byte temp[] = {0x01, 0x03, 0x00, 0x01, 0x00, 0x01, 0xD5, 0xCA};
const byte cond[] = {0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xCA};
const byte phph[] = {0x01, 0x03, 0x00, 0x03, 0x00, 0x01, 0x74, 0x0A};
byte values[11];

float soilHumidity = 0;
float soilTemp = 0;
int soilCond = 0;
float phValue = 7.0;

// ==== Stepper Motor ====
#define STEP_PIN 25
#define DIR_PIN 33
#define EN_PIN 32
const int STEPS_PER_LOOP = 20;
const int STEP_DELAY_US = 800;
int currentHeadAngle = 0;

// ==== PCA9685 Servos ====
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
#define SERVO_MIN 120
#define SERVO_MAX 600
#define SERVO_ARM1 0
#define SERVO_ARM2 1
int leftArmAngle = 90;
int rightArmAngle = 90;
bool servoActive = false;
int servoCycles = 0;

// ==== PIR Sensor ====
#define PIR_PIN 14
bool motionDetected = false;

// ==== Timing ====
unsigned long lastFirebaseUpdate = 0;
const unsigned long FIREBASE_UPDATE_INTERVAL = 2000;
unsigned long lastCommandCheck = 0;
const unsigned long COMMAND_CHECK_INTERVAL = 500;
unsigned long lastSoilRead = 0;
const unsigned long SOIL_INTERVAL = 2000;

void setup() {
  Serial.begin(115200);
  Serial.println("\n🤖 BantayBot Main Board (Firebase) Starting...");

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());

  // Firebase
  setupFirebase();

  // DFPlayer
  mySerial.begin(9600, SERIAL_8N1, 27, 26);
  delay(100);
  if (player.begin(mySerial)) {
    Serial.println("✅ DFPlayer online");
    player.volume(volumeLevel);
  } else {
    Serial.println("⚠️ DFPlayer failed");
  }

  // RS485
  Serial2.begin(4800, SERIAL_8N1, RXD2, TXD2);
  pinMode(RE, OUTPUT);
  digitalWrite(RE, LOW);
  Serial.println("✅ RS485 initialized");

  // Stepper
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(EN_PIN, OUTPUT);
  digitalWrite(EN_PIN, LOW);
  Serial.println("✅ Stepper initialized");

  // PCA9685
  pwm.begin();
  pwm.setPWMFreq(50);
  setServoAngle(SERVO_ARM1, leftArmAngle);
  setServoAngle(SERVO_ARM2, rightArmAngle);
  Serial.println("✅ Servos initialized");

  // PIR
  pinMode(PIR_PIN, INPUT);
  Serial.println("✅ PIR initialized");
}

void loop() {
  unsigned long now = millis();

  // Read soil sensor
  if (now - lastSoilRead >= SOIL_INTERVAL) {
    lastSoilRead = now;
    readSoilSensor();
  }

  // Read PIR
  motionDetected = digitalRead(PIR_PIN);

  // Upload to Firebase
  if (now - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
    lastFirebaseUpdate = now;
    uploadSensorData();
  }

  // Check commands
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = now;
    checkCommands();
  }

  delay(10);
}

void setupFirebase() {
  config.api_key = API_KEY;
  config.database_url = FIREBASE_HOST;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Firebase connected");
  } else {
    Serial.println("❌ Firebase failed");
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void uploadSensorData() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("device_id", DEVICE_ID);
  json.set("soil_humidity", soilHumidity);
  json.set("soil_temperature", soilTemp);
  json.set("soil_conductivity", soilCond);
  json.set("ph", phValue);
  json.set("motion_detected", motionDetected);
  json.set("head_position", currentHeadAngle);
  json.set("current_track", currentTrack);
  json.set("volume", volumeLevel);
  json.set("audio_playing", isPlaying);
  json.set("left_arm_angle", leftArmAngle);
  json.set("right_arm_angle", rightArmAngle);
  json.set("oscillating", servoActive);
  json.set("updated_at", String(millis()));

  String documentPath = "sensor_data/" + String(DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), json.raw(), "")) {
    Serial.println("✅ Data uploaded");
  } else {
    Serial.println("❌ Upload failed");
  }
}

void checkCommands() {
  // TODO: Query commands/main_001/pending collection
  // Execute commands and mark as completed
}

void readSoilSensor() {
  // Read humidity
  digitalWrite(RE, HIGH);
  delay(10);
  Serial2.write(humi, sizeof(humi));
  digitalWrite(RE, LOW);
  delay(100);
  if (Serial2.available() >= 7) {
    Serial2.readBytes(values, 7);
    soilHumidity = (values[3] << 8) | values[4];
    soilHumidity /= 10.0;
  }

  // Read temperature
  digitalWrite(RE, HIGH);
  delay(10);
  Serial2.write(temp, sizeof(temp));
  digitalWrite(RE, LOW);
  delay(100);
  if (Serial2.available() >= 7) {
    Serial2.readBytes(values, 7);
    soilTemp = (values[3] << 8) | values[4];
    soilTemp /= 10.0;
  }

  // Read conductivity
  digitalWrite(RE, HIGH);
  delay(10);
  Serial2.write(cond, sizeof(cond));
  digitalWrite(RE, LOW);
  delay(100);
  if (Serial2.available() >= 7) {
    Serial2.readBytes(values, 7);
    soilCond = (values[3] << 8) | values[4];
  }

  // Read pH
  digitalWrite(RE, HIGH);
  delay(10);
  Serial2.write(phph, sizeof(phph));
  digitalWrite(RE, LOW);
  delay(100);
  if (Serial2.available() >= 7) {
    Serial2.readBytes(values, 7);
    phValue = (values[3] << 8) | values[4];
    phValue /= 10.0;
  }
}

void rotateStepper(int steps, bool clockwise) {
  digitalWrite(DIR_PIN, clockwise ? HIGH : LOW);
  for (int i = 0; i < abs(steps); i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY_US);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY_US);
  }
}

void setServoAngle(int channel, int angle) {
  int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
  pwm.setPWM(channel, 0, pulse);
}
