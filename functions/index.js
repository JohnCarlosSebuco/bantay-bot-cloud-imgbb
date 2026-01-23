const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// ===========================
// Configuration
// ===========================

const THRESHOLDS = {
  soil_moisture_critical: { field: "soilHumidity", op: "<", value: 20 },
  soil_moisture_warning: { field: "soilHumidity", op: "<", value: 40 },
  soil_temperature_high: { field: "soilTemperature", op: ">", value: 35 },
  soil_temperature_low: { field: "soilTemperature", op: "<", value: 10 },
  soil_ph_acidic: { field: "ph", op: "<", value: 4.0 },
  soil_ph_alkaline: { field: "ph", op: ">", value: 8.5 },
  nutrient_low: { field: "soilConductivity", op: "<", value: 100, guard: ">", guardValue: 0 },
};

const MESSAGES = {
  bird_detection: { title: "May Ibon!", body: "May nakitang ibon sa taniman" },
  soil_moisture_warning: { title: "Natutuyo ang Lupa", body: "Moisture: {value}%" },
  soil_moisture_critical: { title: "Tuyo na ang Lupa!", body: "Moisture: {value}% - diligan agad" },
  soil_temperature_high: { title: "Mainit ang Lupa", body: "Temperature: {value}\u00B0C" },
  soil_temperature_low: { title: "Malamig ang Lupa", body: "Temperature: {value}\u00B0C" },
  soil_ph_acidic: { title: "Maasim ang Lupa", body: "pH: {value}" },
  soil_ph_alkaline: { title: "Matabang ang Lupa", body: "pH: {value}" },
  nutrient_low: { title: "Kulang sa Sustansya", body: "Conductivity: {value} \u00B5S/cm" },
};

// Map notification type to preference key
const PREF_MAP = {
  bird_detection: "bird_detection",
  soil_moisture_warning: "soil_moisture",
  soil_moisture_critical: "soil_moisture",
  soil_temperature_high: "soil_temperature",
  soil_temperature_low: "soil_temperature",
  soil_ph_acidic: "soil_ph",
  soil_ph_alkaline: "soil_ph",
  nutrient_low: "soil_conductivity",
};

// Severity mapping
const SEVERITY_MAP = {
  soil_moisture_warning: "warning",
  soil_moisture_critical: "critical",
  soil_temperature_high: "warning",
  soil_temperature_low: "warning",
  soil_ph_acidic: "critical",
  soil_ph_alkaline: "critical",
  nutrient_low: "warning",
  bird_detection: "alert",
};

// ===========================
// Helper Functions
// ===========================

async function getEligibleTokens(type) {
  const tokensSnapshot = await db.collection("notification_tokens").get();
  const now = new Date();
  const currentHour = now.getHours();
  const prefKey = PREF_MAP[type];
  const severity = SEVERITY_MAP[type];

  const tokens = [];

  tokensSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.token) return;

    const prefs = data.preferences || {};

    // Check global toggle
    if (prefs.enabled === false) return;

    // Check per-type toggle
    if (prefKey && prefs[prefKey]?.enabled === false) return;

    // Check severity toggle (warning/critical)
    if (severity === "warning" && prefs[prefKey]?.warning === false) return;
    if (severity === "critical" && prefs[prefKey]?.critical === false) return;

    // Check quiet hours
    if (prefs.throttle?.respectQuietHours) {
      const start = prefs.throttle.quietHoursStart || 22;
      const end = prefs.throttle.quietHoursEnd || 6;
      if (start > end) {
        if (currentHour >= start || currentHour < end) return;
      } else {
        if (currentHour >= start && currentHour < end) return;
      }
    }

    tokens.push({
      token: data.token,
      minInterval: prefs.throttle?.minIntervalMinutes || 30,
    });
  });

  return tokens;
}

async function tryAcquireSendLock(type, minIntervalMinutes) {
  const stateRef = db.collection("notification_state").doc("global");
  const field = `last_${type}`;
  const intervalMs = minIntervalMinutes * 60 * 1000;

  try {
    const acquired = await db.runTransaction(async (transaction) => {
      const stateDoc = await transaction.get(stateRef);
      const state = stateDoc.exists ? stateDoc.data() : {};
      const lastSent = state[field] || 0;
      const now = Date.now();

      if (now - lastSent < intervalMs) {
        return false; // Too soon, skip
      }

      // Atomically update timestamp so no other invocation can pass
      transaction.set(stateRef, { [field]: now }, { merge: true });
      return true;
    });
    return acquired;
  } catch (e) {
    console.error(`Transaction failed for ${type}:`, e);
    return false;
  }
}

async function sendNotification(type, value) {
  const tokenData = await getEligibleTokens(type);

  if (tokenData.length === 0) {
    console.log(`No eligible tokens for ${type}`);
    return { sent: 0, reason: "no eligible tokens" };
  }

  // Use the minimum interval from preferences
  const minInterval = tokenData[0].minInterval;

  // Atomically check + lock the interval (prevents race conditions)
  const canSend = await tryAcquireSendLock(type, minInterval);
  if (!canSend) {
    console.log(`Skipping ${type}: interval not passed`);
    return { sent: 0, reason: "interval not passed" };
  }

  const msgTemplate = MESSAGES[type];
  if (!msgTemplate) return { sent: 0, reason: "unknown type" };

  const body = msgTemplate.body.replace("{value}", String(value));

  const message = {
    notification: { title: msgTemplate.title, body },
    data: {
      type: type,
      value: String(value),
      severity: type.includes("critical") ? "critical" : "warning",
      url: type === "bird_detection" ? "/history" : "/",
    },
    tokens: tokenData.map((t) => t.token),
  };

  const response = await messaging.sendEachForMulticast(message);

  // Clean up failed tokens
  const failedTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
      failedTokens.push(tokenData[idx].token);
    }
  });

  if (failedTokens.length > 0) {
    const batch = db.batch();
    const allTokens = await db.collection("notification_tokens").get();
    allTokens.docs.forEach((doc) => {
      if (failedTokens.includes(doc.data().token)) {
        batch.delete(doc.ref);
      }
    });
    await batch.commit();
    console.log(`Removed ${failedTokens.length} stale tokens`);
  }

  console.log(`Sent ${type}: ${response.successCount} success, ${response.failureCount} failed`);
  return { sent: response.successCount, failed: response.failureCount };
}

// ===========================
// Firestore Triggers
// ===========================

// Trigger: sensor_data/{deviceId} updated
exports.onSensorDataUpdate = onDocumentUpdated("sensor_data/{deviceId}", async (event) => {
  const newData = event.data.after.data();
  if (!newData) return;

  for (const [type, config] of Object.entries(THRESHOLDS)) {
    const value = newData[config.field];

    // Skip if field missing or sensor disconnected
    if (value === undefined || value === null) continue;
    if (config.guard && !(value > config.guardValue)) continue;

    let triggered = false;
    if (config.op === "<" && value < config.value) triggered = true;
    if (config.op === ">" && value > config.value) triggered = true;

    if (triggered) {
      // Skip warning if critical already triggers (moisture)
      if (type === "soil_moisture_warning" && newData.soilHumidity < 20) continue;

      await sendNotification(type, value.toFixed(1));
    }
  }
});

// Trigger: detection_history/{docId} created
exports.onBirdDetection = onDocumentCreated("detection_history/{docId}", async (event) => {
  await sendNotification("bird_detection", "");
});
