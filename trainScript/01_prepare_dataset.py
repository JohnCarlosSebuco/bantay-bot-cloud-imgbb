"""
01 - Prepare and Augment Dataset
Creates X.npy and y.npy for training
"""
import os
import cv2
import numpy as np
from pathlib import Path

# Configuration
DATASET_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\dataset"
OUTPUT_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset"
INPUT_SIZE = 48
GRAYSCALE = True

def preprocess_image(image_path, size=INPUT_SIZE):
    img = cv2.imread(image_path)
    if img is None:
        return None

    if GRAYSCALE:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
    return img

def augment_image(img):
    """Apply augmentations to increase dataset"""
    augmented = [img.copy()]

    # Horizontal flip
    augmented.append(cv2.flip(img, 1))

    # Brightness variations
    for alpha in [0.8, 1.2]:
        augmented.append(cv2.convertScaleAbs(img, alpha=alpha, beta=0))

    # Small rotation
    for angle in [-10, 10]:
        center = (img.shape[1]//2, img.shape[0]//2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(img, matrix, (img.shape[1], img.shape[0]))
        augmented.append(rotated)

    return augmented

def prepare_dataset():
    print("=" * 50)
    print("Dataset Preparation")
    print("=" * 50)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    X = []
    y = []

    classes = {'not_bird': 0, 'bird': 1}

    for class_name, label in classes.items():
        class_dir = os.path.join(DATASET_DIR, class_name)
        if not os.path.exists(class_dir):
            print(f"WARNING: {class_dir} not found")
            continue

        images = [f for f in os.listdir(class_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"\nProcessing {len(images)} {class_name} images...")

        for i, img_file in enumerate(images):
            if i % 100 == 0:
                print(f"  [{i}/{len(images)}]")

            img_path = os.path.join(class_dir, img_file)
            img = preprocess_image(img_path)

            if img is None:
                continue

            # Augment
            augmented = augment_image(img)

            for aug_img in augmented:
                X.append(aug_img)
                y.append(label)

    X = np.array(X)
    y = np.array(y)

    # Shuffle
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    # Normalize to 0-1
    X = X.astype(np.float32) / 255.0

    # Add channel dimension for grayscale
    if GRAYSCALE:
        X = X.reshape(-1, INPUT_SIZE, INPUT_SIZE, 1)

    # Save
    np.save(os.path.join(OUTPUT_DIR, 'X.npy'), X)
    np.save(os.path.join(OUTPUT_DIR, 'y.npy'), y)

    print("\n" + "=" * 50)
    print("DONE!")
    print(f"Total samples: {len(X)}")
    print(f"Birds: {np.sum(y == 1)}")
    print(f"Not birds: {np.sum(y == 0)}")
    print(f"Shape: {X.shape}")
    print(f"Saved to: {OUTPUT_DIR}/")
    print("=" * 50)

if __name__ == "__main__":
    prepare_dataset()
