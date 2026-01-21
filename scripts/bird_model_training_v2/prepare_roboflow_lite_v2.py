"""
IMPROVED Version - Prepare Roboflow Dataset for TFLite ESP32-CAM
Changes from v1:
  - 96x96 output (was 48x48) for better detail
  - 30% padding around bird crops to include context
  - Better interpolation (LANCZOS)
"""
import os
import csv
import cv2
import numpy as np
from pathlib import Path
import random

# Configuration - UPDATED PATHS (same as original)
ROBOFLOW_DIR = r"C:\Users\Jules Poblete\Downloads\bird-detection.v2i.tensorflow"
OUTPUT_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\dataset_v2"

# CHANGED: 96x96 for better detail
TARGET_SIZE = 96

# CHANGED: Add 30% padding around bounding boxes
PADDING_PERCENT = 0.30

# LIMIT - only process this many images per split
MAX_IMAGES_PER_SPLIT = 200

def load_annotations(csv_path, max_images=None):
    """Load annotations from Roboflow CSV"""
    annotations = {}
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            filename = row['filename']
            if filename not in annotations:
                if max_images and len(annotations) >= max_images:
                    break
                annotations[filename] = {
                    'width': int(row['width']),
                    'height': int(row['height']),
                    'boxes': []
                }
            annotations[filename]['boxes'].append({
                'xmin': int(row['xmin']),
                'ymin': int(row['ymin']),
                'xmax': int(row['xmax']),
                'ymax': int(row['ymax'])
            })
    return annotations

def crop_and_resize_with_padding(img, xmin, ymin, xmax, ymax, target_size, padding_pct):
    """
    Crop with padding around the bounding box for context.
    Uses LANCZOS interpolation for better quality.
    """
    h, w = img.shape[:2]

    # Calculate box dimensions
    box_w = xmax - xmin
    box_h = ymax - ymin

    # Add padding (30% on each side)
    pad_x = int(box_w * padding_pct)
    pad_y = int(box_h * padding_pct)

    # Expand bounding box with padding
    xmin_padded = max(0, xmin - pad_x)
    ymin_padded = max(0, ymin - pad_y)
    xmax_padded = min(w, xmax + pad_x)
    ymax_padded = min(h, ymax + pad_y)

    # Minimum size check (at least 32x32 after padding)
    if xmax_padded - xmin_padded < 32 or ymax_padded - ymin_padded < 32:
        return None

    crop = img[ymin_padded:ymax_padded, xmin_padded:xmax_padded]
    if crop.size == 0:
        return None

    # Use LANCZOS for better downscaling quality
    return cv2.resize(crop, (target_size, target_size), interpolation=cv2.INTER_LANCZOS4)

def get_negative_crop(img, boxes, target_size=96):
    """Get ONE background crop that doesn't contain birds"""
    h, w = img.shape[:2]

    for _ in range(30):
        crop_size = random.randint(target_size, min(w, h) // 2)
        x = random.randint(0, w - crop_size)
        y = random.randint(0, h - crop_size)

        overlaps = False
        for box in boxes:
            # Check overlap with some margin
            margin = int((box['xmax'] - box['xmin']) * 0.2)
            ix1 = max(x, box['xmin'] - margin)
            iy1 = max(y, box['ymin'] - margin)
            ix2 = min(x + crop_size, box['xmax'] + margin)
            iy2 = min(y + crop_size, box['ymax'] + margin)

            if ix1 < ix2 and iy1 < iy2:
                if (ix2-ix1) * (iy2-iy1) / (crop_size*crop_size) > 0.1:
                    overlaps = True
                    break

        if not overlaps:
            crop = img[y:y+crop_size, x:x+crop_size]
            if crop.size > 0:
                return cv2.resize(crop, (target_size, target_size), interpolation=cv2.INTER_LANCZOS4)

    return None

def process_split(split_name, roboflow_dir, output_dir):
    split_dir = os.path.join(roboflow_dir, split_name)

    if not os.path.exists(split_dir):
        print(f"  Skipping {split_name}")
        return 0, 0

    csv_path = None
    for f in os.listdir(split_dir):
        if f.endswith('.csv'):
            csv_path = os.path.join(split_dir, f)
            break

    if not csv_path:
        return 0, 0

    annotations = load_annotations(csv_path, MAX_IMAGES_PER_SPLIT)
    total = len(annotations)
    print(f"  Processing {total} images (limited from full dataset)")

    bird_dir = os.path.join(output_dir, 'bird')
    not_bird_dir = os.path.join(output_dir, 'not_bird')
    os.makedirs(bird_dir, exist_ok=True)
    os.makedirs(not_bird_dir, exist_ok=True)

    bird_count = 0
    not_bird_count = 0

    for idx, (filename, data) in enumerate(annotations.items()):
        if idx % 20 == 0:
            print(f"    [{idx+1}/{total}]")

        img_path = os.path.join(split_dir, filename)
        if not os.path.exists(img_path):
            continue

        img = cv2.imread(img_path)
        if img is None:
            continue

        # Process bird crops WITH PADDING
        for i, box in enumerate(data['boxes']):
            crop = crop_and_resize_with_padding(
                img,
                box['xmin'], box['ymin'],
                box['xmax'], box['ymax'],
                TARGET_SIZE,
                PADDING_PERCENT
            )
            if crop is not None:
                # Save as PNG for better quality (no JPEG artifacts)
                cv2.imwrite(os.path.join(bird_dir, f"{split_name}_{idx}_bird_{i}.png"), crop)
                bird_count += 1

        # Get background crops
        for i in range(2):
            crop = get_negative_crop(img, data['boxes'], TARGET_SIZE)
            if crop is not None:
                cv2.imwrite(os.path.join(not_bird_dir, f"{split_name}_{idx}_bg_{i}.png"), crop)
                not_bird_count += 1

    return bird_count, not_bird_count

def main():
    print("=" * 60)
    print("IMPROVED Dataset Converter for ESP32-CAM TFLite (v2)")
    print("=" * 60)
    print(f"Source: {ROBOFLOW_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Max images per split: {MAX_IMAGES_PER_SPLIT}")
    print(f"Output size: {TARGET_SIZE}x{TARGET_SIZE} (was 48x48)")
    print(f"Padding: {int(PADDING_PERCENT*100)}% around bounding box")

    total_birds = 0
    total_not_birds = 0

    for split in ['train', 'valid']:
        print(f"\n{split.upper()}:")
        b, nb = process_split(split, ROBOFLOW_DIR, OUTPUT_DIR)
        total_birds += b
        total_not_birds += nb
        print(f"  Done: {b} birds, {nb} backgrounds")

    print("\n" + "=" * 60)
    print(f"TOTAL: {total_birds} birds, {total_not_birds} not_birds")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    print("\nNEXT STEP: Run 01_prepare_dataset_v2.py")

if __name__ == "__main__":
    main()
