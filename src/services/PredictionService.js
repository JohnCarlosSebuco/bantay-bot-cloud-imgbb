/**
 * Prediction Service for BantayBot PWA
 *
 * Provides GDD calculations, harvest predictions, yield estimation,
 * and crop health assessments - matching React Native app functionality
 */

import indexedDBService from './IndexedDBService';

// Crop database with growing requirements
const CROP_DATABASE = {
  tomato: {
    name: 'Tomato',
    baseTemp: 10,
    requiredGDD: 2200,
    optimalTempMin: 18,
    optimalTempMax: 27,
    optimalMoistureMin: 400,
    optimalMoistureMax: 700,
    optimalPHMin: 6.0,
    optimalPHMax: 6.8,
    growthDays: 70,
    waterNeedLow: 25,
    waterNeedHigh: 50,
  },
  rice: {
    name: 'Rice',
    baseTemp: 10,
    requiredGDD: 3000,
    optimalTempMin: 20,
    optimalTempMax: 35,
    optimalMoistureMin: 600,
    optimalMoistureMax: 900,
    optimalPHMin: 5.5,
    optimalPHMax: 7.0,
    growthDays: 120,
    waterNeedLow: 100,
    waterNeedHigh: 150,
  },
  corn: {
    name: 'Corn',
    baseTemp: 10,
    requiredGDD: 2700,
    optimalTempMin: 15,
    optimalTempMax: 32,
    optimalMoistureMin: 500,
    optimalMoistureMax: 800,
    optimalPHMin: 6.0,
    optimalPHMax: 7.0,
    growthDays: 90,
    waterNeedLow: 40,
    waterNeedHigh: 60,
  },
  eggplant: {
    name: 'Eggplant',
    baseTemp: 15,
    requiredGDD: 1800,
    optimalTempMin: 21,
    optimalTempMax: 30,
    optimalMoistureMin: 450,
    optimalMoistureMax: 750,
    optimalPHMin: 5.5,
    optimalPHMax: 6.5,
    growthDays: 80,
    waterNeedLow: 30,
    waterNeedHigh: 45,
  },
  default: {
    name: 'General Crop',
    baseTemp: 10,
    requiredGDD: 2000,
    optimalTempMin: 15,
    optimalTempMax: 30,
    optimalMoistureMin: 400,
    optimalMoistureMax: 700,
    optimalPHMin: 6.0,
    optimalPHMax: 7.0,
    growthDays: 90,
    waterNeedLow: 30,
    waterNeedHigh: 50,
  }
};

class PredictionService {
  /**
   * Calculate Growing Degree Days (GDD)
   */
  calculateGDD(avgTemp, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    const gdd = Math.max(0, avgTemp - crop.baseTemp);
    return gdd;
  }

  /**
   * Calculate accumulated GDD from planting date
   */
  async calculateAccumulatedGDD(plantingDate, cropType = 'default') {
    try {
      const envHistory = await this.getEnvironmentalHistory();
      const planting = new Date(plantingDate);
      let accumulatedGDD = 0;

      envHistory.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= planting) {
          accumulatedGDD += this.calculateGDD(record.avgTemp, cropType);
        }
      });

      return accumulatedGDD;
    } catch (error) {
      console.error('Error calculating accumulated GDD:', error);
      return 0;
    }
  }

  /**
   * Predict harvest date based on GDD
   */
  async predictHarvestDate(plantingDate, cropType = 'default') {
    try {
      const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
      const accumulatedGDD = await this.calculateAccumulatedGDD(plantingDate, cropType);
      const remainingGDD = crop.requiredGDD - accumulatedGDD;

      // Get recent average daily GDD
      const envHistory = await this.getEnvironmentalHistory();
      const recentData = envHistory.slice(0, 7); // Last 7 days
      const avgDailyGDD = recentData.reduce((sum, record) =>
        sum + this.calculateGDD(record.avgTemp, cropType), 0) / recentData.length;

      const daysRemaining = Math.ceil(remainingGDD / avgDailyGDD);
      const harvestDate = new Date();
      harvestDate.setDate(harvestDate.getDate() + daysRemaining);

      const readinessPercent = Math.min(100, (accumulatedGDD / crop.requiredGDD) * 100);

      return {
        harvestDate,
        daysRemaining: Math.max(0, daysRemaining),
        accumulatedGDD,
        requiredGDD: crop.requiredGDD,
        readinessPercent,
        confidence: this.calculateConfidence(recentData.length, readinessPercent),
      };
    } catch (error) {
      console.error('Error predicting harvest date:', error);
      return null;
    }
  }

  /**
   * Predict harvest yield
   */
  async predictYield(plantingDate, cropType, plotSize, historicalAvgYield) {
    try {
      const yieldImpact = await this.calculateYieldImpact(plantingDate, cropType);
      const predictedYield = historicalAvgYield * (yieldImpact.score / 100);

      return {
        predictedYield: Math.round(predictedYield * 10) / 10,
        historicalAvg: historicalAvgYield,
        changePercent: ((predictedYield - historicalAvgYield) / historicalAvgYield * 100).toFixed(1),
        yieldPerSqMeter: (predictedYield / plotSize).toFixed(2),
        confidence: yieldImpact.confidence,
        factors: yieldImpact.factors,
      };
    } catch (error) {
      console.error('Error predicting yield:', error);
      return null;
    }
  }

  /**
   * Calculate yield impact score (0-100)
   */
  async calculateYieldImpact(plantingDate, cropType = 'default') {
    try {
      const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
      const envHistory = await this.getEnvironmentalHistory();
      const planting = new Date(plantingDate);

      let optimalDays = 0;
      let stressDays = 0;
      let totalDays = 0;

      envHistory.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= planting) {
          totalDays++;

          // Check if conditions are optimal
          const tempOptimal = record.avgTemp >= crop.optimalTempMin &&
                            record.avgTemp <= crop.optimalTempMax;
          const moistureOptimal = record.avgSoilMoisture >= crop.optimalMoistureMin &&
                                record.avgSoilMoisture <= crop.optimalMoistureMax;

          if (tempOptimal && moistureOptimal) {
            optimalDays++;
          }

          // Check for stress conditions
          if (record.stressEvents && record.stressEvents.length > 0) {
            stressDays++;
          }
        }
      });

      // Calculate component scores
      const optimalDaysScore = totalDays > 0 ? (optimalDays / totalDays) * 50 : 50;
      const stressScore = totalDays > 0 ? (1 - stressDays / totalDays) * 30 : 30;

      // Bird protection score
      const birdScore = await this.calculateBirdProtectionScore();

      const totalScore = optimalDaysScore + stressScore + (birdScore * 20);

      return {
        score: Math.round(totalScore),
        optimalDays,
        stressDays,
        totalDays,
        confidence: this.calculateConfidence(totalDays, totalScore),
        factors: {
          environmental: optimalDaysScore,
          stress: stressScore,
          birdProtection: birdScore * 20,
        }
      };
    } catch (error) {
      console.error('Error calculating yield impact:', error);
      return { score: 50, confidence: 'low' };
    }
  }

  /**
   * Calculate bird protection effectiveness
   */
  async calculateBirdProtectionScore() {
    try {
      const detectionHistory = await indexedDBService.getDetectionHistory(1000);

      if (detectionHistory.length === 0) return 1.0;

      // Calculate average birds per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysTracked = 30; // Last 30 days

      const recentDetections = detectionHistory.filter(d => {
        const date = new Date(d.timestamp);
        const daysDiff = (today - date) / (1000 * 60 * 60 * 24);
        return daysDiff <= daysTracked;
      });

      const avgBirdsPerDay = recentDetections.length / daysTracked;

      // Score: fewer birds = better protection
      // Assume >5 birds/day = poor, 0 birds = excellent
      const score = Math.max(0, Math.min(1, 1 - (avgBirdsPerDay / 10)));

      return score;
    } catch (error) {
      console.error('Error calculating bird protection score:', error);
      return 0.8; // Default good score
    }
  }

  /**
   * Assess current crop health
   */
  async assessCropHealth(currentTemp, currentHumidity, currentMoisture, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    const issues = [];
    let healthScore = 100;

    // Temperature check
    if (currentTemp < crop.optimalTempMin) {
      issues.push({ type: 'cold_stress', severity: 'medium', message: 'Temperature below optimal' });
      healthScore -= 15;
    } else if (currentTemp > crop.optimalTempMax) {
      issues.push({ type: 'heat_stress', severity: 'high', message: 'Heat stress detected' });
      healthScore -= 20;
    }

    // Moisture check
    if (currentMoisture < crop.optimalMoistureMin) {
      issues.push({ type: 'water_stress', severity: 'high', message: 'Soil moisture critically low' });
      healthScore -= 25;
    } else if (currentMoisture > crop.optimalMoistureMax) {
      issues.push({ type: 'overwater', severity: 'medium', message: 'Soil too wet' });
      healthScore -= 10;
    }

    // Disease risk based on humidity
    if (currentHumidity > 85 && currentTemp > 20 && currentTemp < 30) {
      issues.push({ type: 'disease_risk', severity: 'medium', message: 'High risk for fungal diseases' });
      healthScore -= 10;
    }

    return {
      score: Math.max(0, healthScore),
      status: this.getHealthStatus(healthScore),
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * Analyze rainfall patterns (replaces irrigation)
   */
  async analyzeRainfall() {
    try {
      const rainfallData = await indexedDBService.getRainfallLogs(90);

      const last7Days = rainfallData.slice(0, 7);
      const last30Days = rainfallData.slice(0, 30);

      const total7Days = last7Days.reduce((sum, r) => sum + r.amount, 0);
      const total30Days = last30Days.reduce((sum, r) => sum + r.amount, 0);

      const avgDaily7 = last7Days.length > 0 ? total7Days / 7 : 0;
      const avgDaily30 = last30Days.length > 0 ? total30Days / 30 : 0;

      // Find last rainfall
      const lastRain = rainfallData[0];
      const daysSinceRain = lastRain ?
        Math.floor((Date.now() - new Date(lastRain.date).getTime()) / (1000 * 60 * 60 * 24)) :
        999;

      return {
        last7Days: total7Days,
        last30Days: total30Days,
        avgDaily7,
        avgDaily30,
        daysSinceRain,
        lastRainDate: lastRain?.date,
        lastRainAmount: lastRain?.amount || 0,
        status: this.getRainfallStatus(daysSinceRain, avgDaily7),
      };
    } catch (error) {
      console.error('Error analyzing rainfall:', error);
      return null;
    }
  }

  /**
   * Generate water stress alert
   */
  async checkWaterStress(currentMoisture, cropType = 'default') {
    const crop = CROP_DATABASE[cropType] || CROP_DATABASE.default;
    const rainfall = await this.analyzeRainfall();

    let alert = null;
    let severity = 'none';

    if (currentMoisture < crop.optimalMoistureMin * 0.7) {
      severity = 'critical';
      alert = {
        title: '⚠️ Critical Water Stress',
        message: `Soil moisture very low. ${rainfall.daysSinceRain} days since last rain.`,
        recommendations: [
          'Monitor crops closely for wilting',
          'Consider emergency water supply if available',
          'Pray for rain or prepare for reduced yield',
        ],
      };
    } else if (currentMoisture < crop.optimalMoistureMin && rainfall.daysSinceRain > 7) {
      severity = 'high';
      alert = {
        title: '⚠️ Water Stress Warning',
        message: `Soil moisture below optimal. No rain for ${rainfall.daysSinceRain} days.`,
        recommendations: [
          'Watch for signs of drought stress',
          'Reduce other stressors if possible',
          'Hope for rainfall soon',
        ],
      };
    }

    return {
      hasAlert: alert !== null,
      severity,
      alert,
      currentMoisture,
      optimalMin: crop.optimalMoistureMin,
      daysSinceRain: rainfall?.daysSinceRain || 0,
    };
  }

  /**
   * Analyze bird activity patterns
   */
  async analyzeBirdPatterns() {
    try {
      const detections = await indexedDBService.getDetectionHistory(1000);

      if (detections.length === 0) {
        return {
          totalDetections: 0,
          avgPerDay: 0,
          peakHour: null,
          hourlyData: new Array(24).fill(0),
          weeklyTrend: [],
        };
      }

      // Hourly distribution
      const hourlyData = new Array(24).fill(0);
      detections.forEach(d => {
        const hour = new Date(d.timestamp).getHours();
        hourlyData[hour]++;
      });

      // Find peak hour
      let peakHour = 0;
      let maxDetections = 0;
      hourlyData.forEach((count, hour) => {
        if (count > maxDetections) {
          maxDetections = count;
          peakHour = hour;
        }
      });

      // Weekly trend (last 7 days)
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayCount = detections.filter(d => {
          const dDate = new Date(d.timestamp);
          return dDate >= date && dDate < nextDate;
        }).length;

        weeklyTrend.push({
          date: date.toISOString().split('T')[0],
          count: dayCount,
        });
      }

      const avgPerDay = detections.length / Math.min(30, detections.length);

      return {
        totalDetections: detections.length,
        avgPerDay: avgPerDay.toFixed(1),
        peakHour,
        peakHourDetections: maxDetections,
        hourlyData,
        weeklyTrend,
        effectiveness: await this.calculateBirdProtectionScore(),
      };
    } catch (error) {
      console.error('Error analyzing bird patterns:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive insights
   */
  async generateInsights(plantingDate, cropType, plotSize, historicalYield) {
    try {
      const harvestPrediction = await this.predictHarvestDate(plantingDate, cropType);
      const yieldPrediction = await this.predictYield(plantingDate, cropType, plotSize, historicalYield);
      const yieldImpact = await this.calculateYieldImpact(plantingDate, cropType);
      const rainfall = await this.analyzeRainfall();
      const birdPatterns = await this.analyzeBirdPatterns();

      const insights = [];

      // Harvest timing insight
      if (harvestPrediction && harvestPrediction.daysRemaining < 14) {
        insights.push({
          type: 'harvest_soon',
          priority: 'high',
          icon: '🌾',
          title: 'Harvest Approaching',
          message: `Harvest in ${harvestPrediction.daysRemaining} days`,
        });
      }

      // Yield prediction insight
      if (yieldPrediction && yieldPrediction.changePercent > 10) {
        insights.push({
          type: 'yield_increase',
          priority: 'medium',
          icon: '📈',
          title: 'Above Average Yield Expected',
          message: `+${yieldPrediction.changePercent}% vs historical average`,
        });
      } else if (yieldPrediction && yieldPrediction.changePercent < -10) {
        insights.push({
          type: 'yield_decrease',
          priority: 'high',
          icon: '📉',
          title: 'Below Average Yield Expected',
          message: `${yieldPrediction.changePercent}% vs historical average`,
        });
      }

      // Rainfall insight
      if (rainfall && rainfall.daysSinceRain > 10) {
        insights.push({
          type: 'drought',
          priority: 'high',
          icon: '☀️',
          title: 'Extended Dry Period',
          message: `${rainfall.daysSinceRain} days without rain`,
        });
      }

      // Bird activity insight
      if (birdPatterns && birdPatterns.avgPerDay > 5) {
        insights.push({
          type: 'bird_activity',
          priority: 'medium',
          icon: '🐦',
          title: 'High Bird Activity',
          message: `${birdPatterns.avgPerDay} birds per day average`,
        });
      }

      return {
        insights,
        summary: {
          harvestPrediction,
          yieldPrediction,
          yieldImpact,
          rainfall,
          birdPatterns,
        },
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return { insights: [], summary: {} };
    }
  }

  // Helper methods
  getHealthStatus(score) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  getRainfallStatus(daysSinceRain, avgDaily) {
    if (daysSinceRain > 14) return 'drought';
    if (daysSinceRain > 7) return 'dry';
    if (avgDaily > 10) return 'wet';
    return 'normal';
  }

  calculateConfidence(dataPoints, score) {
    if (dataPoints < 7) return 'low';
    if (dataPoints < 14 || score < 40) return 'medium';
    return 'high';
  }

  generateRecommendations(issues) {
    const recommendations = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'heat_stress':
          recommendations.push('Monitor crops during hottest hours');
          recommendations.push('Harvest may need to be expedited');
          break;
        case 'water_stress':
          recommendations.push('Critical: Find water source if possible');
          recommendations.push('Consider early harvest to save crop');
          break;
        case 'disease_risk':
          recommendations.push('Inspect plants for fungal diseases');
          recommendations.push('Improve air circulation if possible');
          break;
        case 'cold_stress':
          recommendations.push('Protect crops from cold if possible');
          recommendations.push('Consider covering plants at night');
          break;
        case 'overwater':
          recommendations.push('Improve drainage if possible');
          recommendations.push('Reduce watering frequency');
          break;
      }
    });

    return recommendations;
  }

  async getEnvironmentalHistory() {
    try {
      const data = await indexedDBService.getEnvironmentalData(null, 90);
      return data || [];
    } catch (error) {
      console.error('Error getting environmental history:', error);
      return [];
    }
  }

  getCropDatabase() {
    return CROP_DATABASE;
  }
}

const predictionService = new PredictionService();
export default predictionService;
export { CROP_DATABASE };
