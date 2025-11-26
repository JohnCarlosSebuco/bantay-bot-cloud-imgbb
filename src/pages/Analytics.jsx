import React, { useState, useEffect } from 'react';
import PredictionService from '../services/PredictionService';
import CropDataService from '../services/CropDataService';
import ConnectionManager from '../services/ConnectionManager';

export default function Analytics({ language }) {
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [harvestPrediction, setHarvestPrediction] = useState(null);
  const [yieldPrediction, setYieldPrediction] = useState(null);
  const [yieldImpact, setYieldImpact] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sensor data state
  const [sensorData, setSensorData] = useState({
    soilHumidity: 45,
    soilTemperature: 24.2,
    soilConductivity: 850,
    ph: 6.8,
  });

  const texts = {
    en: {
      title: 'Analytics',
      subtitle: 'AI-powered insights',
      predictionStatus: 'Prediction Status',
      modelActive: 'Active',
      lastUpdated: 'Updated',
      accuracy: 'Accuracy',
      harvestPrediction: 'Harvest',
      yieldForecast: 'Yield',
      yieldImpact: 'Yield Impact',
      insights: 'Insights',
      daysLeft: 'days left',
      expectedYield: 'expected',
      refresh: 'Refresh',
      noData: 'No crop data',
      addCropInfo: 'Add crop info in Settings',
      loading: 'Loading...',
    },
    tl: {
      title: 'Analytics',
      subtitle: 'AI-powered insights',
      predictionStatus: 'Status',
      modelActive: 'Aktibo',
      lastUpdated: 'Update',
      accuracy: 'Accuracy',
      harvestPrediction: 'Ani',
      yieldForecast: 'Yield',
      yieldImpact: 'Impact',
      insights: 'Insights',
      daysLeft: 'araw nalang',
      expectedYield: 'inaasahan',
      refresh: 'I-refresh',
      noData: 'Walang data',
      addCropInfo: 'Magdagdag sa Settings',
      loading: 'Loading...',
    }
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    loadData();

    // Listen for sensor data updates
    const handleData = (data) => {
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
      setSensorData({
        soilHumidity: safeNumber(data?.soilHumidity, 45),
        soilTemperature: safeNumber(data?.soilTemperature, 24),
        soilConductivity: safeNumber(data?.soilConductivity, 850),
        ph: safeNumber(data?.ph, 6.8),
      });
    };

    ConnectionManager.onStatusUpdate(handleData);
  }, []);

  const loadData = async () => {
    try {
      const crop = await CropDataService.getCropData();
      setCropData(crop);

      if (crop && crop.plantingDate) {
        const avgYield = await CropDataService.getAverageYield(crop.cropType);
        const harvestPred = await PredictionService.predictHarvestDate(crop.plantingDate, crop.cropType);
        setHarvestPrediction(harvestPred);

        const yieldPred = await PredictionService.predictYield(
          crop.plantingDate, crop.cropType, crop.plotSize || 100, avgYield || crop.expectedYield || 100
        );
        setYieldPrediction(yieldPred);

        const impact = await PredictionService.calculateYieldImpact(crop.plantingDate, crop.cropType);
        setYieldImpact(impact);

        const insightsData = await PredictionService.generateInsights(
          crop.plantingDate, crop.cropType, crop.plotSize || 100, avgYield || crop.expectedYield || 100
        );
        setInsights(insightsData.insights);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Soil Health Calculation Functions
  const getSensorScore = (value, min, optimalMin, optimalMax, max) => {
    if (value >= optimalMin && value <= optimalMax) return 100;
    if (value < min || value > max) return 0;
    if (value < optimalMin) return Math.round(((value - min) / (optimalMin - min)) * 100);
    return Math.round(((max - value) / (max - optimalMax)) * 100);
  };

  const getSensorStatus = (score) => {
    if (score >= 80) return { status: 'optimal', color: 'success', label: language === 'tl' ? 'Sakto' : 'Optimal' };
    if (score >= 50) return { status: 'warning', color: 'warning', label: language === 'tl' ? 'Babala' : 'Warning' };
    return { status: 'critical', color: 'error', label: language === 'tl' ? 'Kritikal' : 'Critical' };
  };

  // Calculate individual sensor scores
  const humidityScore = getSensorScore(sensorData.soilHumidity, 0, 40, 70, 100);
  const temperatureScore = getSensorScore(sensorData.soilTemperature, 10, 20, 30, 45);
  const conductivityScore = getSensorScore(sensorData.soilConductivity, 0, 200, 2000, 4000);
  const phScore = getSensorScore(sensorData.ph, 3, 5.5, 7.5, 10);

  // Overall health score (weighted average)
  const overallHealthScore = Math.round((humidityScore * 0.3 + temperatureScore * 0.25 + conductivityScore * 0.25 + phScore * 0.2));

  const getOverallStatus = (score) => {
    if (score >= 80) return { label: language === 'tl' ? 'Napakahusay' : 'Excellent', color: 'success' };
    if (score >= 60) return { label: language === 'tl' ? 'Mabuti' : 'Good', color: 'success' };
    if (score >= 40) return { label: language === 'tl' ? 'Babala' : 'Warning', color: 'warning' };
    return { label: language === 'tl' ? 'Kritikal' : 'Critical', color: 'error' };
  };

  // Generate recommendations based on sensor values
  const getRecommendations = () => {
    const recommendations = [];

    if (sensorData.soilHumidity < 40) {
      recommendations.push({
        icon: '\u{1F4A7}', action: language === 'tl' ? 'Diligan ang bukid' : 'Irrigate field',
        reason: language === 'tl' ? 'Tuyo ang lupa' : 'Soil is dry', priority: 'high', color: 'error'
      });
    } else if (sensorData.soilHumidity > 70) {
      recommendations.push({
        icon: '\u{1F6B0}', action: language === 'tl' ? 'Patubigan ang bukid' : 'Drain excess water',
        reason: language === 'tl' ? 'Sobrang basa' : 'Too wet', priority: 'medium', color: 'warning'
      });
    }

    if (sensorData.soilTemperature > 30) {
      recommendations.push({
        icon: '\u{1F321}', action: language === 'tl' ? 'Maglagay ng pantakip' : 'Add mulch/shade',
        reason: language === 'tl' ? 'Mainit ang lupa' : 'Soil too hot', priority: 'medium', color: 'warning'
      });
    } else if (sensorData.soilTemperature < 20) {
      recommendations.push({
        icon: '\u{2744}', action: language === 'tl' ? 'Protektahan sa lamig' : 'Protect from cold',
        reason: language === 'tl' ? 'Malamig ang lupa' : 'Soil too cold', priority: 'low', color: 'info'
      });
    }

    if (sensorData.soilConductivity < 200) {
      recommendations.push({
        icon: '\u{1F33F}', action: language === 'tl' ? 'Maglagay ng pataba' : 'Apply fertilizer',
        reason: language === 'tl' ? 'Kulang sa sustansya' : 'Low nutrients', priority: 'medium', color: 'warning'
      });
    } else if (sensorData.soilConductivity > 2000) {
      recommendations.push({
        icon: '\u{26A1}', action: language === 'tl' ? 'Bawasan ang pataba' : 'Reduce fertilizer',
        reason: language === 'tl' ? 'Sobrang sustansya' : 'High salinity', priority: 'medium', color: 'warning'
      });
    }

    if (sensorData.ph < 5.5) {
      recommendations.push({
        icon: '\u{1F9EA}', action: language === 'tl' ? 'Dagdagan ngite' : 'Additeite calcium',
        reason: language === 'tl' ? 'Masyado asido' : 'Too acidic', priority: 'high', color: 'error'
      });
    } else if (sensorData.ph > 7.5) {
      recommendations.push({
        icon: '\u{1F9EA}', action: language === 'tl' ? 'Maglagay ng sulfur' : 'Apply sulfur',
        reason: language === 'tl' ? 'Masyado alkaline' : 'Too alkaline', priority: 'medium', color: 'warning'
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return recommendations;
  };

  const recommendations = getRecommendations();
  const overallStatus = getOverallStatus(overallHealthScore);

  // No Data State - still show Soil Health cards
  if (!cropData) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="max-w-lg mx-auto">
          <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4">
            <div className="flex items-center mb-1 sm:mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-info/20 flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="px-3 sm:px-4 pb-10 space-y-3 sm:space-y-4">
            {/* Soil Health Score Card */}
            <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Kalusugan ng Lupa' : 'Soil Health'}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-${overallStatus.color}/20 text-${overallStatus.color}`}>
                      {overallStatus.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(humidityScore).color}/20`}>
                        <span className="text-sm sm:text-base">{'\u{1F4A7}'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Halumigmig' : 'Humidity'}</div>
                        <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(humidityScore).color}`}>{getSensorStatus(humidityScore).label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(temperatureScore).color}/20`}>
                        <span className="text-sm sm:text-base">{'\u{1F321}'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Temperatura' : 'Temperature'}</div>
                        <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(temperatureScore).color}`}>{getSensorStatus(temperatureScore).label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(conductivityScore).color}/20`}>
                        <span className="text-sm sm:text-base">{'\u{26A1}'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Sustansya' : 'Nutrients'}</div>
                        <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(conductivityScore).color}`}>{getSensorStatus(conductivityScore).label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(phScore).color}/20`}>
                        <span className="text-sm sm:text-base">{'\u{1F9EA}'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] sm:text-xs text-secondary truncate">pH Level</div>
                        <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(phScore).color}`}>{getSensorStatus(phScore).label}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={overallHealthScore >= 60 ? '#22c55e' : overallHealthScore >= 40 ? '#eab308' : '#ef4444'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${overallHealthScore * 2.64} ${100 * 2.64}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-lg sm:text-xl font-bold text-${overallStatus.color}`}>{overallHealthScore}%</span>
                      <span className="text-[8px] sm:text-[10px] text-secondary">{language === 'tl' ? 'Kalusugan' : 'Health'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Recommendations Card */}
            <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Mga Rekomendasyon' : 'Recommendations'}</h3>
                <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                  recommendations.length === 0 ? 'bg-success/20 text-success'
                    : recommendations[0]?.priority === 'high' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                }`}>
                  {recommendations.length === 0 ? (language === 'tl' ? 'Lahat OK' : 'All Good')
                    : `${recommendations.length} ${language === 'tl' ? 'aksyon' : 'action'}${recommendations.length > 1 ? 's' : ''}`}
                </span>
              </div>
              {recommendations.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl sm:text-3xl">{'\u{2705}'}</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-success mb-1">
                    {language === 'tl' ? 'Lahat ng kondisyon ay optimal!' : 'All conditions are optimal!'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-secondary">
                    {language === 'tl' ? 'Walang aksyon na kailangan' : 'No action needed at this time'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-l-4 ${
                      rec.priority === 'high' ? 'bg-error/5 border-error'
                        : rec.priority === 'medium' ? 'bg-warning/5 border-warning' : 'bg-info/5 border-info'
                    }`}>
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        rec.priority === 'high' ? 'bg-error/20' : rec.priority === 'medium' ? 'bg-warning/20' : 'bg-info/20'
                      }`}>
                        <span className="text-lg sm:text-xl">{rec.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold ${
                          rec.priority === 'high' ? 'text-error' : rec.priority === 'medium' ? 'text-warning' : 'text-info'
                        }`}>{rec.action}</p>
                        <p className="text-[10px] sm:text-xs text-secondary truncate">{rec.reason}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase ${
                        rec.priority === 'high' ? 'bg-error/20 text-error'
                          : rec.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'
                      }`}>
                        {rec.priority === 'high' ? (language === 'tl' ? 'Mataas' : 'High')
                          : rec.priority === 'medium' ? (language === 'tl' ? 'Katamtaman' : 'Med') : (language === 'tl' ? 'Mababa' : 'Low')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 mt-3 border-t border-primary">
                <p className="text-[10px] sm:text-xs text-secondary leading-relaxed">
                  {language === 'tl' ? 'Batay sa real-time na datos ng sensor ng lupa.' : 'Based on real-time soil sensor data.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-info/20 flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2
                ${refreshing ? 'bg-tertiary text-secondary cursor-wait' : 'bg-brand text-white hover:bg-brand/90 cursor-pointer'}
              `}
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">{refreshing ? t.loading : t.refresh}</span>
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10 space-y-3 sm:space-y-4">
          {/* Soil Health Score Card */}
          <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Kalusugan ng Lupa' : 'Soil Health'}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-${overallStatus.color}/20 text-${overallStatus.color}`}>
                    {overallStatus.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(humidityScore).color}/20`}>
                      <span className="text-sm sm:text-base">{'\u{1F4A7}'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Halumigmig' : 'Humidity'}</div>
                      <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(humidityScore).color}`}>{getSensorStatus(humidityScore).label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(temperatureScore).color}/20`}>
                      <span className="text-sm sm:text-base">{'\u{1F321}'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Temperatura' : 'Temperature'}</div>
                      <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(temperatureScore).color}`}>{getSensorStatus(temperatureScore).label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(conductivityScore).color}/20`}>
                      <span className="text-sm sm:text-base">{'\u{26A1}'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-secondary truncate">{language === 'tl' ? 'Sustansya' : 'Nutrients'}</div>
                      <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(conductivityScore).color}`}>{getSensorStatus(conductivityScore).label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-${getSensorStatus(phScore).color}/20`}>
                      <span className="text-sm sm:text-base">{'\u{1F9EA}'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-secondary truncate">pH Level</div>
                      <div className={`text-xs sm:text-sm font-semibold text-${getSensorStatus(phScore).color}`}>{getSensorStatus(phScore).label}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={overallHealthScore >= 60 ? '#22c55e' : overallHealthScore >= 40 ? '#eab308' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${overallHealthScore * 2.64} ${100 * 2.64}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg sm:text-xl font-bold text-${overallStatus.color}`}>{overallHealthScore}%</span>
                    <span className="text-[8px] sm:text-[10px] text-secondary">{language === 'tl' ? 'Kalusugan' : 'Health'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Recommendations Card */}
          <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Mga Rekomendasyon' : 'Recommendations'}</h3>
              <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                recommendations.length === 0 ? 'bg-success/20 text-success'
                  : recommendations[0]?.priority === 'high' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
              }`}>
                {recommendations.length === 0 ? (language === 'tl' ? 'Lahat OK' : 'All Good')
                  : `${recommendations.length} ${language === 'tl' ? 'aksyon' : 'action'}${recommendations.length > 1 ? 's' : ''}`}
              </span>
            </div>
            {recommendations.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl sm:text-3xl">{'\u{2705}'}</span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-success mb-1">
                  {language === 'tl' ? 'Lahat ng kondisyon ay optimal!' : 'All conditions are optimal!'}
                </p>
                <p className="text-[10px] sm:text-xs text-secondary">
                  {language === 'tl' ? 'Walang aksyon na kailangan' : 'No action needed at this time'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-l-4 ${
                    rec.priority === 'high' ? 'bg-error/5 border-error'
                      : rec.priority === 'medium' ? 'bg-warning/5 border-warning' : 'bg-info/5 border-info'
                  }`}>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rec.priority === 'high' ? 'bg-error/20' : rec.priority === 'medium' ? 'bg-warning/20' : 'bg-info/20'
                    }`}>
                      <span className="text-lg sm:text-xl">{rec.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-semibold ${
                        rec.priority === 'high' ? 'text-error' : rec.priority === 'medium' ? 'text-warning' : 'text-info'
                      }`}>{rec.action}</p>
                      <p className="text-[10px] sm:text-xs text-secondary truncate">{rec.reason}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase ${
                      rec.priority === 'high' ? 'bg-error/20 text-error'
                        : rec.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'
                    }`}>
                      {rec.priority === 'high' ? (language === 'tl' ? 'Mataas' : 'High')
                        : rec.priority === 'medium' ? (language === 'tl' ? 'Katamtaman' : 'Med') : (language === 'tl' ? 'Mababa' : 'Low')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 mt-3 border-t border-primary">
              <p className="text-[10px] sm:text-xs text-secondary leading-relaxed">
                {language === 'tl' ? 'Batay sa real-time na datos ng sensor ng lupa.' : 'Based on real-time soil sensor data.'}
              </p>
            </div>
          </div>

          {/* Prediction Status Card */}
          <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <span className="text-base sm:text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-primary">{t.predictionStatus}</h3>
                  <p className="text-[10px] sm:text-xs text-secondary">{t.lastUpdated}: {formatTime(lastUpdated)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] sm:text-xs font-semibold text-success uppercase">{t.modelActive}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-tertiary rounded-xl p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-success">94%</div>
                <div className="text-[10px] sm:text-xs text-secondary">{t.accuracy}</div>
              </div>
              <div className="bg-tertiary rounded-xl p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-info">{insights.length}</div>
                <div className="text-[10px] sm:text-xs text-secondary">{t.insights}</div>
              </div>
              <div className="bg-tertiary rounded-xl p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-warning">{yieldImpact?.factors?.length || 0}</div>
                <div className="text-[10px] sm:text-xs text-secondary">Factors</div>
              </div>
            </div>
          </div>

          {/* Prediction Cards Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Harvest Prediction */}
            {harvestPrediction && (
              <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-base sm:text-xl">🗓️</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-brand mb-1">{harvestPrediction.daysLeft}</div>
                <div className="text-xs sm:text-sm text-secondary mb-2">{t.daysLeft}</div>
                <div className={`inline-block px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase
                  ${harvestPrediction.confidence === 'high' ? 'bg-success/20 text-success' :
                    harvestPrediction.confidence === 'medium' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}
                `}>
                  {harvestPrediction.confidence}
                </div>
                <div className="text-[10px] sm:text-xs text-secondary mt-2">{formatDate(harvestPrediction.estimatedDate)}</div>
              </div>
            )}

            {/* Yield Forecast */}
            {yieldPrediction && (
              <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-base sm:text-xl">🌾</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-success mb-1">{yieldPrediction.predicted?.toFixed(0) || 0}</div>
                <div className="text-xs sm:text-sm text-secondary mb-2">{t.expectedYield}</div>
                <div className={`inline-block px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase
                  ${yieldPrediction.confidence === 'high' ? 'bg-success/20 text-success' :
                    yieldPrediction.confidence === 'medium' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}
                `}>
                  {yieldPrediction.confidence}
                </div>
                <div className="text-[10px] sm:text-xs text-secondary mt-2">{yieldPrediction.growthStage}</div>
              </div>
            )}
          </div>

          {/* Yield Impact */}
          {yieldImpact && yieldImpact.factors && (
            <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                  <span className="text-sm sm:text-base">📈</span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary">{t.yieldImpact}</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {yieldImpact.factors.map((factor, index) => (
                  <div key={index} className="bg-tertiary rounded-xl p-2 sm:p-3 text-center">
                    <div className={`text-base sm:text-lg font-bold ${factor.impact > 0 ? 'text-success' : 'text-error'}`}>
                      {factor.impact > 0 ? '+' : ''}{factor.impact?.toFixed(1)}%
                    </div>
                    <div className="text-[10px] sm:text-xs text-secondary truncate">{factor.factor}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-info/20 flex items-center justify-center">
                  <span className="text-sm sm:text-base">💡</span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary">{t.insights}</h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-tertiary rounded-xl p-2 sm:p-3 border border-secondary">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase
                        ${insight.priority === 'high' ? 'bg-error/20 text-error' :
                          insight.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'}
                      `}>
                        {insight.priority}
                      </span>
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold
                        ${insight.confidence === 'high' ? 'bg-success/20 text-success' :
                          insight.confidence === 'medium' ? 'bg-warning/20 text-warning' : 'bg-tertiary text-secondary'}
                      `}>
                        {insight.confidence}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-primary leading-relaxed">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
