/*
 * bird_detect_ai.h - Optional AI Bird Detection for BantayBot
 *
 * This is an ADD-ON to existing motion detection.
 * Set AI_ENABLED to false to completely disable AI features.
 *
 * LIBRARY REQUIRED: Arduino_TensorFlowLite (install via Arduino Library Manager)
 * Search for "Arduino_TensorFlowLite"
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
#define USE_SMALL_MODEL false

// AI confidence threshold (0.0 - 1.0)
// Detections below this are considered "not a bird"
#define AI_CONFIDENCE_THRESHOLD 0.70f

#if AI_ENABLED

// TensorFlowLite_ESP32 library (by tanakamasayuki)
#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_error_reporter.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

// Load only ONE model based on selection
#if USE_SMALL_MODEL
  #include "bird_model_small.h"
  #define MODEL_DATA bird_model_small_tflite
  #define MODEL_DATA_LEN bird_model_small_tflite_len
  #define MODEL_NAME "small (16.8KB)"
  constexpr int kTensorArenaSize = 40 * 1024;
#else
  #include "bird_model.h"
  #define MODEL_DATA bird_model_tflite
  #define MODEL_DATA_LEN bird_model_tflite_len
  #define MODEL_NAME "normal (49.7KB)"
  constexpr int kTensorArenaSize = 60 * 1024;
#endif

// Model input/output dimensions
#define AI_INPUT_WIDTH  64
#define AI_INPUT_HEIGHT 64
#define AI_INPUT_SIZE   (AI_INPUT_WIDTH * AI_INPUT_HEIGHT)
#define AI_OUTPUT_SIZE  2  // [not_bird, bird]

// TFLite globals
alignas(16) uint8_t tensor_arena[kTensorArenaSize];
tflite::MicroErrorReporter micro_error_reporter;
tflite::ErrorReporter* error_reporter = &micro_error_reporter;
const tflite::Model* model = nullptr;
tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input_tensor = nullptr;
TfLiteTensor* output_tensor = nullptr;
static bool ai_initialized = false;

/**
 * Initialize the TFLite model
 * Call once in setup() after camera initialization
 * Returns: true if successful, false if failed
 */
bool initBirdAI() {
  Serial.println("=== Initializing Bird AI ===");
  Serial.printf("Model: %s (%d bytes)\n", MODEL_NAME, MODEL_DATA_LEN);
  Serial.printf("Arena size: %d bytes\n", kTensorArenaSize);
  Serial.printf("Free heap before: %d bytes\n", ESP.getFreeHeap());

  // Load model
  model = tflite::GetModel(MODEL_DATA);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.printf("Model version mismatch: %d vs %d\n",
                  model->version(), TFLITE_SCHEMA_VERSION);
    return false;
  }

  // Set up ops resolver
  static tflite::AllOpsResolver resolver;

  // Build interpreter
  static tflite::MicroInterpreter static_interpreter(
      model, resolver, tensor_arena, kTensorArenaSize, error_reporter);
  interpreter = &static_interpreter;

  // Allocate tensors
  if (interpreter->AllocateTensors() != kTfLiteOk) {
    Serial.println("AllocateTensors() failed!");
    return false;
  }

  // Get input/output tensors
  input_tensor = interpreter->input(0);
  output_tensor = interpreter->output(0);

  // Print tensor info
  Serial.printf("Input: %d dims, type %d\n",
                input_tensor->dims->size, input_tensor->type);
  Serial.printf("Output: %d dims, type %d\n",
                output_tensor->dims->size, output_tensor->type);

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
  if (!ai_initialized || !interpreter) {
    return -1.0f;
  }

  // Debug: show input tensor info
  Serial.printf("Input type: %d, scale: %.6f, zero_point: %d\n",
                input_tensor->type,
                input_tensor->params.scale,
                input_tensor->params.zero_point);

  // Get input quantization params
  float input_scale = input_tensor->params.scale;
  int input_zero_point = input_tensor->params.zero_point;

  // Fill input tensor - resize image to 64x64
  for (int y = 0; y < AI_INPUT_HEIGHT; y++) {
    for (int x = 0; x < AI_INPUT_WIDTH; x++) {
      int src_x = x * width / AI_INPUT_WIDTH;
      int src_y = y * height / AI_INPUT_HEIGHT;
      int src_idx = src_y * width + src_x;
      int dst_idx = y * AI_INPUT_WIDTH + x;

      // Normalize pixel to 0.0-1.0 first
      float normalized = grayBuffer[src_idx] / 255.0f;

      // Handle different input types
      if (input_tensor->type == kTfLiteFloat32) {
        input_tensor->data.f[dst_idx] = normalized;
      } else if (input_tensor->type == kTfLiteUInt8) {
        // Quantize: q = (float_val / scale) + zero_point
        int quantized = (int)(normalized / input_scale) + input_zero_point;
        input_tensor->data.uint8[dst_idx] = (uint8_t)constrain(quantized, 0, 255);
      } else if (input_tensor->type == kTfLiteInt8) {
        // Quantize: q = (float_val / scale) + zero_point
        int quantized = (int)(normalized / input_scale) + input_zero_point;
        input_tensor->data.int8[dst_idx] = (int8_t)constrain(quantized, -128, 127);
      }
    }
  }

  // Debug: show sample input values
  Serial.printf("Sample inputs: [0]=%d, [100]=%d, [2000]=%d\n",
                input_tensor->data.int8[0],
                input_tensor->data.int8[100],
                input_tensor->data.int8[2000]);

  // Run inference
  unsigned long start_time = millis();
  if (interpreter->Invoke() != kTfLiteOk) {
    Serial.println("Invoke failed!");
    return -1.0f;
  }
  unsigned long inference_time = millis() - start_time;

  // Get output size to determine model type
  int output_size = output_tensor->dims->data[output_tensor->dims->size - 1];

  // Debug: print raw output values
  Serial.printf("Output size: %d, type: %d\n", output_size, output_tensor->type);

  float bird_confidence = 0.0f;

  if (output_tensor->type == kTfLiteFloat32) {
    // Debug: print all output values
    for (int i = 0; i < output_size; i++) {
      Serial.printf("  output[%d] = %.4f\n", i, output_tensor->data.f[i]);
    }

    if (output_size >= 2) {
      // Two outputs: [bird, not_bird] - bird is class 0
      bird_confidence = output_tensor->data.f[0];
    } else {
      // Single output (sigmoid): direct bird confidence
      bird_confidence = output_tensor->data.f[0];
    }
  } else if (output_tensor->type == kTfLiteUInt8) {
    float scale = output_tensor->params.scale;
    int zero_point = output_tensor->params.zero_point;
    Serial.printf("  scale=%.6f, zero_point=%d\n", scale, zero_point);

    for (int i = 0; i < output_size; i++) {
      float val = (output_tensor->data.uint8[i] - zero_point) * scale;
      Serial.printf("  output[%d] = %d -> %.4f\n", i, output_tensor->data.uint8[i], val);
    }

    if (output_size >= 2) {
      // Bird is class 0
      bird_confidence = (output_tensor->data.uint8[0] - zero_point) * scale;
    } else {
      bird_confidence = (output_tensor->data.uint8[0] - zero_point) * scale;
    }
  } else if (output_tensor->type == kTfLiteInt8) {
    float scale = output_tensor->params.scale;
    int zero_point = output_tensor->params.zero_point;
    Serial.printf("  scale=%.6f, zero_point=%d\n", scale, zero_point);

    for (int i = 0; i < output_size; i++) {
      float val = (output_tensor->data.int8[i] - zero_point) * scale;
      Serial.printf("  output[%d] = %d -> %.4f\n", i, output_tensor->data.int8[i], val);
    }

    if (output_size >= 2) {
      // Bird is class 0
      bird_confidence = (output_tensor->data.int8[0] - zero_point) * scale;
    } else {
      bird_confidence = (output_tensor->data.int8[0] - zero_point) * scale;
    }
  } else {
    Serial.printf("Unknown output type: %d\n", output_tensor->type);
  }

  bird_confidence = constrain(bird_confidence, 0.0f, 1.0f);

  Serial.printf("AI: %.1f%% bird [%dms]\n", bird_confidence * 100, inference_time);

  return bird_confidence;
}

/**
 * Check if AI determined this is a bird
 */
bool isAIBird(float confidence) {
  if (confidence < 0) return true;  // AI unavailable, fallback to motion
  return confidence >= AI_CONFIDENCE_THRESHOLD;
}

#else  // AI_ENABLED == false

// Stub functions when AI is disabled
bool initBirdAI() {
  Serial.println("Bird AI: DISABLED (motion-only detection)");
  return false;
}

float runBirdAI(uint8_t* grayBuffer, int width, int height) {
  (void)grayBuffer; (void)width; (void)height;
  return -1.0f;
}

bool isAIBird(float confidence) {
  (void)confidence;
  return true;
}

#endif  // AI_ENABLED

#endif  // BIRD_DETECT_AI_H
