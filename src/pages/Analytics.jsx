import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import PredictionService from '../services/PredictionService';
import CropDataService from '../services/CropDataService';

export default function Analytics({ language }) {
  const { currentTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [harvestPrediction, setHarvestPrediction] = useState(null);
  const [yieldPrediction, setYieldPrediction] = useState(null);
  const [yieldImpact, setYieldImpact] = useState(null);
  const [cropData, setCropData] = useState(null);
  const fadeOpacity = useRef(1);

  const texts = {
    en: {
      title: 'Analytics Dashboard',
      subtitle: 'Crop insights and predictions',
      harvestPrediction: 'Harvest Prediction',
      yieldForecast: 'Yield Forecast',
      yieldImpact: 'Yield Impact Analysis',
      insights: 'AI Insights',
      confidence: 'Confidence',
      priority: 'Priority',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      daysLeft: 'days left',
      expectedYield: 'Expected Yield',
      currentGrowth: 'Current Growth',
      refresh: 'Refresh',
      noData: 'No crop data available. Please add crop information in Settings.',
      loading: 'Loading analytics...'
    },
    tl: {
      title: 'Dashboard ng Analytics',
      subtitle: 'Mga insight at prediction ng pananim',
      harvestPrediction: 'Prediction ng Ani',
      yieldForecast: 'Forecast ng Ani',
      yieldImpact: 'Analysis ng Impact ng Ani',
      insights: 'AI Insights',
      confidence: 'Kumpiyansa',
      priority: 'Prioridad',
      high: 'Mataas',
      medium: 'Katamtaman',
      low: 'Mababa',
      daysLeft: 'araw nalang',
      expectedYield: 'Inaasahang Ani',
      currentGrowth: 'Kasalukuyang Paglaki',
      refresh: 'I-refresh',
      noData: 'Walang data ng pananim. Magdagdag ng impormasyon sa Settings.',
      loading: 'Naglo-load ng analytics...'
    }
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    // Fade in animation
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 500, 1);
      fadeOpacity.current = progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const crop = await CropDataService.getCropData();
      setCropData(crop);

      if (crop && crop.plantingDate) {
        const avgYield = await CropDataService.getAverageYield(crop.cropType);

        const harvestPred = await PredictionService.predictHarvestDate(
          crop.plantingDate,
          crop.cropType
        );
        setHarvestPrediction(harvestPred);

        const yieldPred = await PredictionService.predictYield(
          crop.plantingDate,
          crop.cropType,
          crop.plotSize || 100,
          avgYield || crop.expectedYield || 100
        );
        setYieldPrediction(yieldPred);

        const impact = await PredictionService.calculateYieldImpact(
          crop.plantingDate,
          crop.cropType
        );
        setYieldImpact(impact);

        const insightsData = await PredictionService.generateInsights(
          crop.plantingDate,
          crop.cropType,
          crop.plotSize || 100,
          avgYield || crop.expectedYield || 100
        );
        setInsights(insightsData.insights);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return currentTheme.colors.success;
    if (confidence === 'medium') return currentTheme.colors.warning;
    return currentTheme.colors.error;
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return currentTheme.colors.error;
    if (priority === 'medium') return currentTheme.colors.warning;
    return currentTheme.colors.info;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: currentTheme.colors.background,
    opacity: fadeOpacity.current || 1,
    transition: 'opacity 0.5s ease-in',
    overflowY: 'auto'
  };

  const headerStyle = {
    paddingTop: '60px',
    paddingBottom: currentTheme.spacing['6'] + 'px',
    paddingLeft: currentTheme.spacing['4'] + 'px',
    paddingRight: currentTheme.spacing['4'] + 'px',
    backgroundColor: currentTheme.colors.background
  };

  const headerTopStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['4'] + 'px'
  };

  const brandSectionStyle = {
    flex: 1
  };

  const brandRowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['1'] + 'px'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    letterSpacing: '-0.5px',
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const subtitleStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    fontWeight: currentTheme.typography.weights.medium
  };

  const refreshButtonStyle = {
    padding: currentTheme.spacing['2'] + 'px',
    borderRadius: currentTheme.borderRadius.md + 'px',
    backgroundColor: currentTheme.colors.primary,
    color: 'white',
    border: 'none',
    fontSize: currentTheme.typography.sizes.sm,
    fontWeight: currentTheme.typography.weights.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['2'] + 'px'
  };

  const contentStyle = {
    padding: currentTheme.spacing['4'] + 'px',
    paddingBottom: '100px'
  };

  const cardStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['4'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`
  };

  const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const cardTitleStyle = {
    fontSize: currentTheme.typography.sizes.lg,
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.text,
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const predictionRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['4'] + 'px'
  };

  const predictionCardStyle = {
    ...cardStyle,
    textAlign: 'center'
  };

  const predictionValueStyle = {
    fontSize: '28px',
    fontWeight: currentTheme.typography.weights.bold,
    color: currentTheme.colors.primary,
    marginBottom: currentTheme.spacing['1'] + 'px'
  };

  const predictionLabelStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    marginBottom: currentTheme.spacing['2'] + 'px'
  };

  const confidenceStyle = {
    fontSize: currentTheme.typography.sizes.xs,
    fontWeight: currentTheme.typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const insightItemStyle = {
    padding: currentTheme.spacing['3'] + 'px',
    backgroundColor: currentTheme.colors.background,
    borderRadius: currentTheme.borderRadius.lg + 'px',
    border: `1px solid ${currentTheme.colors.border}`,
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const insightHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['2'] + 'px'
  };

  const insightMessageStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.text,
    lineHeight: 1.4
  };

  const badgeStyle = {
    fontSize: currentTheme.typography.sizes.xs,
    fontWeight: currentTheme.typography.weights.bold,
    padding: `${currentTheme.spacing['1']}px ${currentTheme.spacing['2']}px`,
    borderRadius: currentTheme.borderRadius.md + 'px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const noDataStyle = {
    textAlign: 'center',
    padding: currentTheme.spacing['8'] + 'px',
    color: currentTheme.colors.textSecondary
  };

  if (!cropData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={headerTopStyle}>
            <div style={brandSectionStyle}>
              <div style={brandRowStyle}>
                <span style={{ fontSize: '28px', color: currentTheme.colors.primary }}>📊</span>
                <h1 style={titleStyle}>{t.title}</h1>
              </div>
              <p style={subtitleStyle}>{t.subtitle}</p>
            </div>
            <button onClick={onRefresh} style={refreshButtonStyle} disabled={refreshing}>
              <span>🔄</span>
              <span>{refreshing ? t.loading : t.refresh}</span>
            </button>
          </div>
        </div>

        <div style={contentStyle}>
          <div style={noDataStyle}>
            <div style={{ fontSize: '64px', marginBottom: currentTheme.spacing['4'] + 'px' }}>🌾</div>
            <div style={{ fontSize: currentTheme.typography.sizes.lg, marginBottom: currentTheme.spacing['2'] + 'px' }}>
              {t.noData}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ opacity: fadeOpacity.current }}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerTopStyle}>
            <div style={brandSectionStyle}>
              <div style={brandRowStyle}>
                <span style={{ fontSize: '28px', color: currentTheme.colors.primary }}>📊</span>
                <h1 style={titleStyle}>{t.title}</h1>
              </div>
              <p style={subtitleStyle}>{t.subtitle}</p>
            </div>
            <button onClick={onRefresh} style={refreshButtonStyle} disabled={refreshing}>
              <span>🔄</span>
              <span>{refreshing ? t.loading : t.refresh}</span>
            </button>
          </div>
        </div>

        <div style={contentStyle}>
          {/* Prediction Cards */}
          <div style={predictionRowStyle}>
            {/* Harvest Prediction */}
            {harvestPrediction && (
              <div style={predictionCardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={{ fontSize: '20px', color: currentTheme.colors.primary }}>🗓️</span>
                  <h3 style={cardTitleStyle}>{t.harvestPrediction}</h3>
                </div>
                <div style={predictionValueStyle}>
                  {harvestPrediction.daysLeft}
                </div>
                <div style={predictionLabelStyle}>{t.daysLeft}</div>
                <div style={{
                  ...confidenceStyle,
                  color: getConfidenceColor(harvestPrediction.confidence)
                }}>
                  {t.confidence}: {harvestPrediction.confidence}
                </div>
                <div style={{ fontSize: currentTheme.typography.sizes.xs, color: currentTheme.colors.textSecondary, marginTop: currentTheme.spacing['1'] + 'px' }}>
                  {formatDate(harvestPrediction.estimatedDate)}
                </div>
              </div>
            )}

            {/* Yield Prediction */}
            {yieldPrediction && (
              <div style={predictionCardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={{ fontSize: '20px', color: currentTheme.colors.success }}>🌾</span>
                  <h3 style={cardTitleStyle}>{t.yieldForecast}</h3>
                </div>
                <div style={predictionValueStyle}>
                  {yieldPrediction.predicted?.toFixed(1) || 0}
                </div>
                <div style={predictionLabelStyle}>{t.expectedYield}</div>
                <div style={{
                  ...confidenceStyle,
                  color: getConfidenceColor(yieldPrediction.confidence)
                }}>
                  {t.confidence}: {yieldPrediction.confidence}
                </div>
                <div style={{ fontSize: currentTheme.typography.sizes.xs, color: currentTheme.colors.textSecondary, marginTop: currentTheme.spacing['1'] + 'px' }}>
                  {yieldPrediction.growthStage}
                </div>
              </div>
            )}
          </div>

          {/* Yield Impact Analysis */}
          {yieldImpact && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={{ fontSize: '20px', color: currentTheme.colors.warning }}>📈</span>
                <h3 style={cardTitleStyle}>{t.yieldImpact}</h3>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: currentTheme.spacing['3'] + 'px'
              }}>
                {yieldImpact.factors?.map((factor, index) => (
                  <div key={index} style={{
                    textAlign: 'center',
                    padding: currentTheme.spacing['3'] + 'px',
                    backgroundColor: currentTheme.colors.background,
                    borderRadius: currentTheme.borderRadius.lg + 'px'
                  }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: currentTheme.typography.weights.bold,
                      color: factor.impact > 0 ? currentTheme.colors.success : currentTheme.colors.error,
                      marginBottom: currentTheme.spacing['1'] + 'px'
                    }}>
                      {factor.impact > 0 ? '+' : ''}{factor.impact?.toFixed(1)}%
                    </div>
                    <div style={{
                      fontSize: currentTheme.typography.sizes.xs,
                      color: currentTheme.colors.textSecondary
                    }}>
                      {factor.factor}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={{ fontSize: '20px', color: currentTheme.colors.info }}>🤖</span>
                <h3 style={cardTitleStyle}>{t.insights}</h3>
              </div>
              {insights.map((insight, index) => (
                <div key={index} style={insightItemStyle}>
                  <div style={insightHeaderStyle}>
                    <div style={{
                      ...badgeStyle,
                      backgroundColor: getPriorityColor(insight.priority) + '20',
                      color: getPriorityColor(insight.priority)
                    }}>
                      {t.priority}: {insight.priority}
                    </div>
                    <div style={{
                      ...badgeStyle,
                      backgroundColor: getConfidenceColor(insight.confidence) + '20',
                      color: getConfidenceColor(insight.confidence)
                    }}>
                      {insight.confidence}
                    </div>
                  </div>
                  <div style={insightMessageStyle}>{insight.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}