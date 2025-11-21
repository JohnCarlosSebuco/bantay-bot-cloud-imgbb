# ⚡ Quick Setup Guide - BantayBot PWA

Get your BantayBot PWA up and running in 30 minutes!

---

## 📝 Checklist

- [ ] Node.js installed (v18+)
- [ ] Firebase account created
- [ ] ImgBB account created (for camera snapshots)
- [ ] Two ESP32 boards ready
- [ ] WiFi credentials ready
- [ ] 30 minutes of time

---

## 🔥 Part 1: Firebase Setup (10 min)

### Step 1: Create Project
1. Go to https://console.firebase.google.com
2. Click "Add project" → Name: `bantaybot-pwa`
3. Disable Analytics → "Create project"

### Step 2: Enable Firestore
1. Build → Firestore Database
2. "Create database" → Production mode
3. Location: `asia-southeast1` (or closest)
4. "Enable"

### Step 3: Set Rules
Click "Rules" tab, paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
Click "Publish"

### Step 4: Get Config
1. ⚙️ → Project settings
2. Scroll to "Your apps"
3. Click **</>** (Web) icon
4. App nickname: `BantayBot PWA`
5. Copy the `firebaseConfig` object

### Step 5: Update Code
Edit `src/config/firebase.config.js`:
```javascript
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

✅ Firebase setup done!

---

## 📸 Part 2: ImgBB Setup (2 min)

### Get Free ImgBB API Key

1. Visit **https://api.imgbb.com/**
2. Click "Get API Key"
3. Sign up with email (free, no credit card)
4. **Copy your API key** - you'll need it for Arduino

Example key: `a1b2c3d4e5f6g7h8i9j0`

✅ ImgBB setup done! (Camera snapshots will be uploaded here - completely FREE, unlimited!)

---

## 🔌 Part 3: Arduino Setup (15 min)

### Libraries to Install
Open Arduino IDE → Library Manager:
1. Search "Firebase ESP Client" → Install (by Mobizt)
2. Search "DFRobot DFPlayer Mini" → Install
3. Search "Adafruit PWM Servo" → Install

### ESP32-CAM Code

1. Open `arduino/BantayBot_Camera_Firebase/BantayBot_Camera_Firebase.ino`

2. Edit lines 18-20:
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

3. Edit lines 24-27:
```cpp
#define FIREBASE_HOST "YOUR_PROJECT_ID.firebaseio.com"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define FIREBASE_PROJECT_ID "YOUR_PROJECT_ID"
#define IMGBB_API_KEY "YOUR_IMGBB_API_KEY"  // From Part 2!
```

4. Select: Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**

5. Upload (may need to hold BOOT button)

6. Open Serial Monitor (115200 baud)

7. Look for:
   ```
   ✅ WiFi connected!
   ✅ Firebase connected
   📤 Uploading to ImgBB...
   ✅ Uploaded to ImgBB: https://i.ibb.co/...
   ✅ Firestore updated with snapshot URL
   ```

### ESP32 Main Board Code

1. Open `arduino/BantayBot_Main_Firebase/BantayBot_Main_Firebase.ino`

2. Edit same WiFi and Firebase config (lines 18-26)

3. Select: Tools → Board → ESP32 Arduino → **ESP32 Dev Module**

4. Upload

5. Verify in Serial Monitor:
   ```
   ✅ DFPlayer online
   ✅ RS485 initialized
   ✅ Firebase connected
   ```

✅ Arduino setup done!

---

## 💻 Part 4: Web App Setup (5 min)

### Install Dependencies
```bash
cd bantaybot-pwa
npm install
```

Wait 2-3 minutes for installation...

### Start Dev Server
```bash
npm run dev
```

### Open Browser
Go to: http://localhost:3000

You should see:
- 🤖 BantayBot header
- Device status (should show "Online" if Arduino connected)
- Camera snapshot with "Live" indicator
- Soil sensor readings updating in real-time

✅ Web app running!

---

## ✅ Verification Checklist

### Firebase Console
- [ ] Go to Firestore Database
- [ ] See collection: `devices`
- [ ] See documents: `camera_001`, `main_001`
- [ ] See collection: `sensor_data`
- [ ] Documents updating every 2 seconds

### Web App
- [ ] Dashboard shows "Online" for both devices
- [ ] Camera snapshot displays with "Live" indicator
- [ ] Snapshot updates every 10 seconds automatically
- [ ] Soil sensors show real values
- [ ] Controls page buttons work
- [ ] Commands trigger Arduino actions

### Arduino Serial Monitor
- [ ] ESP32-CAM: `✅ Data uploaded` every 2 sec
- [ ] ESP32 Main: `✅ Data uploaded` every 2 sec
- [ ] No errors showing

---

## 🚀 Deploy to Production (Optional)

### Install Firebase Tools
```bash
npm install -g firebase-tools
firebase login
```

### Initialize Hosting
```bash
firebase init hosting
```
Choose:
- Use existing project: `bantaybot-pwa`
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub deploys: `No`

### Build & Deploy
```bash
npm run build
firebase deploy --only hosting
```

Your app is now live at: `https://bantaybot-pwa.web.app`

Share this URL with farmers - they can access from any device, anywhere!

---

## 🐛 Common Issues

### "Firebase not defined" error
→ Check `firebase.config.js` has correct values
→ No placeholders like "YOUR_API_KEY"

### Arduino won't connect
→ Check WiFi credentials (case-sensitive!)
→ Make sure ESP32 has internet access
→ Try ping google.com from ESP32's network

### Sensor data not updating
→ Check Serial Monitor for upload confirmations
→ Verify Firestore security rules allow writes
→ Check device IDs match in code and config

### Camera snapshot not showing
→ Verify ImgBB API key is correct in Arduino code
→ Check Serial Monitor for "✅ Uploaded to ImgBB" messages
→ Verify Firestore has latest_snapshot_url field in devices/camera_001
→ Check browser console (F12) for image loading errors
→ ESP32-CAM needs strong power (5V 2A minimum)

---

## 📞 Next Steps

1. **Test all features**:
   - Camera stream
   - Audio controls
   - Motor rotation
   - Servo movement
   - Detection

2. **Add your crop data**:
   - Go to Analytics → Harvest Planner
   - Add your planted crop
   - Track growing progress

3. **Monitor your farm**:
   - Check dashboard daily
   - Review detection history
   - Track soil conditions

4. **Share with team**:
   - Deploy to Firebase Hosting
   - Share URL with family/co-farmers
   - Everyone can monitor together

---

## 🎉 You're Done!

Your BantayBot PWA is now running!

Need help? Check:
- Full README.md
- FIRESTORE_STRUCTURE.md
- Arduino code comments

**Happy Farming! 🌾**
