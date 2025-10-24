import { CROP_DATABASE } from '../config/hardware.config';

class PredictionService {
  calculateGDD(avgTemp, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    return Math.max(0, avgTemp - crop.baseTemp);
  }

  async calculateAccumulatedGDD(plantingDate, cropType = 'default', environmentalHistory = []) {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    let accumulatedGDD = 0;
    const planting = new Date(plantingDate);
    const today = new Date();

    environmentalHistory.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= planting && entryDate <= today) {
        accumulatedGDD += this.calculateGDD(entry.soil_temperature || entry.temperature, cropType);
      }
    });

    return accumulatedGDD;
  }

  calculatePredictedHarvestDate(plantingDate, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    const harvestDate = new Date(plantingDate);
    harvestDate.setDate(harvestDate.getDate() + crop.growthDays);
    return harvestDate;
  }

  calculateYieldPrediction(cropType, plotSize, environmentalScore = 70) {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    const baseYieldPerSqM = {
      tomato: 5,    // kg per sqm
      rice: 0.4,    // kg per sqm
      corn: 0.8,    // kg per sqm
      eggplant: 4,  // kg per sqm
      default: 2
    };

    const baseYield = baseYieldPerSqM[cropType] || baseYieldPerSqM.default;
    const plotMultiplier = plotSize;
    const scoreMultiplier = environmentalScore / 100;

    return (baseYield * plotMultiplier * scoreMultiplier).toFixed(2);
  }

  calculateCropHealthScore(sensorData, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    let score = 0;

    // Temperature score (35%)
    const temp = sensorData.soil_temperature || sensorData.temperature || 25;
    if (temp >= crop.optimalTempMin && temp <= crop.optimalTempMax) {
      score += 35;
    } else {
      const tempDiff = Math.min(
        Math.abs(temp - crop.optimalTempMin),
        Math.abs(temp - crop.optimalTempMax)
      );
      score += Math.max(0, 35 - tempDiff * 2);
    }

    // Moisture score (35%)
    const moisture = sensorData.soil_humidity || 50;
    if (moisture >= crop.optimalMoistureMin && moisture <= crop.optimalMoistureMax) {
      score += 35;
    } else {
      const moistDiff = Math.min(
        Math.abs(moisture - crop.optimalMoistureMin),
        Math.abs(moisture - crop.optimalMoistureMax)
      );
      score += Math.max(0, 35 - moistDiff / 2);
    }

    // pH score (30%)
    const ph = sensorData.ph || 6.5;
    if (ph >= crop.optimalPHMin && ph <= crop.optimalPHMax) {
      score += 30;
    } else {
      const phDiff = Math.min(
        Math.abs(ph - crop.optimalPHMin),
        Math.abs(ph - crop.optimalPHMax)
      );
      score += Math.max(0, 30 - phDiff * 10);
    }

    return Math.round(score);
  }
}

export default new PredictionService();
