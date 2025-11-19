import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import CropDataService from '../services/CropDataService';
import PredictionService from '../services/PredictionService';

export default function HarvestPlanner({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [cropType, setCropType] = useState('tomato');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [plotSize, setPlotSize] = useState('100');
  const [expectedYield, setExpectedYield] = useState('');
  const [harvestHistory, setHarvestHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const cropDatabase = PredictionService.getCropDatabase();
  const cropTypes = Object.keys(cropDatabase).filter(k => k !== 'default');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const crop = await CropDataService.getCropData();
      if (crop) {
        setCropType(crop.cropType || 'tomato');
        setPlantingDate(crop.plantingDate || new Date().toISOString().split('T')[0]);
        setPlotSize(crop.plotSize?.toString() || '100');
        setExpectedYield(crop.expectedYield?.toString() || '');
      }

      const history = await CropDataService.getHarvestHistory();
      setHarvestHistory(history);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const saveCropData = async () => {
    if (!plotSize || parseFloat(plotSize) <= 0) {
      alert('Please enter a valid plot size');
      return;
    }

    const cropData = {
      cropType,
      plantingDate,
      plotSize: parseFloat(plotSize),
      expectedYield: parseFloat(expectedYield) || 0,
    };

    const success = await CropDataService.saveCropData(cropData);

    if (success) {
      alert('Crop data saved successfully!');
      navigate('/analytics');
    } else {
      alert('Failed to save crop data');
    }
  };

  const addHarvestRecord = () => {
    navigate('/add-harvest');
  };

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">🌾 Harvest Planner</h1>
        <p className="text-green-100">Plan Your Growing Season</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Current Crop Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Crop Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Crop Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {cropTypes.map(type => (
                  <option key={type} value={type}>
                    {cropDatabase[type].name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Planting Date
              </label>
              <input
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Plot Size (sq meters)
              </label>
              <input
                type="number"
                value={plotSize}
                onChange={(e) => setPlotSize(e.target.value)}
                placeholder="Enter plot size"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Expected Yield (kg)
              </label>
              <input
                type="number"
                value={expectedYield}
                onChange={(e) => setExpectedYield(e.target.value)}
                placeholder="Enter expected yield"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={saveCropData}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              💾 Save Crop Data
            </button>
          </div>
        </div>

        {/* Crop Information Display */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Crop Details</h2>

          {cropDatabase[cropType] && (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <h3 className="font-semibold text-green-800">Growing Requirements</h3>
                <div className="text-sm text-green-700 mt-2 space-y-1">
                  <p>🌡️ Optimal Temperature: {cropDatabase[cropType].optimalTempMin}°C - {cropDatabase[cropType].optimalTempMax}°C</p>
                  <p>💧 Soil Moisture: {cropDatabase[cropType].optimalMoistureMin} - {cropDatabase[cropType].optimalMoistureMax}</p>
                  <p>📅 Growth Period: ~{cropDatabase[cropType].growthDays} days</p>
                  <p>🎯 Required GDD: {cropDatabase[cropType].requiredGDD}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="font-semibold text-blue-800">Water Requirements</h3>
                <div className="text-sm text-blue-700 mt-2">
                  <p>💧 Daily Water Need: {cropDatabase[cropType].waterNeedLow} - {cropDatabase[cropType].waterNeedHigh} mm/day</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Harvest History */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Harvest History</h2>
          <button
            onClick={addHarvestRecord}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            ➕ Add Harvest
          </button>
        </div>

        {harvestHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>📝 No harvest records yet</p>
            <p className="text-sm">Add your first harvest to start tracking yields</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Crop</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Yield (kg)</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Quality</th>
                </tr>
              </thead>
              <tbody>
                {harvestHistory.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="py-3 px-2">{record.cropType}</td>
                    <td className="py-3 px-2">{record.yield}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        record.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                        record.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                        record.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.quality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Back to Analytics
        </button>
        <button
          onClick={() => navigate('/crop-health-monitor')}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          📊 Monitor Crop Health
        </button>
        <button
          onClick={() => navigate('/rainfall-tracker')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          🌧️ Track Rainfall
        </button>
      </div>
    </div>
  );
}