import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import CropDataService from '../services/CropDataService';
import PredictionService from '../services/PredictionService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function RainfallTracker({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [rainfallAmount, setRainfallAmount] = useState('');
  const [rainfallLog, setRainfallLog] = useState([]);
  const [rainfallAnalysis, setRainfallAnalysis] = useState(null);
  const [waterStressInfo, setWaterStressInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const log = await CropDataService.getRainfallLog();
      setRainfallLog(log);

      const analysis = await PredictionService.analyzeRainfall();
      setRainfallAnalysis(analysis);

      // Get current crop data for water stress check
      const cropData = await CropDataService.getCropData();
      if (cropData) {
        // Get latest environmental data
        const envHistory = await CropDataService.getEnvironmentalHistory();
        if (envHistory.length > 0) {
          const latestEnv = envHistory[0];
          const stressCheck = await PredictionService.checkWaterStress(
            latestEnv.avgSoilMoisture,
            cropData.cropType
          );
          setWaterStressInfo(stressCheck);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const addRainfallRecord = async () => {
    const amount = parseFloat(rainfallAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid rainfall amount');
      return;
    }

    const result = await CropDataService.addRainfallRecord(amount);

    if (result) {
      alert('Rainfall record added successfully!');
      setRainfallAmount('');
      loadData();
    } else {
      alert('Failed to add rainfall record');
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm('Are you sure you want to delete this rainfall record?')) {
      const success = await CropDataService.deleteRainfallRecord(id);
      if (success) {
        alert('Record deleted');
        loadData();
      }
    }
  };

  const getStressColor = (level) => {
    switch (level) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'green';
    }
  };

  const getStressTextColor = (level) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  // Prepare chart data from rainfall log
  const chartData = rainfallLog.slice(0, 14).reverse().map((record, index) => ({
    date: new Date(record.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    amount: record.amount,
    day: `Day ${index + 1}`
  }));

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">🌧️ Rainfall Tracker</h1>
        <p className="text-blue-100">Monitor rainfall and water stress levels</p>
      </div>

      {/* Water Stress Alert */}
      {waterStressInfo && waterStressInfo.hasAlert && (
        <div className={`rounded-2xl p-4 mb-6 ${getStressTextColor(waterStressInfo.severity)}`}>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">⚠️</span>
            <h3 className="text-lg font-bold">{waterStressInfo.alert.title}</h3>
          </div>
          <p className="mb-3">{waterStressInfo.alert.message}</p>
          <div className="text-sm">
            <strong>Recommendations:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {waterStressInfo.alert.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add Rainfall Record */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Add Rainfall</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Rainfall Amount (mm)
              </label>
              <input
                type="number"
                value={rainfallAmount}
                onChange={(e) => setRainfallAmount(e.target.value)}
                placeholder="Enter rainfall amount"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={addRainfallRecord}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              ➕ Add Record
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[5, 10, 15, 20].map(amount => (
              <button
                key={amount}
                onClick={() => setRainfallAmount(amount.toString())}
                className="bg-blue-100 text-blue-600 py-2 px-3 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
              >
                {amount}mm
              </button>
            ))}
          </div>
        </div>

        {/* Rainfall Analysis */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Rainfall Summary</h2>

          {rainfallAnalysis ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Last 7 Days</div>
                <div className="text-2xl font-bold text-blue-600">{rainfallAnalysis.last7Days}mm</div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Last 30 Days</div>
                <div className="text-2xl font-bold text-green-600">{rainfallAnalysis.last30Days}mm</div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Days Since Rain</div>
                <div className="text-2xl font-bold text-orange-600">{rainfallAnalysis.daysSinceRain}</div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <div className={`text-lg font-bold capitalize ${
                  rainfallAnalysis.status === 'drought' ? 'text-red-600' :
                  rainfallAnalysis.status === 'dry' ? 'text-orange-600' :
                  rainfallAnalysis.status === 'wet' ? 'text-blue-600' :
                  'text-green-600'
                }`}>
                  {rainfallAnalysis.status}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No rainfall data available</p>
              <p className="text-sm">Add your first rainfall record</p>
            </div>
          )}
        </div>

        {/* Current Water Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💧 Water Status</h2>

          {waterStressInfo ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`inline-block w-20 h-20 rounded-full flex items-center justify-center text-2xl ${getStressTextColor(waterStressInfo.severity)}`}>
                  💧
                </div>
                <div className="mt-2">
                  <div className="text-sm text-gray-600">Stress Level</div>
                  <div className={`text-lg font-bold capitalize ${getStressTextColor(waterStressInfo.severity).split(' ')[0]}`}>
                    {waterStressInfo.severity}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Moisture:</span>
                  <span className="font-semibold">{waterStressInfo.currentMoisture}</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimal Min:</span>
                  <span className="font-semibold">{waterStressInfo.optimalMin}</span>
                </div>
                <div className="flex justify-between">
                  <span>Days Since Rain:</span>
                  <span className="font-semibold">{waterStressInfo.daysSinceRain}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>⚠️ No water status data</p>
              <p className="text-sm">Sensor data required</p>
            </div>
          )}
        </div>
      </div>

      {/* Rainfall Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Rainfall History (Last 14 Days)</h2>

        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value) => [`${value}mm`, 'Rainfall']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <p>📊 No rainfall data to display</p>
            <p className="text-sm">Add rainfall records to see charts</p>
          </div>
        )}
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Recent Records</h2>

        {rainfallLog.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Amount (mm)</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rainfallLog.slice(0, 10).map((record, index) => (
                  <tr key={record.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="py-3 px-2">{record.amount}mm</td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => deleteRecord(record.id || index)}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>📝 No rainfall records yet</p>
            <p className="text-sm">Start tracking to monitor water stress</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Back to Analytics
        </button>
        <button
          onClick={() => navigate('/crop-health-monitor')}
          className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors"
        >
          🌱 Crop Health
        </button>
      </div>
    </div>
  );
}