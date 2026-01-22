# Firebase Quota Analysis & Data Archival Strategy

> **Status:** Planned - Not yet implemented
> **Created:** January 2026
> **Priority:** Medium - Implement before 5 months of continuous use

---

## Table of Contents

1. [Firebase Free Tier Limits](#firebase-free-tier-limits)
2. [Current System Usage Analysis](#current-system-usage-analysis)
3. [Problem Summary](#problem-summary)
4. [Recommended Solution](#recommended-solution)
5. [Implementation Guide](#implementation-guide)
6. [Data Size Reference](#data-size-reference)

---

## Firebase Free Tier Limits

| Resource | Daily Limit | Monthly Limit |
|----------|-------------|---------------|
| Document Reads | 50,000/day | ~1.5M/month |
| Document Writes | 20,000/day | ~600K/month |
| Document Deletes | 20,000/day | ~600K/month |
| Storage | - | 1 GB total |
| Network Egress | - | 10 GB/month |

---

## Current System Usage Analysis

### Sensor Update Interval: 10 Seconds

| Operation | Daily | Monthly | Free Limit | Status |
|-----------|-------|---------|------------|--------|
| **Writes** | 8,690 | 260,700 | 20,000/day | OK (43%) |
| **Reads** (1 user 24/7) | 8,690 | 260,700 | 50,000/day | OK (17%) |
| **Reads** (5 users 24/7) | 43,450 | 1,303,500 | 50,000/day | OK (87%) |
| **Storage** | +6.9 MB | +207 MB | 1 GB total | **Full in ~5 months** |
| **Network Egress** | ~14 MB | ~420 MB | 10 GB/month | OK (4%) |

### Storage Accumulation (The Problem)

| Duration | Sensor Data | Firebase Free Storage |
|----------|-------------|----------------------|
| 1 month | 207 MB | 1 GB |
| 5 months | **1.04 GB** | **EXCEEDED** |
| 1 year | 2.5 GB | EXCEEDED |
| 2 years | 5 GB | EXCEEDED |

---

## Problem Summary

1. **Storage fills up in ~5 months** with raw 10-second sensor data
2. **Users want 2+ years of historical data** for trend analysis
3. **Cannot delete old data** without losing historical insights

---

## Recommended Solution

### Hourly Aggregation Strategy

Keep raw data for recent access, aggregate to hourly averages for long-term storage.

```
Raw Data (10s interval)          Aggregated Data (Hourly)
┌─────────────────────┐          ┌─────────────────────┐
│ sensor_data         │          │ sensor_history      │
│ Last 7 days         │  ─────►  │ Hourly averages     │
│ 8,640 records/day   │  Nightly │ 24 records/day      │
│ 6.9 MB/day          │   Job    │ 4.8 KB/day          │
└─────────────────────┘          └─────────────────────┘
       DELETE                          KEEP FOREVER
    after 7 days
```

### Storage with Aggregation (2+ Years)

| Duration | Records | Storage |
|----------|---------|---------|
| 1 month | 720 | 144 KB |
| 1 year | 8,760 | 1.7 MB |
| 2 years | 17,520 | **3.5 MB** |
| 5 years | 43,800 | **8.8 MB** |
| 10 years | 87,600 | **17.5 MB** |

### Total Firebase Storage After Implementation

| Collection | Data Kept | Storage |
|------------|-----------|---------|
| `sensor_data` | Last 7 days raw | ~48 MB |
| `sensor_history` | 2+ years hourly | ~3.5 MB |
| `detection_history` | All detections | ~10 MB |
| `harvest_data` | All records | <1 MB |
| `rainfall_log` | All records | <1 MB |
| **Total** | - | **~65 MB** (6.5% of 1 GB) |

---

## Implementation Guide

### Step 1: Create `sensor_history` Collection Schema

```javascript
// Firestore collection: sensor_history
// Document ID: {deviceId}_{YYYY-MM-DD}_{HH} (e.g., "main_001_2026-01-22_14")

{
  deviceId: "main_001",
  timestamp: Timestamp,           // Start of the hour
  hour: 14,                       // 0-23
  date: "2026-01-22",

  // Averaged values for the hour
  soil1Humidity: { avg: 45.2, min: 42.1, max: 48.3 },
  soil1Temperature: { avg: 28.5, min: 27.0, max: 30.1 },
  soil1Conductivity: { avg: 320, min: 310, max: 335 },
  soil1PH: { avg: 6.5, min: 6.4, max: 6.6 },

  soil2Humidity: { avg: 43.1, min: 40.0, max: 46.2 },
  soil2Temperature: { avg: 27.8, min: 26.5, max: 29.0 },
  soil2Conductivity: { avg: 315, min: 305, max: 328 },
  soil2PH: { avg: 6.4, min: 6.3, max: 6.5 },

  temperature: { avg: 32.1, min: 30.0, max: 34.5 },
  humidity: { avg: 65.3, min: 60.0, max: 72.0 },

  motionCount: 5,                 // Number of motion events in hour
  samplesCount: 360,              // Number of raw samples aggregated

  createdAt: Timestamp
}
```

### Step 2: Create DataArchivalService.js

```javascript
// src/services/DataArchivalService.js

import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase.config';

const COLLECTIONS = {
  SENSOR_DATA: 'sensor_data',
  SENSOR_HISTORY: 'sensor_history'
};

// Number of days to keep raw data before archiving
const RAW_DATA_RETENTION_DAYS = 7;

export const DataArchivalService = {

  /**
   * Archive old sensor data to hourly averages
   * Run this daily (manually or via Cloud Function)
   */
  async archiveOldData(deviceId = 'main_001') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RAW_DATA_RETENTION_DAYS);

    console.log(`Archiving data older than ${cutoffDate.toISOString()}`);

    // Get raw data older than retention period
    const sensorRef = collection(db, COLLECTIONS.SENSOR_DATA);
    const oldDataQuery = query(
      sensorRef,
      where('deviceId', '==', deviceId),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(oldDataQuery);

    if (snapshot.empty) {
      console.log('No old data to archive');
      return { archived: 0, deleted: 0 };
    }

    // Group by hour
    const hourlyGroups = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp.toDate();
      const hourKey = `${deviceId}_${date.toISOString().split('T')[0]}_${date.getHours().toString().padStart(2, '0')}`;

      if (!hourlyGroups[hourKey]) {
        hourlyGroups[hourKey] = {
          deviceId,
          date: date.toISOString().split('T')[0],
          hour: date.getHours(),
          timestamp: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours())),
          samples: [],
          docIds: []
        };
      }

      hourlyGroups[hourKey].samples.push(data);
      hourlyGroups[hourKey].docIds.push(doc.id);
    });

    // Calculate averages and save
    let archived = 0;
    let deleted = 0;

    for (const [hourKey, group] of Object.entries(hourlyGroups)) {
      const aggregated = this.calculateHourlyAverages(group);

      // Save to sensor_history
      const historyRef = doc(db, COLLECTIONS.SENSOR_HISTORY, hourKey);
      await setDoc(historyRef, aggregated, { merge: true });
      archived++;

      // Delete raw documents
      for (const docId of group.docIds) {
        await deleteDoc(doc(db, COLLECTIONS.SENSOR_DATA, docId));
        deleted++;
      }
    }

    console.log(`Archived ${archived} hours, deleted ${deleted} raw documents`);
    return { archived, deleted };
  },

  /**
   * Calculate hourly averages from raw samples
   */
  calculateHourlyAverages(group) {
    const { samples, deviceId, date, hour, timestamp } = group;

    const calcStats = (field) => {
      const values = samples
        .map(s => s[field])
        .filter(v => v !== undefined && v !== null && !isNaN(v));

      if (values.length === 0) return null;

      return {
        avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
        min: Number(Math.min(...values).toFixed(2)),
        max: Number(Math.max(...values).toFixed(2))
      };
    };

    return {
      deviceId,
      date,
      hour,
      timestamp,

      soil1Humidity: calcStats('soil1Humidity'),
      soil1Temperature: calcStats('soil1Temperature'),
      soil1Conductivity: calcStats('soil1Conductivity'),
      soil1PH: calcStats('soil1PH'),

      soil2Humidity: calcStats('soil2Humidity'),
      soil2Temperature: calcStats('soil2Temperature'),
      soil2Conductivity: calcStats('soil2Conductivity'),
      soil2PH: calcStats('soil2PH'),

      temperature: calcStats('temperature'),
      humidity: calcStats('humidity'),

      motionCount: samples.filter(s => s.motion === true).length,
      samplesCount: samples.length,

      createdAt: Timestamp.now()
    };
  },

  /**
   * Get historical data (combines recent raw + archived hourly)
   */
  async getHistoricalData(deviceId, startDate, endDate) {
    const results = {
      raw: [],      // Recent data (< 7 days)
      hourly: []    // Archived data (>= 7 days)
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RAW_DATA_RETENTION_DAYS);

    // If requesting recent data, fetch from sensor_data
    if (endDate > cutoffDate) {
      const recentStart = startDate > cutoffDate ? startDate : cutoffDate;
      const sensorRef = collection(db, COLLECTIONS.SENSOR_DATA);
      const recentQuery = query(
        sensorRef,
        where('deviceId', '==', deviceId),
        where('timestamp', '>=', Timestamp.fromDate(recentStart)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const recentSnapshot = await getDocs(recentQuery);
      results.raw = recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // If requesting archived data, fetch from sensor_history
    if (startDate < cutoffDate) {
      const archiveEnd = endDate < cutoffDate ? endDate : cutoffDate;
      const historyRef = collection(db, COLLECTIONS.SENSOR_HISTORY);
      const archiveQuery = query(
        historyRef,
        where('deviceId', '==', deviceId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(archiveEnd)),
        orderBy('timestamp', 'desc')
      );

      const archiveSnapshot = await getDocs(archiveQuery);
      results.hourly = archiveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return results;
  },

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    // This is an estimate based on document counts
    const sensorSnapshot = await getDocs(collection(db, COLLECTIONS.SENSOR_DATA));
    const historySnapshot = await getDocs(collection(db, COLLECTIONS.SENSOR_HISTORY));

    return {
      rawDocuments: sensorSnapshot.size,
      rawEstimatedSize: `${(sensorSnapshot.size * 800 / 1024 / 1024).toFixed(2)} MB`,
      archivedHours: historySnapshot.size,
      archivedEstimatedSize: `${(historySnapshot.size * 200 / 1024).toFixed(2)} KB`,
      totalEstimatedSize: `${((sensorSnapshot.size * 800 + historySnapshot.size * 200) / 1024 / 1024).toFixed(2)} MB`
    };
  }
};

export default DataArchivalService;
```

### Step 3: Add Archive Button to Settings (Optional)

```jsx
// Add to Settings page or create Admin panel

import { DataArchivalService } from '../services/DataArchivalService';

const [archiving, setArchiving] = useState(false);
const [stats, setStats] = useState(null);

const handleArchive = async () => {
  setArchiving(true);
  try {
    const result = await DataArchivalService.archiveOldData('main_001');
    alert(`Archived ${result.archived} hours, deleted ${result.deleted} raw records`);

    // Refresh stats
    const newStats = await DataArchivalService.getStorageStats();
    setStats(newStats);
  } catch (error) {
    console.error('Archive failed:', error);
    alert('Archive failed: ' + error.message);
  }
  setArchiving(false);
};

// In render:
<button onClick={handleArchive} disabled={archiving}>
  {archiving ? 'Archiving...' : 'Archive Old Data'}
</button>

{stats && (
  <div>
    <p>Raw documents: {stats.rawDocuments} ({stats.rawEstimatedSize})</p>
    <p>Archived hours: {stats.archivedHours} ({stats.archivedEstimatedSize})</p>
    <p>Total: {stats.totalEstimatedSize}</p>
  </div>
)}
```

### Step 4: Update History Page

Modify the History page to fetch from both collections based on date range:

```jsx
// In History.jsx, update the data fetching logic

const fetchHistoricalData = async (startDate, endDate) => {
  const data = await DataArchivalService.getHistoricalData(
    'main_001',
    startDate,
    endDate
  );

  // Combine and format data for display
  // Raw data has 10-second granularity
  // Hourly data has avg/min/max values

  return {
    recentData: data.raw,
    archivedData: data.hourly
  };
};
```

### Step 5: Automate with Cloud Functions (Optional)

```javascript
// functions/index.js (Firebase Cloud Functions)

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Run daily at 2 AM
exports.archiveSensorData = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    // Import and run archive logic
    // Similar to DataArchivalService.archiveOldData()
    console.log('Running daily sensor data archival...');
    return null;
  });
```

---

## Data Size Reference

### Per-Operation Sizes

| Operation | Size |
|-----------|------|
| 1 Raw sensor reading | ~800 bytes |
| 1 Hourly aggregate | ~200 bytes |
| 1 Bird detection | ~400 bytes |
| 1 Harvest record | ~500 bytes |
| 1 Rainfall entry | ~200 bytes |
| 1 Command | ~300 bytes |

### Comparison: Raw vs Aggregated

| Metric | Raw (10s) | Hourly Avg | Reduction |
|--------|-----------|------------|-----------|
| Records/day | 8,640 | 24 | 99.7% |
| Size/day | 6.9 MB | 4.8 KB | 99.9% |
| Size/month | 207 MB | 144 KB | 99.9% |
| Size/year | 2.5 GB | 1.7 MB | 99.9% |

---

## Alternative Solutions (If Needed)

If Firebase storage becomes insufficient, consider these alternatives:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| Supabase | 500 MB PostgreSQL | SQL queries, more storage |
| MongoDB Atlas | 512 MB | Flexible schema |
| Google BigQuery | 10 GB + 1TB queries/mo | Large-scale analytics |
| Cloudflare D1 | 5 GB SQLite | Edge queries |

---

## Checklist for Implementation

- [ ] Create `DataArchivalService.js`
- [ ] Add `sensor_history` collection to Firestore
- [ ] Update `hardware.config.js` with new collection name
- [ ] Add archive button to Settings/Admin page
- [ ] Update History page to query both collections
- [ ] Test archival with sample data
- [ ] (Optional) Set up Cloud Function for daily automation
- [ ] (Optional) Add storage stats to Settings page

---

## Questions?

Refer to Firebase documentation:
- [Firestore Quotas](https://firebase.google.com/docs/firestore/quotas)
- [Cloud Functions Scheduling](https://firebase.google.com/docs/functions/schedule-functions)
