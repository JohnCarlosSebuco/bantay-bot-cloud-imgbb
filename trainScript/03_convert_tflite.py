"""
03 - Convert to TFLite for ESP32-CAM
Creates .tflite and .h files
"""
import os
import numpy as np
import tensorflow as tf

# Configuration
MODELS_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\models"
PREPARED_DIR = r"C:\Users\Jules Poblete\Downloads\bird_detection_training\prepared_dataset"
MODEL_NAME = "bird_model_final.h5"

def convert_to_tflite():
    print("=" * 50)
    print("TFLite Conversion")
    print("=" * 50)

    model_path = os.path.join(MODELS_DIR, MODEL_NAME)

    # Load model
    print("\n[1/4] Loading model...")
    model = tf.keras.models.load_model(model_path)

    # Create converter
    print("\n[2/4] Converting with INT8 quantization...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    # Load calibration data
    X = np.load(os.path.join(PREPARED_DIR, 'X.npy'))

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
    tflite_path = os.path.join(MODELS_DIR, 'bird_model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

    size_kb = len(tflite_model) / 1024
    print(f"Saved: {tflite_path} ({size_kb:.2f} KB)")

    # Convert to C header
    print("\n[4/4] Creating C header for ESP32...")
    create_c_header(tflite_model, os.path.join(MODELS_DIR, 'bird_model.h'))

    print("\n" + "=" * 50)
    print("DONE!")
    print(f"Files created in {MODELS_DIR}/:")
    print(f"  - bird_model.tflite ({size_kb:.2f} KB)")
    print(f"  - bird_model.h (C header for ESP32)")
    print("=" * 50)

def create_c_header(tflite_model, output_path):
    """Convert to C array for ESP32"""
    c_array = "// Auto-generated TFLite model for ESP32-CAM\n"
    c_array += f"// Size: {len(tflite_model)} bytes\n\n"
    c_array += "#ifndef BIRD_MODEL_H\n"
    c_array += "#define BIRD_MODEL_H\n\n"
    c_array += f"const unsigned int bird_model_tflite_len = {len(tflite_model)};\n"
    c_array += "alignas(8) const unsigned char bird_model_tflite[] = {\n  "

    hex_values = [f"0x{b:02x}" for b in tflite_model]

    for i in range(0, len(hex_values), 12):
        row = hex_values[i:i+12]
        c_array += ", ".join(row)
        if i + 12 < len(hex_values):
            c_array += ",\n  "

    c_array += "\n};\n\n"
    c_array += "#endif // BIRD_MODEL_H\n"

    with open(output_path, 'w') as f:
        f.write(c_array)

    print(f"Saved: {output_path}")

def verify_model():
    """Quick test of the TFLite model"""
    print("\nVerifying model...")

    tflite_path = os.path.join(MODELS_DIR, 'bird_model.tflite')
    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print(f"Input:  {input_details[0]['shape']} {input_details[0]['dtype']}")
    print(f"Output: {output_details[0]['shape']} {output_details[0]['dtype']}")

    # Test inference
    X = np.load(os.path.join(PREPARED_DIR, 'X.npy'))
    sample = X[0:1]

    # Quantize input
    input_scale = input_details[0]['quantization'][0]
    input_zp = input_details[0]['quantization'][1]
    sample_q = (sample / input_scale + input_zp).astype(np.int8)

    interpreter.set_tensor(input_details[0]['index'], sample_q)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])

    print(f"Test inference OK: output={output}")

if __name__ == "__main__":
    convert_to_tflite()
    verify_model()
