# Bird Detection Model Training Guide (v2 - Improved)

**Created:** January 21, 2026
**Purpose:** Train a better bird detection model for ESP32-CAM (BantayBot)
**Improvements:** 96x96 resolution, 30% padding around crops

---

## Why V2?

The original 48x48 model produced "noisy" images that were hard to classify. V2 fixes this:

| Issue | V1 (Original) | V2 (Improved) |
|-------|---------------|---------------|
| Resolution | 48x48 (too small) | **96x96** (4x more pixels) |
| Bird crops | Tight bounding box | **+30% padding** for context |
| Image quality | JPEG artifacts | **PNG** format |
| Interpolation | INTER_AREA | **LANCZOS4** (sharper) |

---

## Prerequisites

### On the Training PC (Jules Poblete's PC)

1. **Roboflow dataset** at:
   ```
   C:\Users\Jules Poblete\Downloads\bird-detection.v2i.tensorflow\
   ```

2. **Python packages** installed:
   ```bash
   pip install tensorflow opencv-python numpy scikit-learn
   ```

3. **V2 training scripts** in Downloads folder:
   - `prepare_roboflow_lite_v2.py`
   - `01_prepare_dataset_v2.py`
   - `02_train_model_v2.py`
   - `03_convert_tflite_v2.py`

---

## Step-by-Step Instructions

### Step 1: Prepare Dataset (Crop Birds)

```bash
python prepare_roboflow_lite_v2.py
```

**What it does:**
- Reads Roboflow annotations
- Crops bird images with **30% padding** around bounding box
- Crops random background (not_bird) samples
- Saves as 96x96 PNG images

**Output:**
```
C:\Users\Jules Poblete\Downloads\bird_detection_training\dataset_v2\
├── bird\           # Cropped bird images (96x96)
└── not_bird\       # Background images (96x96)
```

**Expected:** ~600-700 bird images, ~700-800 not_bird images

---

### Step 2: Augment Dataset

```bash
python 01_prepare_dataset_v2.py
```

**What it does:**
- Loads images from dataset_v2/
- Converts to grayscale
- Applies augmentations (flip, brightness, rotation)
- Normalizes to 0-1 range
- Saves as NumPy arrays

**Output:**
```
C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset_v2\
├── X.npy           # Image data (N, 96, 96, 1)
└── y.npy           # Labels (0=not_bird, 1=bird)
```

**Expected:** ~8,000+ augmented samples

---

### Step 3: Train Model

```bash
python 02_train_model_v2.py
```

**What it does:**
- Loads X.npy and y.npy
- Splits into train/validation/test sets
- Trains CNN with early stopping
- Saves best model

**Output:**
```
C:\Users\Jules Poblete\Downloads\bird_detection_training\models_v2\
├── bird_model_96_best.h5    # Best checkpoint
└── bird_model_96_final.h5   # Final model
```

**Expected:** ~90-95% test accuracy, ~2-5 minutes training

---

### Step 4: Convert to TFLite

```bash
python 03_convert_tflite_v2.py
```

**What it does:**
- Loads the trained .h5 model
- Applies INT8 quantization
- Creates TFLite file for ESP32
- Generates C header file

**Output:**
```
C:\Users\Jules Poblete\Downloads\bird_detection_training\models_v2\
├── bird_model_96.tflite     # TFLite model (~60-80 KB)
└── bird_model_96.h          # C header for Arduino
```

---

## After Training: Deploy to ESP32

### 1. Copy Model to Arduino Project

```
From: C:\Users\Jules Poblete\Downloads\bird_detection_training\models_v2\bird_model_96.h
To:   arduino\BantayBot_Camera_Firebase\CameraBoard_ImageBB\bird_model_96.h
```

### 2. Update bird_detect_ai.h

Change these values:

```cpp
// Change input dimensions from 48 to 96
#define AI_INPUT_WIDTH  96
#define AI_INPUT_HEIGHT 96

// Change model include
#if USE_SMALL_MODEL
  #include "bird_model_small.h"
  // ...
#else
  #include "bird_model_96.h"              // <-- NEW
  #define MODEL_DATA bird_model_96_tflite  // <-- NEW
  #define MODEL_DATA_LEN bird_model_96_tflite_len  // <-- NEW
  #define MODEL_NAME "v2 96x96"
  constexpr int kTensorArenaSize = 80 * 1024;  // <-- Increase arena
#endif
```

### 3. Upload and Test

1. Compile and upload to ESP32-CAM
2. Check Serial Monitor for "Bird AI initialized!"
3. Test with real birds and non-birds

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: tensorflow` | `pip install tensorflow` |
| `dataset_v2 not found` | Run `prepare_roboflow_lite_v2.py` first |
| `X.npy not found` | Run `01_prepare_dataset_v2.py` first |
| `bird_model_96_final.h5 not found` | Run `02_train_model_v2.py` first |
| Low accuracy (<85%) | Check dataset quality, may need more images |
| ESP32 crashes | Increase `kTensorArenaSize` to 100KB, use PSRAM |

---

## File Structure Summary

```
C:\Users\Jules Poblete\Downloads\
├── bird-detection.v2i.tensorflow\    # Source (Roboflow)
│   ├── train\
│   ├── valid\
│   └── test\
│
└── bird_detection_training\
    ├── dataset_v2\                   # Step 1 output
    │   ├── bird\
    │   └── not_bird\
    ├── prepared_dataset_v2\          # Step 2 output
    │   ├── X.npy
    │   └── y.npy
    └── models_v2\                    # Step 3-4 output
        ├── bird_model_96_best.h5
        ├── bird_model_96_final.h5
        ├── bird_model_96.tflite
        └── bird_model_96.h           # <-- Copy this to Arduino
```

---

## Quick Reference

```bash
# Run all steps in order:
python prepare_roboflow_lite_v2.py
python 01_prepare_dataset_v2.py
python 02_train_model_v2.py
python 03_convert_tflite_v2.py
```

**Total time:** ~5-10 minutes

---

*Guide created by Claude Code AI Assistant*
