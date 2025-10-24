# 🤖 BantayBot PWA - Smart Crop Protection System

**Progressive Web App with Firebase Cloud Integration**

A modern, cloud-based crop protection system that works anywhere, on any device. No installation required - just scan a QR code and start monitoring your farm!

---

## ✨ Key Features

### 🌐 **Cloud-Based Architecture**
- Works from anywhere - phone and Arduino can be on different networks
- Zero configuration - automatic device discovery via Firebase
- Instant updates - push fixes to all users immediately
- Multi-device support - access from phone, tablet, or desktop

### 📱 **Progressive Web App Benefits**
- ✅ No app store installation
- ✅ Works on any device (Android, iOS, Windows, Mac)
- ✅ Automatic updates
- ✅ Add to home screen for native app feel
- ✅ Works offline with cached data
- ✅ Small size (~5-10MB cached vs 100MB+ native app)

### 🚜 **Complete Farming Features**
- 📹 Live camera streaming (hybrid: direct or cloud snapshots)
- 🐦 Automatic bird detection with alarm
- 🌱 RS485 soil sensor monitoring (pH, humidity, temp, conductivity)
- 🔊 7-track audio deterrent system
- 🦾 Servo arm controls
- ↻ 180° head rotation
- 📊 Harvest prediction & crop analytics
- 💧 Rainfall tracking
- 📈 Bird activity analysis

### 🌍 **Multi-Language Support**
- 🇬🇧 English
- 🇵🇭 Tagalog

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Firebase Cloud (Free Tier)        │
│  ┌──────────┐  ┌─────────┐  ┌────────────┐│
│  │Firestore │  │ Storage │  │  Hosting   ││
│  │Real-time │  │ Camera  │  │   PWA      ││
│  │ Database │  │ Snaps   │  │   Serve    ││
│  └──────────┘  └─────────┘  └────────────┘│
└─────────────────────────────────────────────┘
         ↑                           ↑
         │ HTTPS (ESP32)             │ HTTPS (Browser)
         │                           │
    ┌────────┐                  ┌──────────┐
    │ ESP32  │                  │ Any      │
    │ Camera │                  │ Device   │
    │  +     │                  │ Browser  │
    │ Main   │                  │          │
    │ Board  │                  │ 📱💻🖥️   │
    └────────┘                  └──────────┘
  (Farm WiFi)                 (Anywhere!)
```

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Installation](#-installation)
3. [Firebase Setup](#-firebase-setup)
4. [ImgBB Setup](#-imgbb-setup-camera-snapshots)
5. [Arduino Setup](#-arduino-setup)
6. [Development](#-development)
7. [Deployment](#-deployment)
8. [Hardware Configuration](#-hardware-configuration)
9. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### For Users (Farmers)

1. **Open Browser**: On any device (phone/tablet/computer)
2. **Visit URL**: `https://bantaybot-pwa.web.app` (or your deployed URL)
3. **Add to Home Screen**: Tap browser menu → "Add to Home Screen"
4. **Done!** App works like a native app

### For Developers

```bash
# 1. Clone/navigate to PWA folder
cd bantaybot-pwa

# 2. Install dependencies
npm install

# 3. Configure Firebase (see Firebase Setup below)
# Edit src/config/firebase.config.js

# 4. Start development server
npm run dev

# 5. Open browser
# Visit http://localhost:3000
```

---

## 📦 Installation

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Firebase account** (free tier) - [console.firebase.google.com](https://console.firebase.google.com)
- **Two ESP32 boards** (1 ESP32-CAM + 1 ESP32 DevKit)

### Step 1: Install Dependencies

```bash
cd bantaybot-pwa
npm install
```

This installs:
- React 18 (UI framework)
- Vite (build tool)
- Firebase SDK (cloud backend)
- React Router (navigation)
- Recharts (analytics charts)
- Tailwind CSS (styling)
- PWA plugin (offline support)

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `bantaybot-pwa` (or your choice)
4. Disable Google Analytics (optional for MVP)
5. Click "Create project"

### 2. Enable Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click "Create database"
3. Start in **production mode**
4. Choose location closest to you (e.g., `asia-southeast1`)
5. Click "Enable"

### 3. Set Security Rules

In Firestore Console, go to **Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Simplified for MVP
    }
  }
}
```

Click **Publish**.

### 4. Get Firebase Config

1. In Project Overview, click **⚙️ → Project settings**
2. Scroll to "Your apps"
3. Click **</> (Web)** icon
4. Register app: `BantayBot PWA`
5. Copy the `firebaseConfig` object

### 5. Update Config File

Edit `src/config/firebase.config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Paste your values here
  authDomain: "bantaybot-pwa.firebaseapp.com",
  projectId: "bantaybot-pwa",
  storageBucket: "bantaybot-pwa.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123",
};
```

### 6. Enable Firebase Hosting (for deployment)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting

# Choose:
# - Use existing project: bantaybot-pwa
# - Public directory: dist
# - Single-page app: Yes
# - GitHub deploys: No
```

---

## 📸 ImgBB Setup (Camera Snapshots)

BantayBot uses **ImgBB** for camera snapshot hosting - completely FREE with unlimited uploads!

### Why ImgBB?

- ✅ **Zero cost forever** - no storage limits or bandwidth fees
- ✅ **Unlimited uploads** - no daily/monthly caps
- ✅ **Fast CDN delivery** - images load quickly worldwide
- ✅ **Simple integration** - just HTTP POST with base64

### Get ImgBB API Key (2 minutes)

1. Visit **https://api.imgbb.com/**
2. Click **"Get API Key"**
3. Sign up with email (free, no credit card needed)
4. Copy your API key (looks like: `a1b2c3d4e5f6g7h8i9j0`)

### Add to Arduino Firmware

Edit your ESP32-CAM firmware (`arduino/BantayBot_Camera_Firebase/BantayBot_Camera_Firebase.ino`):

```cpp
#define IMGBB_API_KEY "your_imgbb_api_key_here"  // Paste your key
```

That's it! Your camera will now upload snapshots to ImgBB every 10 seconds and store the URLs in Firestore.

### How It Works

```
ESP32-CAM → Captures Image → Uploads to ImgBB → Gets URL → Stores URL in Firestore → PWA Displays Image
```

**Bandwidth Usage:** Only ~2.6 GB/month (vs 240 GB for video streaming!) - 99% savings! 💰

For complete integration guide, see: [`docs/ARDUINO_IMGBB_INTEGRATION.md`](docs/ARDUINO_IMGBB_INTEGRATION.md)

---

## 🔌 Arduino Setup

### Required Libraries

Install via Arduino IDE Library Manager:

1. **Firebase-ESP-Client** by Mobizt (v4.x)
2. **DFRobotDFPlayerMini**
3. **Adafruit_PWMServoDriver**
4. **Wire** (built-in)

### ESP32-CAM Firmware

1. Open `arduino/BantayBot_Camera_Firebase/BantayBot_Camera_Firebase.ino`

2. Edit WiFi, Firebase, and ImgBB config:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

#define FIREBASE_HOST "bantaybot-pwa.firebaseio.com" // Your project
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define FIREBASE_PROJECT_ID "bantaybot-pwa"

#define IMGBB_API_KEY "YOUR_IMGBB_API_KEY"  // Get from https://api.imgbb.com
```

3. Select board: **AI Thinker ESP32-CAM**
4. Upload to ESP32-CAM
5. Open Serial Monitor (115200 baud)
6. Verify: `✅ Firebase connected`

### ESP32 Main Board Firmware

1. Open `arduino/BantayBot_Main_Firebase/BantayBot_Main_Firebase.ino`

2. Edit WiFi and Firebase config (same as above)

3. Select board: **ESP32 Dev Module**
4. Upload to ESP32 Main Board
5. Verify in Serial Monitor: `✅ Firebase connected`

### Verify Firebase Connection

In Firebase Console → Firestore Database:

You should see collections automatically created:
- `devices/camera_001`
- `devices/main_001`
- `sensor_data/camera_001`
- `sensor_data/main_001`

If you see these, your Arduino boards are successfully connected to Firebase! 🎉

---

## 💻 Development

### Start Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Project Structure

```
bantaybot-pwa/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Main app pages
│   │   ├── Dashboard.jsx   # Live camera + sensors
│   │   ├── Controls.jsx    # Audio/motor/servo controls
│   │   ├── Analytics.jsx   # Harvest planner, etc.
│   │   ├── History.jsx     # Detection logs
│   │   └── Settings.jsx    # App settings
│   ├── services/           # Business logic
│   │   ├── FirebaseService.js      # Firebase init
│   │   ├── DeviceService.js        # Device subscriptions
│   │   ├── CommandService.js       # Send commands
│   │   ├── PredictionService.js    # GDD calculations
│   │   └── CropDataService.js      # Harvest/rainfall data
│   ├── config/
│   │   ├── firebase.config.js      # Firebase credentials
│   │   └── hardware.config.js      # Pin configs, thresholds
│   ├── i18n/
│   │   └── translations.js         # EN + TL translations
│   └── App.jsx             # Main app with routing
├── arduino/                # ESP32 firmware
├── docs/                   # Documentation
└── package.json
```

### Available Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run deploy     # Build + deploy to Firebase Hosting
```

---

## 🌍 Deployment

### Deploy to Firebase Hosting

```bash
# 1. Build the app
npm run build

# 2. Deploy to Firebase
firebase deploy --only hosting

# 3. Your app is live!
# https://bantaybot-pwa.web.app
```

### Custom Domain (Optional)

1. In Firebase Console → Hosting → Add custom domain
2. Follow DNS setup instructions
3. Your app at: `https://bantaybot.farm`

---

## 🔧 Hardware Configuration

### ESP32-CAM (Port 80)
```
Camera Module: AI Thinker ESP32-CAM
- Stream: http://CAMERA_IP:80/stream
- Firebase Device ID: camera_001
- Features: Bird detection, camera settings
```

### ESP32 Main Board (Port 81)
```
Hardware Connected:
- DFPlayer Mini:  RX=27, TX=26 (7 audio tracks)
- RS485 Sensor:   RX=17, TX=16, RE=4 (soil data)
- Stepper Motor:  STEP=25, DIR=33, EN=32 (head rotation)
- PCA9685 Servos: SDA=21, SCL=22 (arm movement)
- PIR Motion:     GPIO 14

Firebase Device ID: main_001
```

All pin configurations defined in: `src/config/hardware.config.js`

---

## 🐛 Troubleshooting

### App won't load

```
✅ Check: Firebase config correct in firebase.config.js?
✅ Check: Internet connection working?
✅ Try: Clear browser cache (Ctrl+Shift+Delete)
✅ Try: Open in incognito/private window
```

### Arduino not connecting to Firebase

```
✅ Check: WiFi credentials correct?
✅ Check: Firebase API key and project ID correct?
✅ Check: ESP32 has internet access? (ping google.com)
✅ Check: Firestore security rules allow writes?
✅ Try: Restart ESP32 (press reset button)
```

### No sensor data showing

```
✅ Check: Arduino Serial Monitor shows "✅ Data uploaded"?
✅ Check: Firestore Console shows sensor_data documents updating?
✅ Check: Browser console for errors (F12 → Console tab)?
✅ Try: Refresh browser page
```

### Camera snapshot not showing

```
✅ Check: ImgBB API key configured in ESP32-CAM firmware?
✅ Check: Arduino Serial Monitor shows "✅ Uploaded to ImgBB"?
✅ Check: Firestore device document has latest_snapshot_url field?
✅ Check: ImgBB URL accessible in browser?
✅ Try: Refresh browser page or click refresh button on snapshot
```

---

## 📚 Additional Documentation

- [FIRESTORE_STRUCTURE.md](docs/FIRESTORE_STRUCTURE.md) - Complete database schema
- [ARDUINO_IMGBB_INTEGRATION.md](docs/ARDUINO_IMGBB_INTEGRATION.md) - ImgBB camera integration guide
- [IMGBB_SOLUTION_SUMMARY.md](IMGBB_SOLUTION_SUMMARY.md) - Why ImgBB & architecture details
- [QUICK_SETUP.md](docs/QUICK_SETUP.md) - 30-minute quick start guide

---

## 🎓 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Storage + Hosting)
- **Hardware**: ESP32-CAM + ESP32 DevKit
- **Sensors**: RS485 soil sensor, PIR, DFPlayer, PCA9685
- **PWA**: Workbox (offline support)

---

## 🚜 Supported Crops

| Crop | Icon | Growing Days | Optimal Temp | pH Range |
|------|------|--------------|--------------|----------|
| Tomato (Kamatis) | 🍅 | 70 | 18-28°C | 6.0-7.0 |
| Rice (Palay) | 🌾 | 120 | 20-35°C | 5.5-6.5 |
| Corn (Mais) | 🌽 | 90 | 18-32°C | 5.5-7.5 |
| Eggplant (Talong) | 🍆 | 80 | 21-30°C | 5.5-6.5 |

---

## 📄 License

Educational/Academic Project - PUP-Lopez BSIT

---

## 🆘 Support

**Issues?**
1. Check [Troubleshooting](#-troubleshooting) section
2. Review Firebase Console for errors
3. Check Arduino Serial Monitor logs
4. Open browser DevTools (F12) for JS errors

**Happy Farming! 🌾🇵🇭**
