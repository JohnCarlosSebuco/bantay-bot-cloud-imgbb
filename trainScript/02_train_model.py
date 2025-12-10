"""
02 - Train Bird Detection Model
Creates .h5 model file
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from sklearn.model_selection import train_test_split

# Configuration
PREPARED_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset"
MODELS_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\models"
INPUT_SIZE = 48
BATCH_SIZE = 32
EPOCHS = 50
LEARNING_RATE = 0.001

def create_tiny_model(input_shape=(48, 48, 1), num_classes=2):
    """Tiny CNN for ESP32-CAM (~20KB when quantized)"""
    model = models.Sequential([
        layers.Input(shape=input_shape),

        # Block 1: 48->24
        layers.Conv2D(8, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Block 2: 24->12
        layers.Conv2D(16, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Block 3: 12->6
        layers.Conv2D(32, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        # Classifier
        layers.Flatten(),
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])
    return model

def train():
    print("=" * 50)
    print("Model Training")
    print("=" * 50)

    # Load data
    print("\n[1/4] Loading dataset...")
    X = np.load(os.path.join(PREPARED_DIR, 'X.npy'))
    y = np.load(os.path.join(PREPARED_DIR, 'y.npy'))

    print(f"Dataset: {X.shape}")
    print(f"Birds: {np.sum(y==1)}, Not-birds: {np.sum(y==0)}")

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
    print("\n[3/4] Creating model...")
    model = create_tiny_model(input_shape=(INPUT_SIZE, INPUT_SIZE, 1))
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
            os.path.join(MODELS_DIR, 'bird_model_best.h5'),
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
    print("\n" + "=" * 50)
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Accuracy: {test_acc * 100:.2f}%")

    # Save final model
    model.save(os.path.join(MODELS_DIR, 'bird_model_final.h5'))
    print(f"Model saved to: {MODELS_DIR}/bird_model_final.h5")
    print("=" * 50)

if __name__ == "__main__":
    train()
