import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import CropDataService from '../services/CropDataService';
import PredictionService from '../services/PredictionService';
import DeviceService from '../services/DeviceService';
import HistoryService from '../services/HistoryService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DEVICE_CONFIG } from '../config/hardware.config';

export default function CropHealthMonitor({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [healthAssessment, setHealthAssessment] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState(null);
  const [currentSensorData, setCurrentSensorData] = useState({});
  const [cropData, setCropData] = useState(null);
  const [envHistory, setEnvHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    subscribeToSensorData();

    return () => {
      // Cleanup subscriptions
    };
  }, []);

  const subscribeToSensorData = () => {
    // Subscribe to main device sensor data
    const unsubscribe = DeviceService.subscribeToSensorData(
      DEVICE_CONFIG.MAIN_DEVICE_ID,
      (data) => {
        setCurrentSensorData(data);
        updateHealthAssessment(data);
      }
    );

    return unsubscribe;
  };

  const loadData = async () => {
    try {
      // Get crop data
      const crop = await CropDataService.getCropData();
      setCropData(crop);

      // Get environmental history
      const history = await HistoryService.getRecentEnvHistory(24);
      setEnvHistory(history);

      // Get environmental data
      const envData = await CropDataService.getEnvironmentalData();
      setEnvironmentalData(envData);

      if (crop && envData) {
        // Assess crop health
        const assessment = await PredictionService.assessCropHealth(
          envData.temperature || 25,
          envData.humidity || 60,
          envData.soilMoisture || 500,
          crop.cropType
        );
        setHealthAssessment(assessment);
      }
    } catch (error) {
      console.error('Error loading crop health data:', error);
    }
    setLoading(false);
  };

  const updateHealthAssessment = async (sensorData) => {
    if (!cropData) return;

    try {
      const assessment = await PredictionService.assessCropHealth(
        sensorData.dhtTemperature || 25,
        sensorData.dhtHumidity || 60,
        sensorData.soilHumidity || 500,
        cropData.cropType
      );
      setHealthAssessment(assessment);
    } catch (error) {
      console.error('Error updating health assessment:', error);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'blue';
    if (score >= 50) return 'yellow';
    return 'red';
  };

  const getHealthTextColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return '💚';
      case 'good':
        return '💙';
      case 'fair':
        return '💛';
      case 'poor':
        return '❤️';
      default:
        return '⚪';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default:
        return 'bg-green-50 text-green-600 border-green-200';
    }
  };

  // Prepare radar chart data for environmental factors
  const radarData = cropData && healthAssessment ? [
    {
      factor: 'Temperature',
      value: Math.min(100, Math.max(0, 100 - Math.abs(currentSensorData.dhtTemperature - ((cropData.optimalTempMin + cropData.optimalTempMax) / 2)) * 5)),
      fullMark: 100
    },
    {
      factor: 'Humidity',
      value: Math.min(100, Math.max(0, 100 - Math.abs(currentSensorData.dhtHumidity - 60) * 2)),
      fullMark: 100
    },
    {
      factor: 'Soil Moisture',
      value: Math.min(100, Math.max(0, 100 - Math.abs(currentSensorData.soilHumidity - ((cropData.optimalMoistureMin + cropData.optimalMoistureMax) / 2)) / 10)),
      fullMark: 100
    },
    {
      factor: 'Overall Health',
      value: healthAssessment.score,
      fullMark: 100
    }
  ] : [];

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">🌱 Crop Health Monitor</h1>
        <p className="text-green-100">Real-time monitoring and health assessment</p>
      </div>

      {/* Current Health Status */}
      {healthAssessment && (
        <div className={`rounded-2xl p-6 mb-6 ${getHealthTextColor(healthAssessment.score)}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-4xl mr-4">{getStatusIcon(healthAssessment.status)}</span>
              <div>
                <h2 className="text-2xl font-bold">Health Score: {healthAssessment.score}/100</h2>
                <p className="text-lg capitalize">Status: {healthAssessment.status}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-75">Last Updated</div>
              <div className="font-semibold">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {healthAssessment.issues.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">⚠️ Issues Detected:</h3>
              <div className="space-y-2">
                {healthAssessment.issues.map((issue, index) => (
                  <div key={index} className={`p-2 rounded border ${getSeverityColor(issue.severity)}`}>
                    <span className="font-semibold capitalize">{issue.severity}:</span> {issue.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Environmental Conditions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Temperature</p>
              <p className="text-2xl font-bold text-orange-600">{currentSensorData.dhtTemperature || '--'}°C</p>
              {cropData && (
                <p className="text-xs text-gray-500">
                  Optimal: {cropData.optimalTempMin}-{cropData.optimalTempMax}°C
                </p>
              )}
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <span className="text-2xl">🌡️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Air Humidity</p>
              <p className="text-2xl font-bold text-blue-600">{currentSensorData.dhtHumidity || '--'}%</p>
              <p className="text-xs text-gray-500">Optimal: 60-70%</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">💧</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Soil Moisture</p>
              <p className="text-2xl font-bold text-green-600">{currentSensorData.soilHumidity || '--'}</p>
              {cropData && (
                <p className="text-xs text-gray-500">
                  Optimal: {cropData.optimalMoistureMin}-{cropData.optimalMoistureMax}
                </p>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">🌱</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Soil Temp</p>
              <p className="text-2xl font-bold text-purple-600">{currentSensorData.soilTemperature || '--'}°C</p>
              <p className="text-xs text-gray-500">Ground temperature</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">🌡️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Environmental Health Radar */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Health Factors</h2>

          {radarData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="factor" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Health Score"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Health Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No health data available</p>
                <p className="text-sm">Sensor data needed for health assessment</p>
              </div>
            </div>
          )}
        </div>

        {/* Environmental Trend */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 24-Hour Environmental Trend</h2>

          {envHistory.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={envHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#ff7300"
                    name="Temperature (°C)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#387908"
                    name="Humidity (%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📈</span>
                <p>No historical data</p>
                <p className="text-sm">Data collection in progress</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {healthAssessment && healthAssessment.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Recommendations</h2>
          <div className="space-y-3">
            {healthAssessment.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600 mt-1">💡</span>
                <p className="text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Information */}
      {cropData && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🌾 Current Crop Information</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Crop Type</div>
              <div className="text-lg font-semibold">{cropData.cropType}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Planting Date</div>
              <div className="text-lg font-semibold">{new Date(cropData.plantingDate).toLocaleDateString()}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Days Since Planting</div>
              <div className="text-lg font-semibold">
                {Math.floor((Date.now() - new Date(cropData.plantingDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Plot Size</div>
              <div className="text-lg font-semibold">{cropData.plotSize} sq meters</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Expected Yield</div>
              <div className="text-lg font-semibold">{cropData.expectedYield} kg</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Growth Stage</div>
              <div className="text-lg font-semibold">
                {Math.floor((Date.now() - new Date(cropData.plantingDate).getTime()) / (1000 * 60 * 60 * 24)) > 70 ? 'Mature' :
                 Math.floor((Date.now() - new Date(cropData.plantingDate).getTime()) / (1000 * 60 * 60 * 24)) > 30 ? 'Vegetative' : 'Seedling'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔧 Quick Actions</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate('/harvest-planner')}
            className="bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            🌾 Harvest Planner
          </button>

          <button
            onClick={() => navigate('/rainfall-tracker')}
            className="bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            🌧️ Rainfall Tracker
          </button>

          <button
            onClick={loadData}
            className="bg-purple-500 text-white p-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
          >
            🔄 Refresh Data
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="bg-orange-500 text-white p-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            📋 Generate Report
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Back to Analytics
        </button>
        <button
          onClick={() => navigate('/bird-analytics')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          🐦 Bird Analytics
        </button>
      </div>
    </div>
  );
}