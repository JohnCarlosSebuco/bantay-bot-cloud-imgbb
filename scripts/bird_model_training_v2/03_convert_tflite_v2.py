"""
03 - Convert to TFLite for ESP32-CAM (v2 - 96x96)
Creates .tflite and .h files

Changes from v1:
  - Uses models_v2 and prepared_dataset_v2 folders
  - Output files named bird_model_96.*
"""
import os
import numpy as np
import tensorflow as tf

# Configuration - CHANGED for v2
MODELS_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\models_v2"
PREPARED_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset_v2"
MODEL_NAME = "bird_model_96_final.h5"
OUTPUT_NAME = "bird_model_96"

def convert_to_tflite():
    print("=" * 60)
    print("TFLite Conversion (v2 - 96x96)")
    print("=" * 60)

    model_path = os.path.join(MODELS_DIR, MODEL_NAME)

    if not os.path.exists(model_path):
        print(f"ERROR: {model_path} not found!")
        print("Make sure to run 02_train_model_v2.py first.")
        return

    # Load model
    print("\n[1/4] Loading model...")
    model = tf.keras.models.load_model(model_path)
    print(f"Input shape: {model.input_shape}")

    # Create converter
    print("\n[2/4] Converting with INT8 quantization...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    # Load calibration data
    X_path = os.path.join(PREPARED_DIR, 'X.npy')
    if not os.path.exists(X_path):
        print(f"WARNING: {X_path} not found, using random calibration data")
        X = np.random.rand(100, 96, 96, 1).astype(np.float32)
    else:
        X = np.load(X_path)

    def representative_dataset():
        indices = np.random.choice(len(X), min(100, len(X)), replace=False)
        for i in indices:
            yield [X[i:i+1].astype(np.float32)]

    # INT8 quantization
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    # Convert
    print("\n[3/4] Converting...")
    tflite_model = converter.convert()

    # Save .tflite
    tflite_path = os.path.join(MODELS_DIR, f'{OUTPUT_NAME}.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

    size_kb = len(tflite_model) / 1024
    print(f"Saved: {tflite_path} ({size_kb:.2f} KB)")

    # Convert to C header
    print("\n[4/4] Creating C header for ESP32...")
    header_path = os.path.join(MODELS_DIR, f'{OUTPUT_NAME}.h')
    create_c_header(tflite_model, header_path, OUTPUT_NAME)

    print("\n" + "=" * 60)
    print("DONE!")
    print(f"Files created in {MODELS_DIR}/:")
    print(f"  - {OUTPUT_NAME}.tflite ({size_kb:.2f} KB)")
    print(f"  - {OUTPUT_NAME}.h (C header for ESP32)")
    print("=" * 60)
    print("\nNEXT: Copy bird_model_96.h to your Arduino project")

def create_c_header(tflite_model, output_path, model_name):
    """Convert to C array for ESP32"""
    var_name = model_name.replace('-', '_')

    c_array = f"// Auto-generated TFLite model for ESP32-CAM (96x96 input)\n"
    c_array += f"// Size: {len(tflite_model)} bytes ({len(tflite_model)/1024:.2f} KB)\n"
    c_array += f"// Input: 96x96 grayscale, INT8 quantized\n\n"
    c_array += f"#ifndef {var_name.upper()}_H\n"
    c_array += f"#define {var_name.upper()}_H\n\n"
    c_array += f"const unsigned int {var_name}_tflite_len = {len(tflite_model)};\n"
    c_array += f"alignas(8) const unsigned char {var_name}_tflite[] = {{\n  "

    hex_values = [f"0x{b:02x}" for b in tflite_model]

    for i in range(0, len(hex_values), 12):
        row = hex_values[i:i+12]
        c_array += ", ".join(row)
        if i + 12 < len(hex_values):
            c_array += ",\n  "

    c_array += f"\n}};\n\n"
    c_array += f"#endif // {var_name.upper()}_H\n"

    with open(output_path, 'w') as f:
        f.write(c_array)

    print(f"Saved: {output_path}")

def verify_model():
    """Quick test of the TFLite model"""
    print("\nVerifying model...")

    tflite_path = os.path.join(MODELS_DIR, f'{OUTPUT_NAME}.tflite')
    if not os.path.exists(tflite_path):
        print("Skipping verification - model not found")
        return

    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print(f"Input:  {input_details[0]['shape']} {input_details[0]['dtype']}")
    print(f"Output: {output_details[0]['shape']} {output_details[0]['dtype']}")

    # Print quantization params (needed for ESP32 code)
    input_scale = input_details[0]['quantization'][0]
    input_zp = input_details[0]['quantization'][1]
    output_scale = output_details[0]['quantization'][0]
    output_zp = output_details[0]['quantization'][1]

    print(f"\nQuantization params for ESP32:")
    print(f"  Input:  scale={input_scale:.8f}, zero_point={input_zp}")
    print(f"  Output: scale={output_scale:.8f}, zero_point={output_zp}")

    # Test inference
    X_path = os.path.join(PREPARED_DIR, 'X.npy')
    if os.path.exists(X_path):
        X = np.load(X_path)
        sample = X[0:1]

        # Quantize input
        sample_q = (sample / input_scale + input_zp).astype(np.int8)

        interpreter.set_tensor(input_details[0]['index'], sample_q)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])

        # Dequantize output
        output_f = (output.astype(np.float32) - output_zp) * output_scale
        print(f"\nTest inference OK:")
        print(f"  Raw output: {output}")
        print(f"  Dequantized: {output_f}")

if __name__ == "__main__":
    convert_to_tflite()
    verify_model()
