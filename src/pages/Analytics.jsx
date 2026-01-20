import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Bot, Calendar, TrendingUp, Lightbulb, HelpCircle } from 'lucide-react';
import PredictionService from '../services/PredictionService';
import CropDataService from '../services/CropDataService';
import ConnectionManager from '../services/ConnectionManager';
import FirebaseService from '../services/FirebaseService';
import DeviceService from '../services/DeviceService';
import { CONFIG } from '../config/config';
import { SoilHealthCard, SmartRecommendations } from '../components/ui';
import { useTour } from '../contexts/TourContext';
import { analyticsTourSteps } from '../config/tourSteps';

export default function Analytics({ language }) {
  const { startTour, isFirstTimeUser, isTourCompleted } = useTour();
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [insights, setInsights] = useState([]);
  const [harvestPrediction, setHarvestPrediction] = useState(null);
  const [yieldPrediction, setYieldPrediction] = useState(null);
  const [yieldImpact, setYieldImpact] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sensor data state (with dual sensor support)
  const [sensorData, setSensorData] = useState({
    // Sensor 1 values
    soil1Humidity: 45,
    soil1Temperature: 24.2,
    soil1Conductivity: 850,
    soil1PH: 6.8,
    // Sensor 2 values
    soil2Humidity: 45,
    soil2Temperature: 24.2,
    soil2Conductivity: 850,
    soil2PH: 6.8,
    // Averaged values (backward compatibility)
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

  // Auto-start tour for first-time users on this page
  useEffect(() => {
    if (isFirstTimeUser && !isTourCompleted('analytics')) {
      const timer = setTimeout(() => {
        startTour('analytics', analyticsTourSteps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTourCompleted, startTour]);

  useEffect(() => {
    loadData();

    // Initialize Firebase
    const initServices = async () => {
      try {
        await FirebaseService.initialize();
        console.log('Firebase ready for Analytics page');
      } catch (error) {
        console.warn('Firebase initialization warning:', error);
      }
    };

    initServices();

    // Listen for sensor data updates from ConnectionManager
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

    // Subscribe to Firebase sensor data for real-time updates
    const unsubscribeSensor = DeviceService.subscribeToSensorData(CONFIG.DEVICE_ID, (data) => {
      if (data) {
        console.log('📡 Firebase sensor data received on Analytics:', data);
        const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
        setSensorData(prev => ({
          // Sensor 1 values
          soil1Humidity: safeNumber(data.soil1Humidity, data.soilHumidity ?? prev.soil1Humidity),
          soil1Temperature: safeNumber(data.soil1Temperature, data.soilTemperature ?? prev.soil1Temperature),
          soil1Conductivity: safeNumber(data.soil1Conductivity, data.soilConductivity ?? prev.soil1Conductivity),
          soil1PH: safeNumber(data.soil1PH, data.ph ?? prev.soil1PH),
          // Sensor 2 values
          soil2Humidity: safeNumber(data.soil2Humidity, data.soilHumidity ?? prev.soil2Humidity),
          soil2Temperature: safeNumber(data.soil2Temperature, data.soilTemperature ?? prev.soil2Temperature),
          soil2Conductivity: safeNumber(data.soil2Conductivity, data.soilConductivity ?? prev.soil2Conductivity),
          soil2PH: safeNumber(data.soil2PH, data.ph ?? prev.soil2PH),
          // Averaged values (backward compatibility)
          soilHumidity: safeNumber(data.soilHumidity, prev.soilHumidity),
          soilTemperature: safeNumber(data.soilTemperature, prev.soilTemperature),
          soilConductivity: safeNumber(data.soilConductivity, prev.soilConductivity),
          ph: safeNumber(data.ph, prev.ph),
        }));
        setLastUpdated(new Date());
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubscribeSensor) {
        unsubscribeSensor();
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    // Set initial state based on current scroll
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  // No Data State - still show Soil Health cards
  if (!cropData) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="max-w-lg mx-auto">
          <div className="px-3 sm:px-4">
            <div
              data-tour="analytics-header"
              className={`sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-4 sm:pt-5 pb-2 sm:pb-3
                backdrop-blur-sm border-b transition-colors
                ${scrolled ? 'bg-secondary/95 border-secondary/40 shadow-sm' : 'bg-secondary/90 border-transparent'}
              `}
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-info/20 flex items-center justify-center mr-2 sm:mr-3">
                    <BarChart3 size={24} className="text-info" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                    <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
                  </div>
                </div>
                {/* Info Button for Tour */}
                <button
                  onClick={() => startTour('analytics', analyticsTourSteps)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-info/20 flex items-center justify-center hover:bg-info/30 transition-colors"
                  aria-label={language === 'tl' ? 'Gabay sa paggamit' : 'Help guide'}
                >
                  <HelpCircle size={20} className="text-info" />
                </button>
              </div>
            </div>
          </div>
          <div className="px-3 sm:px-4 pb-10 space-y-3 sm:space-y-4">
            {/* Soil Health Score Card */}
            <div data-tour="analytics-soil-health">
              <SoilHealthCard sensorData={sensorData} language={language} />
            </div>

            {/* Smart Recommendations Card */}
            <div data-tour="analytics-recommendations">
              <SmartRecommendations sensorData={sensorData} language={language} />
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
        <div className="px-3 sm:px-4">
          <div
            data-tour="analytics-header"
            className={`sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-4 sm:pt-5 pb-2 sm:pb-3
              backdrop-blur-sm border-b transition-colors
              ${scrolled ? 'bg-secondary/95 border-secondary/40 shadow-sm' : 'bg-secondary/90 border-transparent'}
            `}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-info/20 flex items-center justify-center mr-2 sm:mr-3">
                  <BarChart3 size={24} className="text-info" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                  <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Info Button for Tour */}
                <button
                  onClick={() => startTour('analytics', analyticsTourSteps)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-info/20 flex items-center justify-center hover:bg-info/30 transition-colors"
                  aria-label={language === 'tl' ? 'Gabay sa paggamit' : 'Help guide'}
                >
                  <HelpCircle size={20} className="text-info" />
                </button>
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2
                    ${refreshing ? 'bg-tertiary text-secondary cursor-wait' : 'bg-brand text-white hover:bg-brand/90 cursor-pointer'}
                  `}
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{refreshing ? t.loading : t.refresh}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10 space-y-3 sm:space-y-4">
          {/* Soil Health Score Card */}
          <div data-tour="analytics-soil-health">
            <SoilHealthCard sensorData={sensorData} language={language} />
          </div>

          {/* Smart Recommendations Card */}
          <div data-tour="analytics-recommendations">
            <SmartRecommendations sensorData={sensorData} language={language} />
          </div>

          {/* Prediction Status Card */}
          <div className="surface-primary rounded-2xl p-3 sm:p-4 border border-primary shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Bot size={20} className="text-success" />
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
                  <Calendar size={20} className="text-brand" />
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
                  <TrendingUp size={18} className="text-warning" />
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
                  <Lightbulb size={18} className="text-info" />
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
