# Firestore Database Structure

This document describes the complete Firestore database structure for BantayBot PWA.

## Collections Overview

```
firestore/
├── devices/               # ESP32 device registration
├── sensor_data/           # Real-time sensor readings
├── commands/              # Command queue (app → devices)
├── detection_history/     # Bird detection logs
├── harvest_data/          # Crop planning & harvest records
├── rainfall_log/          # Rainfall tracking (90 days)
└── settings/              # App-wide settings
```

---

## 1. `devices` Collection

Stores information about ESP32 devices (Camera and Main Board).

### Document Structure

**Document ID:** `camera_001` | `main_001`

```javascript
{
  device_id: "camera_001",
  type: "camera",  // or "main"
  name: "BantayBot Camera #1",
  status: "online",  // "online" | "offline"
  ip_address: "192.168.1.144",
  stream_url: "http://192.168.1.144:80/stream",
  mdns_hostname: "bantaybot-camera.local",
  firmware_version: "1.0.0",

  // ImgBB snapshot fields (camera only)
  latest_snapshot_url: "https://i.ibb.co/abc123/snap.jpg",  // ImgBB CDN URL
  last_snapshot_time: Timestamp,
  snapshot_count: 145,  // Total snapshots uploaded

  last_seen: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

## 2. `sensor_data` Collection

Real-time sensor readings from devices (updated every 2 seconds).

### Document Structure

**Document ID:** `camera_001` | `main_001`

#### For Camera Device (`camera_001`):

```javascript
{
  device_id: "camera_001",
  birds_detected_today: 3,
  detection_enabled: true,
  detection_sensitivity: 2,  // 1=Low, 2=Medium, 3=High
  camera_brightness: 0,  // -2 to +2
  camera_contrast: 0,    // -2 to +2
  grayscale_mode: false,
  resolution: "QVGA",  // "96x96" | "QVGA" | "VGA" | "SVGA"
  last_detection_time: Timestamp,
  updated_at: Timestamp
}
```

#### For Main Board (`main_001`):

```javascript
{
  device_id: "main_001",

  // RS485 Soil Sensor
  soil_humidity: 65,  // %
  soil_temperature: 28.5,  // °C
  soil_conductivity: 850,  // µS/cm
  ph: 6.8,  // pH scale

  // PIR Motion Sensor
  motion_detected: false,
  motion_start_time: Timestamp,

  // Stepper Motor (Head)
  head_position: 0,  // -180 to +180 degrees

  // DFPlayer Audio
  current_track: 1,  // 1-7
  volume: 20,  // 0-30
  audio_playing: false,

  // PCA9685 Servo Arms
  left_arm_angle: 90,  // 0-180
  right_arm_angle: 90,  // 0-180
  oscillating: false,

  // Hardware status
  has_dfplayer: true,
  has_rs485_sensor: true,
  has_servos: true,

  updated_at: Timestamp
}
```

---

## 3. `commands` Collection

Command queue for sending instructions from app to devices.

### Structure

**Path:** `commands/{device_id}/pending/{command_id}`

```javascript
{
  command_id: "cmd_1234567890",
  device_id: "main_001",
  action: "rotate_head",  // See COMMAND_TYPES in hardware.config.js
  params: {
    angle: 90,
    track: 3,
    volume: 25,
    // ... varies by action
  },
  status: "pending",  // "pending" | "processing" | "completed" | "failed"
  error: null,  // Error message if failed
  created_at: Timestamp,
  processed_at: Timestamp,
  completed_at: Timestamp
}
```

### Command Types

#### Audio Commands:
- `play_audio` - Start playing current track
- `stop_audio` - Stop playing
- `next_track` - Next track
- `prev_track` - Previous track
- `set_volume` - `{ volume: 0-30 }`
- `set_track` - `{ track: 1-7 }`

#### Motor Commands:
- `rotate_head` - `{ angle: -180 to +180 }`
- `rotate_left` - Rotate 45° left
- `rotate_right` - Rotate 45° right
- `rotate_center` - Return to center (0°)

#### Servo Commands:
- `move_servo` - `{ left: 0-180, right: 0-180 }`
- `oscillate_arms` - Start arm oscillation
- `stop_oscillate` - Stop oscillation
- `arms_rest` - Move to rest position (90°)
- `arms_alert` - Alert position
- `arms_wave` - Wave gesture

#### Camera Commands:
- `set_brightness` - `{ brightness: -2 to +2 }`
- `set_contrast` - `{ contrast: -2 to +2 }`
- `set_resolution` - `{ resolution: "QVGA" }`
- `toggle_grayscale` - Toggle grayscale mode

#### Detection Commands:
- `enable_detection` - Enable bird detection
- `disable_detection` - Disable detection
- `set_sensitivity` - `{ sensitivity: 1-3 }`

#### System Commands:
- `restart` - Restart device
- `trigger_alarm` - Manual alarm trigger

---

## 4. `detection_history` Collection

Logs of bird detections.

### Document Structure

**Document ID:** Auto-generated

```javascript
{
  detection_id: "det_1234567890",
  device_id: "camera_001",
  timestamp: Timestamp,
  confidence: 0.85,  // 0.0 to 1.0
  triggered_alarm: true,
  motion_pixels: 5432,
  snapshot_url: "https://i.ibb.co/xyz789/detection.jpg",  // ImgBB URL (optional)
  birds_today: 3,  // Total birds detected today
  notes: ""
}
```

### Indexes

- `device_id` + `timestamp` (descending)
- `timestamp` (descending) for queries

### Data Retention

- Keep last 100 detections per device
- Or 30 days, whichever is larger

---

## 5. `harvest_data` Collection

Crop planning and harvest records.

### Document Structure

**Document ID:** Auto-generated

```javascript
{
  harvest_id: "harvest_1234567890",
  crop_type: "tomato",  // "tomato" | "rice" | "corn" | "eggplant"
  crop_name: "Tomato",
  crop_icon: "🍅",

  // Planting info
  planted_date: Timestamp,
  plot_size: 100,  // square meters
  plot_location: "North Field",

  // Predictions
  expected_harvest_date: Timestamp,
  predicted_yield: 45.5,  // kg
  accumulated_gdd: 1850,  // Growing Degree Days

  // Actual harvest (filled when harvested)
  actual_harvest_date: Timestamp,
  actual_yield: 42.0,  // kg
  quality: "good",  // "poor" | "fair" | "good" | "excellent"
  bird_damage_percent: 5,  // 0-100

  // Environmental conditions
  weather_conditions: {
    avg_temperature: 25.5,
    avg_humidity: 65,
    total_rainfall: 120,  // mm over growing period
  },

  // Bird protection effectiveness
  birds_deterred: 45,
  alarm_activations: 23,

  notes: "Good harvest despite dry spell in week 3",

  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

## 6. `rainfall_log` Collection

Manual rainfall logging for water management.

### Document Structure

**Document ID:** Auto-generated

```javascript
{
  log_id: "rain_1234567890",
  date: Timestamp,
  amount_mm: 25.5,  // millimeters
  intensity: "moderate",  // "light" | "moderate" | "heavy" | "storm"
  duration_minutes: 45,
  notes: "Heavy rainfall in afternoon",
  logged_by: "app",  // "app" | "auto" (if sensor available)
  created_at: Timestamp
}
```

### Indexes

- `date` (descending)

### Data Retention

- Keep last 90 days

---

## 7. `settings` Collection

App-wide configuration and user preferences.

### Document Structure

**Document ID:** `app_config`

```javascript
{
  // Language & Localization
  language: "tl",  // "en" | "tl"

  // Theme
  theme: "light",  // "light" | "dark" | "auto"

  // Audio preferences
  default_volume: 20,
  muted: false,

  // Device IDs (for multi-device support)
  active_camera_device: "camera_001",
  active_main_device: "main_001",

  // Detection preferences
  auto_alarm_enabled: true,
  detection_sensitivity: 2,

  // Notifications (future)
  notifications_enabled: false,
  email_alerts: false,

  updated_at: Timestamp
}
```

---

## Security Rules

### Development/Testing (Permissive)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes (simplified for MVP)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Production (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Devices collection - devices can update their own status
    match /devices/{deviceId} {
      allow read: if true;
      allow write: if request.auth != null || request.resource.data.device_id == deviceId;
    }

    // Sensor data - devices can write, app can read
    match /sensor_data/{deviceId} {
      allow read: if true;
      allow write: if true;  // Add auth later
    }

    // Commands - app can write, devices can read/update
    match /commands/{deviceId}/{document=**} {
      allow read, write: if true;  // Add auth later
    }

    // Detection history - anyone can read, devices can write
    match /detection_history/{detectionId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null;
    }

    // Harvest data - authenticated users only
    match /harvest_data/{harvestId} {
      allow read: if true;
      allow write: if true;  // Add auth later
    }

    // Rainfall log - authenticated users only
    match /rainfall_log/{logId} {
      allow read: if true;
      allow write: if true;  // Add auth later
    }

    // Settings - authenticated users only
    match /settings/{settingId} {
      allow read, write: if true;  // Add auth later
    }
  }
}
```

---

## Query Examples

### Get Real-time Sensor Data

```javascript
import { doc, onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(
  doc(db, 'sensor_data', 'main_001'),
  (doc) => {
    const data = doc.data();
    console.log('Soil Humidity:', data.soil_humidity);
  }
);
```

### Send Command to Device

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

await addDoc(collection(db, 'commands', 'main_001', 'pending'), {
  action: 'rotate_head',
  params: { angle: 90 },
  status: 'pending',
  created_at: serverTimestamp()
});
```

### Get Recent Detections

```javascript
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'detection_history'),
  orderBy('timestamp', 'desc'),
  limit(10)
);

const snapshot = await getDocs(q);
snapshot.forEach(doc => {
  console.log(doc.data());
});
```

---

## Data Usage Estimates

### Firestore Free Tier Limits:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

### BantayBot Usage (Single Device):
- **Writes:** ~43,200/day (sensor updates every 2s)
- **Reads:** ~5,000/day (app refreshes)
- **Storage:** ~10 MB for 90 days of data

**Note:** Exceeds free tier writes. Consider:
1. Update sensor data every 5-10 seconds instead
2. Batch updates for non-critical sensors
3. Upgrade to Blaze (pay-as-you-go) plan if needed

---

## Optimization Tips

1. **Reduce Write Frequency:** Update non-critical sensors every 5-10s instead of 2s
2. **Use Subcollections:** For commands, use subcollections to avoid listing all pending commands
3. **Index Management:** Create composite indexes for complex queries
4. **Data Cleanup:** Implement Cloud Functions to auto-delete old data
5. **Caching:** Use Firestore's built-in offline persistence
