/*
 * bird_detect_ai.h - Optional AI Bird Detection for BantayBot
 *
 * This is an ADD-ON to existing motion detection.
 * Set AI_ENABLED to false to completely disable AI features.
 *
 * Model: bird_model_small.h (16.8KB TFLite)
 * Input: 64x64 grayscale image
 * Output: [not_bird, bird] confidence scores
 */

#ifndef BIRD_DETECT_AI_H
#define BIRD_DETECT_AI_H

// ============================================
// AI FEATURE FLAG
// Set to false to disable AI completely
// ============================================
#define AI_ENABLED false  // Start disabled, enable after testing

// AI confidence threshold (0.0 - 1.0)
// Detections below this are considered "not a bird"
#define AI_CONFIDENCE_THRESHOLD 0.70f

#if AI_ENABLED

#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "bird_model_small.h"  // 16.8KB TFLite model

// Model input dimensions (adjust based on your trained model)
#define AI_INPUT_WIDTH  64
#define AI_INPUT_HEIGHT 64

// Tensor arena size - memory for TFLite operations
// 40KB should be sufficient for the small model
constexpr int kTensorArenaSize = 40 * 1024;
alignas(16) uint8_t tensor_arena[kTensorArenaSize];

// TFLite objects (static to persist across calls)
static const tflite::Model* model = nullptr;
static tflite::MicroInterpreter* interpreter = nullptr;
static TfLiteTensor* input = nullptr;
static TfLiteTensor* output = nullptr;
static bool ai_initialized = false;

/**
 * Initialize the TFLite model
 * Call once in setup() after camera initialization
 * Returns: true if successful, false if failed
 */
bool initBirdAI() {
  Serial.println("=== Initializing Bird AI ===");
  Serial.printf("Model size: %d bytes\n", bird_model_small_tflite_len);

  // Load model from flash
  model = tflite::GetModel(bird_model_small_tflite);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.printf("Model version mismatch! Expected %d, got %d\n",
                  TFLITE_SCHEMA_VERSION, model->version());
    return false;
  }
  Serial.println("Model loaded successfully");

  // Set up resolver with all ops (simpler, slightly more memory)
  static tflite::AllOpsResolver resolver;

  // Create interpreter
  static tflite::MicroInterpreter static_interpreter(
      model, resolver, tensor_arena, kTensorArenaSize);
  interpreter = &static_interpreter;

  // Allocate tensors
  TfLiteStatus allocate_status = interpreter->AllocateTensors();
  if (allocate_status != kTfLiteOk) {
    Serial.println("Failed to allocate tensors!");
    return false;
  }

  // Get input/output tensor pointers
  input = interpreter->input(0);
  output = interpreter->output(0);

  // Print tensor info for debugging
  Serial.printf("Input tensor: %d dims\n", input->dims->size);
  for (int i = 0; i < input->dims->size; i++) {
    Serial.printf("  dim[%d] = %d\n", i, input->dims->data[i]);
  }
  Serial.printf("Input type: %d (1=float, 2=int32, 3=uint8, 9=int8)\n", input->type);

  Serial.printf("Output tensor: %d dims\n", output->dims->size);
  for (int i = 0; i < output->dims->size; i++) {
    Serial.printf("  dim[%d] = %d\n", i, output->dims->data[i]);
  }

  Serial.printf("Tensor arena used: %d / %d bytes\n",
                interpreter->arena_used_bytes(), kTensorArenaSize);

  ai_initialized = true;
  Serial.println("Bird AI initialized successfully!");
  Serial.printf("Free heap after AI init: %d bytes\n", ESP.getFreeHeap());

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
  if (!ai_initialized || !interpreter) {
    return -1.0f;  // AI not available
  }

  // Get model's expected input dimensions
  int model_height = input->dims->data[1];
  int model_width = input->dims->data[2];

  // Resize/sample input image to model size
  // Uses simple nearest-neighbor sampling for speed
  if (input->type == kTfLiteFloat32) {
    // Float input: normalize to 0.0-1.0
    float* input_data = input->data.f;
    for (int y = 0; y < model_height; y++) {
      for (int x = 0; x < model_width; x++) {
        // Map model coordinates to source image coordinates
        int src_x = x * width / model_width;
        int src_y = y * height / model_height;
        int src_idx = src_y * width + src_x;
        int dst_idx = y * model_width + x;

        // Normalize pixel value to 0.0-1.0
        input_data[dst_idx] = grayBuffer[src_idx] / 255.0f;
      }
    }
  } else if (input->type == kTfLiteUInt8) {
    // Quantized uint8 input: use raw pixel values
    uint8_t* input_data = input->data.uint8;
    for (int y = 0; y < model_height; y++) {
      for (int x = 0; x < model_width; x++) {
        int src_x = x * width / model_width;
        int src_y = y * height / model_height;
        int src_idx = src_y * width + src_x;
        int dst_idx = y * model_width + x;

        input_data[dst_idx] = grayBuffer[src_idx];
      }
    }
  } else if (input->type == kTfLiteInt8) {
    // Quantized int8 input: shift from 0-255 to -128-127
    int8_t* input_data = input->data.int8;
    for (int y = 0; y < model_height; y++) {
      for (int x = 0; x < model_width; x++) {
        int src_x = x * width / model_width;
        int src_y = y * height / model_height;
        int src_idx = src_y * width + src_x;
        int dst_idx = y * model_width + x;

        input_data[dst_idx] = (int8_t)(grayBuffer[src_idx] - 128);
      }
    }
  } else {
    Serial.printf("Unsupported input type: %d\n", input->type);
    return -1.0f;
  }

  // Run inference
  unsigned long start_time = millis();
  TfLiteStatus invoke_status = interpreter->Invoke();
  unsigned long inference_time = millis() - start_time;

  if (invoke_status != kTfLiteOk) {
    Serial.println("AI inference failed!");
    return -1.0f;
  }

  // Get bird confidence from output
  // Assumes binary classifier with output [not_bird, bird]
  float bird_confidence = 0.0f;

  if (output->type == kTfLiteFloat32) {
    // Float output
    if (output->dims->data[output->dims->size - 1] >= 2) {
      // Two-class output: [not_bird, bird]
      bird_confidence = output->data.f[1];
    } else {
      // Single output (sigmoid): direct confidence
      bird_confidence = output->data.f[0];
    }
  } else if (output->type == kTfLiteUInt8) {
    // Quantized uint8 output: dequantize
    float scale = output->params.scale;
    int zero_point = output->params.zero_point;
    if (output->dims->data[output->dims->size - 1] >= 2) {
      bird_confidence = (output->data.uint8[1] - zero_point) * scale;
    } else {
      bird_confidence = (output->data.uint8[0] - zero_point) * scale;
    }
  } else if (output->type == kTfLiteInt8) {
    // Quantized int8 output: dequantize
    float scale = output->params.scale;
    int zero_point = output->params.zero_point;
    if (output->dims->data[output->dims->size - 1] >= 2) {
      bird_confidence = (output->data.int8[1] - zero_point) * scale;
    } else {
      bird_confidence = (output->data.int8[0] - zero_point) * scale;
    }
  }

  // Clamp to valid range
  bird_confidence = constrain(bird_confidence, 0.0f, 1.0f);

  Serial.printf("AI: %.1f%% bird (%dms)\n", bird_confidence * 100, inference_time);

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
