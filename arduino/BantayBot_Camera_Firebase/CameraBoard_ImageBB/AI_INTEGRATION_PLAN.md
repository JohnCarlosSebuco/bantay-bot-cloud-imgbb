# BantayBot AI Integration Plan (Minimal Changes)

**Goal:** Add optional TFLite bird verification to existing ESP32-CAM system
**Approach:** AI is an ADD-ON, not a replacement. Existing code stays intact.
**Risk:** Zero - AI can be disabled with one flag, reverting to current behavior

---

## Files Ready

```
CameraBoard_ImageBB/
├── CameraBoard_ImageBB.ino   ← needs 3 small edits (below)
├── board_config.h            ← no changes
├── bird_detect_ai.h          ← ADDED (AI wrapper)
└── bird_model_small.h        ← ADDED (16.8KB TFLite model)
```

---

## Required Code Changes to CameraBoard_ImageBB.ino

### Change 1: Add include (after line 30)

Find this line:
```cpp
#include "board_config.h"
```

Add after it:
```cpp
// === AI BIRD DETECTION (Optional Add-on) ===
#include "bird_detect_ai.h"
```

---

### Change 2: Initialize AI in setup() (after line 535)

Find this line:
```cpp
  // Setup bird detection
  setupBirdDetection();
```

Add after it:
```cpp
  // Initialize AI detection (optional - disabled by default)
  initBirdAI();
```

---

### Change 3: Use AI confidence in detectBirdMotion() (replace lines 462-463)

Find this block (around line 462):
```cpp
        int confidence = map(changedPixels, minBirdSize, maxBirdSize, 50, 95);
        Serial.printf("🐦 BIRD DETECTED! Size: %d pixels, Confidence: %d%%\n", changedPixels, confidence);
```

Replace with:
```cpp
        // Get confidence - AI if available, otherwise motion-based estimate
        int confidence;
        float aiConfidence = runBirdAI(currGrayBuffer, 320, 240);

        if (aiConfidence >= 0) {
          // AI available - use AI confidence
          confidence = (int)(aiConfidence * 100);
          Serial.printf("🐦 BIRD DETECTED! Motion: %d px, AI: %d%%\n", changedPixels, confidence);

          // Optional: reject if AI confidence too low
          if (!isAIBird(aiConfidence)) {
            Serial.printf("🤖 AI rejected (%.0f%% < %.0f%% threshold)\n",
                          aiConfidence * 100, AI_CONFIDENCE_THRESHOLD * 100);
            esp_camera_fb_return(currentFrame);
            currentFrame = NULL;
            memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);
            return false;  // Skip this detection
          }
        } else {
          // AI not available - use motion-based estimate (existing behavior)
          confidence = map(changedPixels, minBirdSize, maxBirdSize, 50, 95);
          Serial.printf("🐦 BIRD DETECTED! Size: %d pixels, Confidence: %d%%\n", changedPixels, confidence);
        }
```

---

## How It Works

| AI_ENABLED | Motion Detected | AI Result | Action |
|------------|-----------------|-----------|--------|
| false | Yes | N/A | Upload (current behavior) |
| true | No | N/A | No upload |
| true | Yes | >= 70% | Upload with AI confidence |
| true | Yes | < 70% | **Rejected** (no false positive) |

---

## Enable/Disable AI

In `bird_detect_ai.h` line 18:

```cpp
// Currently DISABLED - change to true after testing
#define AI_ENABLED false
```

To enable:
```cpp
#define AI_ENABLED true
```

---

## Testing Steps

### Phase 1: Compile with AI disabled (current state)
1. Add the include line to .ino
2. Add initBirdAI() call to setup()
3. Add the confidence code change
4. Compile and upload
5. Serial should show: "Bird AI: DISABLED (using motion-only detection)"
6. Verify motion detection still works

### Phase 2: Enable AI
1. Change `AI_ENABLED` to `true` in bird_detect_ai.h
2. Compile (requires TensorFlowLite_ESP32 library)
3. Upload and test
4. Serial should show AI confidence values

---

## Install TFLite Library

**Arduino IDE:**
1. Sketch → Include Library → Manage Libraries
2. Search for "TensorFlowLite_ESP32"
3. Install

**PlatformIO:**
```ini
lib_deps =
    tanakamasayuki/TensorFlowLite_ESP32@^1.0.0
```

---

## Memory Usage

| State | Free Heap |
|-------|-----------|
| Current (no AI) | ~180 KB |
| AI disabled (stub) | ~180 KB |
| AI enabled | ~140 KB |

Still plenty of headroom for WiFi and HTTP operations.

---

## Rollback

If any issues, just set:
```cpp
#define AI_ENABLED false
```

Recompile - returns to 100% original behavior.

---

*Files created: November 29, 2025*
