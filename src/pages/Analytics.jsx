import React, { useState, useEffect } from 'react';
import PredictionService from '../services/PredictionService';
import CropDataService from '../services/CropDataService';

export default function Analytics({ language }) {
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [harvestPrediction, setHarvestPrediction] = useState(null);
  const [yieldPrediction, setYieldPrediction] = useState(null);
  const [yieldImpact, setYieldImpact] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

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

  // No Data State
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
          <div className="px-3 sm:px-4 pb-10">
            <div className="surface-primary rounded-2xl p-6 sm:p-8 text-center border border-primary">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🌾</div>
              <h3 className="text-base sm:text-lg font-bold text-primary mb-2">{t.noData}</h3>
              <p className="text-xs sm:text-sm text-secondary">{t.addCropInfo}</p>
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
