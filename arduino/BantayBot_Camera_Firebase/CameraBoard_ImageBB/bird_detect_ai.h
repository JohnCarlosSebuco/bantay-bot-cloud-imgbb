/*
 * bird_detect_ai.h - Optional AI Bird Detection for BantayBot
 *
 * This is an ADD-ON to existing motion detection.
 * Set AI_ENABLED to false to completely disable AI features.
 *
 * LIBRARY REQUIRED: EloquentTinyML (install via Arduino Library Manager)
 *
 * Models available:
 * - bird_model_small.h (16.8KB) - Faster, less memory, good accuracy
 * - bird_model.h (49.7KB) - More accurate, requires more memory
 *
 * Input: 64x64 grayscale image
 * Output: [not_bird, bird] confidence scores
 */

#ifndef BIRD_DETECT_AI_H
#define BIRD_DETECT_AI_H

// ============================================
// AI CONFIGURATION
// ============================================

// Set to false to disable AI completely
#define AI_ENABLED true

// Model selection: true = small (16.8KB), false = normal (49.7KB)
// Small model: faster inference, less memory (~40KB arena)
// Normal model: better accuracy, more memory (~60KB arena)
#define USE_SMALL_MODEL true

// AI confidence threshold (0.0 - 1.0)
// Detections below this are considered "not a bird"
#define AI_CONFIDENCE_THRESHOLD 0.70f

#if AI_ENABLED

// Use EloquentTinyML - more compatible with newer compilers
#include <EloquentTinyML.h>

// Load only ONE model based on selection
#if USE_SMALL_MODEL
  #include "bird_model_small.h"
  #define MODEL_DATA bird_model_small_tflite
  #define MODEL_DATA_LEN bird_model_small_tflite_len
  #define MODEL_NAME "small (16.8KB)"
  #define TENSOR_ARENA_SIZE (40 * 1024)
#else
  #include "bird_model.h"
  #define MODEL_DATA bird_model_tflite
  #define MODEL_DATA_LEN bird_model_tflite_len
  #define MODEL_NAME "normal (49.7KB)"
  #define TENSOR_ARENA_SIZE (60 * 1024)
#endif

// Model input/output dimensions
#define AI_INPUT_WIDTH  64
#define AI_INPUT_HEIGHT 64
#define AI_INPUT_SIZE   (AI_INPUT_WIDTH * AI_INPUT_HEIGHT)
#define AI_OUTPUT_SIZE  2  // [not_bird, bird]

// Create TinyML model instance
Eloquent::TinyML::TfLite<AI_INPUT_SIZE, AI_OUTPUT_SIZE, TENSOR_ARENA_SIZE> ml;

static bool ai_initialized = false;
static float input_buffer[AI_INPUT_SIZE];

/**
 * Initialize the TFLite model
 * Call once in setup() after camera initialization
 * Returns: true if successful, false if failed
 */
bool initBirdAI() {
  Serial.println("=== Initializing Bird AI ===");
  Serial.printf("Model: %s (%d bytes)\n", MODEL_NAME, MODEL_DATA_LEN);
  Serial.printf("Arena size: %d bytes\n", TENSOR_ARENA_SIZE);
  Serial.printf("Free heap before: %d bytes\n", ESP.getFreeHeap());

  // Load the model
  if (!ml.begin(MODEL_DATA)) {
    Serial.println("Failed to initialize TinyML model!");
    Serial.println(ml.errorMessage());
    return false;
  }

  ai_initialized = true;
  Serial.println("Bird AI initialized successfully!");
  Serial.printf("Free heap after: %d bytes\n", ESP.getFreeHeap());

  return true;
}

/**
 * Run AI inference on grayscale image buffer
 *
 * @param grayBuffer  Pointer to grayscale pixel data
 * @param width       Image width (e.g., 320)
 * @param height      Image height (e.g., 240)
 * @return            Bird confidence (0.0-1.0), or -1.0 if AI unavailable
 */
float runBirdAI(uint8_t* grayBuffer, int width, int height) {
  if (!ai_initialized) {
    return -1.0f;  // AI not available
  }

  // Resize/sample input image to model size (64x64)
  // Uses simple nearest-neighbor sampling for speed
  for (int y = 0; y < AI_INPUT_HEIGHT; y++) {
    for (int x = 0; x < AI_INPUT_WIDTH; x++) {
      // Map model coordinates to source image coordinates
      int src_x = x * width / AI_INPUT_WIDTH;
      int src_y = y * height / AI_INPUT_HEIGHT;
      int src_idx = src_y * width + src_x;
      int dst_idx = y * AI_INPUT_WIDTH + x;

      // Normalize pixel value to 0.0-1.0
      input_buffer[dst_idx] = grayBuffer[src_idx] / 255.0f;
    }
  }

  // Run inference
  unsigned long start_time = millis();
  float output[AI_OUTPUT_SIZE];

  if (!ml.predict(input_buffer, output)) {
    Serial.println("AI inference failed!");
    Serial.println(ml.errorMessage());
    return -1.0f;
  }

  unsigned long inference_time = millis() - start_time;

  // output[0] = not_bird confidence
  // output[1] = bird confidence
  float bird_confidence = output[1];

  // Clamp to valid range
  bird_confidence = constrain(bird_confidence, 0.0f, 1.0f);

  Serial.printf("AI: %.1f%% bird (%.1f%% not) [%dms]\n",
                bird_confidence * 100, output[0] * 100, inference_time);

  return bird_confidence;
}

/**
 * Check if AI determined this is a bird
 * @param confidence  The confidence value from runBirdAI()
 * @return            true if confidence >= threshold, false otherwise
 */
bool isAIBird(float confidence) {
  if (confidence < 0) return true;  // AI unavailable, assume bird (fallback to motion)
  return confidence >= AI_CONFIDENCE_THRESHOLD;
}

#else  // AI_ENABLED == false

// ============================================
// STUB FUNCTIONS (when AI is disabled)
// These do nothing but return safe defaults
// ============================================

bool initBirdAI() {
  Serial.println("Bird AI: DISABLED (using motion-only detection)");
  return false;
}

float runBirdAI(uint8_t* grayBuffer, int width, int height) {
  (void)grayBuffer;  // Suppress unused parameter warning
  (void)width;
  (void)height;
  return -1.0f;  // -1 indicates AI not available
}

bool isAIBird(float confidence) {
  (void)confidence;
  return true;  // When AI disabled, trust motion detection
}

#endif  // AI_ENABLED

#endif  // BIRD_DETECT_AI_H
