"""
02 - Train Bird Detection Model (v2 - 96x96)
Creates .h5 model file

Changes from v1:
  - 96x96 input size (was 48x48) - 4x more pixels
  - Adjusted model architecture for larger input
  - Uses prepared_dataset_v2 folder
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from sklearn.model_selection import train_test_split

# Configuration - CHANGED for v2
PREPARED_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset_v2"
MODELS_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\models_v2"

# CHANGED: 96x96 input
INPUT_SIZE = 96

BATCH_SIZE = 32
EPOCHS = 50
LEARNING_RATE = 0.001

def create_model_96x96(input_shape=(96, 96, 1), num_classes=2):
    """
    CNN for 96x96 input - larger than v1 but still ESP32-friendly.
    Expected size: ~60-80KB when quantized.

    Architecture: 96 -> 48 -> 24 -> 12 -> 6 -> Dense
    """
    model = models.Sequential([
        layers.Input(shape=input_shape),

        # Block 1: 96->48
        layers.Conv2D(8, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Block 2: 48->24
        layers.Conv2D(16, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Block 3: 24->12
        layers.Conv2D(32, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Block 4: 12->6 (extra block for 96x96)
        layers.Conv2D(32, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Classifier: 6x6x32 = 1152 features
        layers.Flatten(),
        layers.Dense(48, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])
    return model

def train():
    print("=" * 60)
    print("Model Training (v2 - 96x96 input)")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading dataset...")
    X_path = os.path.join(PREPARED_DIR, 'X.npy')
    y_path = os.path.join(PREPARED_DIR, 'y.npy')

    if not os.path.exists(X_path):
        print(f"ERROR: {X_path} not found!")
        print("Make sure to run 01_prepare_dataset_v2.py first.")
        return

    X = np.load(X_path)
    y = np.load(y_path)

    print(f"Dataset: {X.shape}")
    print(f"Birds: {np.sum(y==1)}, Not-birds: {np.sum(y==0)}")

    # Verify input size
    if X.shape[1] != INPUT_SIZE:
        print(f"WARNING: Dataset is {X.shape[1]}x{X.shape[2]}, expected {INPUT_SIZE}x{INPUT_SIZE}")

    # Split
    print("\n[2/4] Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
    )

    print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # Create model
    print("\n[3/4] Creating model for 96x96 input...")
    model = create_model_96x96(input_shape=(INPUT_SIZE, INPUT_SIZE, 1))
    model.summary()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    # Callbacks
    os.makedirs(MODELS_DIR, exist_ok=True)

    model_callbacks = [
        callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        ),
        callbacks.ModelCheckpoint(
            os.path.join(MODELS_DIR, 'bird_model_96_best.h5'),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]

    # Train
    print("\n[4/4] Training...")
    history = model.fit(
        X_train, y_train,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        validation_data=(X_val, y_val),
        callbacks=model_callbacks,
        verbose=1
    )

    # Evaluate
    print("\n" + "=" * 60)
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Accuracy: {test_acc * 100:.2f}%")

    # Save final model
    final_path = os.path.join(MODELS_DIR, 'bird_model_96_final.h5')
    model.save(final_path)
    print(f"Model saved to: {final_path}")
    print("=" * 60)
    print("\nNEXT STEP: Run 03_convert_tflite_v2.py")

if __name__ == "__main__":
    train()
