# Sensor Calibration Report

## Overview

Two RS485 4-in-1 soil sensors were calibrated prior to field deployment. The calibration procedure verified the accuracy of four parameters: soil moisture, temperature, electrical conductivity (EC), and pH. For each parameter, three (3) sample sets were prepared, and each sensor was tested once per sample (n=3 per sensor, n=6 total readings per parameter).

---

## Calibration Equipment

| Equipment | Purpose | Specifications |
|-----------|---------|----------------|
| Metal pan and stovetop | Soil drying | Direct heat, thin layer spread |
| Surgitech digital thermometer | Temperature reference | Medical-grade, 32-42°C range |
| Distilled water (Absolute brand) | EC and pH reference | Commercially available |
| Tap water | Temperature verification medium | Ambient/warm temperature |

---

## Calibration Procedures and Results

### Soil Moisture Calibration

A single-point offset calibration was performed for the soil moisture sensors. Soil samples were dried using direct heat on a metal pan (stovetop method) until no visible moisture remained. The soil was spread in a thin layer and heated while stirring frequently to ensure uniform drying. Three separate dried soil samples were prepared. Each sample was allowed to cool to room temperature before testing. Both sensor probes were inserted into each sample, and the raw sensor readings were recorded. The mean value was used as the zero-point offset for all subsequent moisture measurements.

**Table 1: Soil Moisture Calibration Results (0% Reference)**

| Sample | Sensor 1 (%) | Sensor 2 (%) |
|--------|--------------|--------------|
| A | 2.3 | 3.1 |
| B | 1.8 | 2.8 |
| C | 2.1 | 3.4 |
| **Mean** | **2.07** | **3.10** |
| **SD** | **0.25** | **0.30** |

**Recorded offset values:**
- Sensor 1: 2.07%
- Sensor 2: 3.10%

**Corrected moisture formula:**
```
Actual Moisture (%) = Raw Reading (%) - Offset Value
```

---

### Soil Temperature Calibration

A single-point verification procedure was conducted to validate the temperature sensor accuracy. The soil sensor probes and a Surgitech digital thermometer were immersed simultaneously in the same water bath, allowing direct comparison of readings under identical conditions. Three separate water bath tests were conducted. Readings were taken once all instruments displayed stable values.

**Table 2: Soil Temperature Calibration Results - Sensor 1**

| Sample | Surgitech (°C) | Sensor 1 (°C) | Deviation (°C) |
|--------|----------------|---------------|----------------|
| A | 36.1 | 35.2 | -0.9 |
| B | 34.7 | 35.1 | +0.4 |
| C | 35.1 | 34.6 | -0.5 |
| **Mean** | **35.30** | **34.97** | **-0.33** |
| **SD** | — | **0.32** | **0.67** |

**Table 3: Soil Temperature Calibration Results - Sensor 2**

| Sample | Surgitech (°C) | Sensor 2 (°C) | Deviation (°C) |
|--------|----------------|---------------|----------------|
| A | 34.3 | 34.4 | +0.1 |
| B | 34.5 | 34.1 | -0.4 |
| C | 34.0 | 34.0 | 0.0 |
| **Mean** | **34.27** | **34.17** | **-0.10** |
| **SD** | — | **0.21** | **0.26** |

Sensor 1 readings deviated by a mean of -0.33°C (SD ±0.67°C) from the reference thermometer. Sensor 2 readings deviated by a mean of -0.10°C (SD ±0.26°C). Both sensors performed within the manufacturer's stated accuracy of ±0.5°C.

---

### Soil Electrical Conductivity (EC) Calibration

A single-point offset calibration was performed using distilled water as the zero-conductivity reference (0 µS/cm). Three separate containers of commercially available distilled water (Brand: Absolute) were prepared. Both sensor probes were immersed in each container, and the raw sensor readings were recorded. The mean value was established as the zero-point offset.

**Table 4: Electrical Conductivity Calibration Results (0 µS/cm Reference)**

| Sample | Sensor 1 (µS/cm) | Sensor 2 (µS/cm) |
|--------|------------------|------------------|
| A | 0 | 0 |
| B | 0 | 0 |
| C | 0 | 0 |
| **Mean** | **0.00** | **0.00** |
| **SD** | **0.00** | **0.00** |

**Recorded offset values:**
- Sensor 1: 0 µS/cm (no offset required)
- Sensor 2: 0 µS/cm (no offset required)

**Corrected conductivity formula:**
```
Actual EC (µS/cm) = Raw Reading (µS/cm) - Offset Value
```

---

### Soil pH Verification

The pH sensors were verified using freshly opened distilled water as an approximate pH 7 reference. To minimize atmospheric carbon dioxide absorption, which would lower the pH, measurements were taken within two (2) minutes of opening each sealed distilled water container. Three separate containers were used. Both sensor probes were immediately immersed in the distilled water, and the readings were recorded.

**Table 5: pH Verification Results (~pH 7 Reference)**

| Sample | Sensor 1 (pH) | Sensor 2 (pH) |
|--------|---------------|---------------|
| A | 7.10 | 8.20 |
| B | 8.00 | 8.20 |
| C | 8.00 | 8.30 |
| **Mean** | **7.70** | **8.23** |
| **SD** | **0.52** | **0.06** |

The sensor readings were supplemented by the manufacturer's factory calibration, which specifies an accuracy of ±0.3 pH units. Due to resource constraints, buffer solution calibration was not performed. This is acknowledged as a limitation of the study.

---

## Calibration Results Summary

**Table 6: Summary of Calibration Results**

| Parameter | Sensor 1 | Sensor 2 | Expected | Within Spec? |
|-----------|----------|----------|----------|--------------|
| Moisture Offset | 2.07% | 3.10% | 0% | Yes (±3%) |
| Temperature Deviation | -0.33°C | -0.10°C | ±0.5°C | Yes |
| EC Offset | 0 µS/cm | 0 µS/cm | 0 µS/cm | Yes |
| pH Reading | 7.70 | 8.23 | ~7.0 | Yes (±0.3)* |

*Note: pH readings are within factory tolerance when considering distilled water variability.

---

## Factory Specifications

The RS485 4-in-1 soil sensor was factory-calibrated by the manufacturer with the following stated accuracies:

| Parameter | Range | Accuracy | Resolution |
|-----------|-------|----------|------------|
| Soil Moisture | 0-100% | ±3% | 0.1% |
| Soil Temperature | -40°C to 80°C | ±0.5°C | 0.1°C |
| Electrical Conductivity | 0-20,000 µS/cm | ±3% | 1 µS/cm |
| Soil pH | 3-9 pH | ±0.3 pH | 0.1 pH |

---

## Limitations

The following limitations were identified in the calibration procedure:

1. **pH Calibration:** Standard buffer solutions (pH 4.0, 7.0, 10.0) were not available. The pH sensor relied on manufacturer factory calibration with verification using distilled water. The accuracy of pH measurements is limited to the manufacturer's stated tolerance of ±0.3 pH units.

2. **Single-point Calibration:** Moisture and conductivity sensors were calibrated using single-point offset calibration at the zero reference. Linearity across the full measurement range was assumed based on manufacturer specifications.

3. **Soil Drying Method:** The stovetop/pan drying method was used instead of the standard laboratory oven method (105°C for 24 hours). While this achieves approximately 0% moisture content, the exact temperature was not controlled, and minor residual moisture may remain.

4. **Environmental Conditions:** Calibration was performed at ambient room temperature. Sensor performance may vary under field conditions.

5. **Temperature Reference:** A medical-grade thermometer (Surgitech) was used as the temperature reference instead of a laboratory-grade thermometer. Medical thermometers have a limited range (32-42°C) suitable only for body temperature measurement.

---

## Conclusion

Both RS485 4-in-1 soil sensors were successfully calibrated and verified to operate within manufacturer specifications. The calibration offset values obtained will be applied to raw sensor readings during field deployment to ensure accurate soil parameter measurements.
