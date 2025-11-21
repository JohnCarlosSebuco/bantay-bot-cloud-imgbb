import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import CropDataService from '../services/CropDataService';

export default function AddHarvest({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [harvestData, setHarvestData] = useState({
    date: new Date().toISOString().split('T')[0],
    cropType: 'tomato',
    yield: '',
    quality: 'good',
    notes: '',
    weather: 'sunny',
    harvestMethod: 'manual'
  });

  const cropTypes = ['tomato', 'rice', 'corn', 'eggplant'];
  const qualityOptions = [
    { value: 'excellent', label: 'Excellent', color: 'green' },
    { value: 'good', label: 'Good', color: 'blue' },
    { value: 'fair', label: 'Fair', color: 'yellow' },
    { value: 'poor', label: 'Poor', color: 'red' }
  ];
  const weatherOptions = ['sunny', 'cloudy', 'rainy', 'windy'];
  const harvestMethods = ['manual', 'mechanical', 'mixed'];

  const handleInputChange = (field, value) => {
    setHarvestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!harvestData.yield || parseFloat(harvestData.yield) <= 0) {
      alert('Please enter a valid harvest yield');
      return;
    }

    const harvestRecord = {
      ...harvestData,
      yield: parseFloat(harvestData.yield),
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };

    try {
      const success = await CropDataService.addHarvestRecord(harvestRecord);

      if (success) {
        alert('Harvest record added successfully!');
        navigate('/harvest-planner');
      } else {
        alert('Failed to add harvest record');
      }
    } catch (error) {
      console.error('Error adding harvest record:', error);
      alert('Error adding harvest record');
    }
  };

  const getQualityColor = (quality) => {
    const option = qualityOptions.find(opt => opt.value === quality);
    return option ? option.color : 'gray';
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">📝 Add Harvest Record</h1>
        <p className="text-green-100">Record your harvest details</p>
      </div>

      {/* Harvest Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Harvest Date
              </label>
              <input
                type="date"
                value={harvestData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Crop Type
              </label>
              <select
                value={harvestData.cropType}
                onChange={(e) => handleInputChange('cropType', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {cropTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Yield Information */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Harvest Yield (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={harvestData.yield}
              onChange={(e) => handleInputChange('yield', e.target.value)}
              placeholder="Enter harvest yield in kilograms"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Quality Assessment */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Harvest Quality
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {qualityOptions.map(option => (
                <label
                  key={option.value}
                  className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    harvestData.quality === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={option.value}
                    checked={harvestData.quality === option.value}
                    onChange={(e) => handleInputChange('quality', e.target.value)}
                    className="sr-only"
                  />
                  <span className={`text-center font-semibold ${
                    harvestData.quality === option.value
                      ? `text-${option.color}-600`
                      : 'text-gray-600'
                  }`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Weather and Method */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Weather Conditions
              </label>
              <select
                value={harvestData.weather}
                onChange={(e) => handleInputChange('weather', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {weatherOptions.map(weather => (
                  <option key={weather} value={weather}>
                    {weather.charAt(0).toUpperCase() + weather.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Harvest Method
              </label>
              <select
                value={harvestData.harvestMethod}
                onChange={(e) => handleInputChange('harvestMethod', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {harvestMethods.map(method => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Additional Notes
            </label>
            <textarea
              value={harvestData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes about this harvest..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Harvest Summary</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold">{new Date(harvestData.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Crop:</span>
                <span className="font-semibold capitalize">{harvestData.cropType}</span>
              </div>
              <div className="flex justify-between">
                <span>Yield:</span>
                <span className="font-semibold">{harvestData.yield || '0'} kg</span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span className={`font-semibold capitalize text-${getQualityColor(harvestData.quality)}-600`}>
                  {harvestData.quality}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Weather:</span>
                <span className="font-semibold capitalize">{harvestData.weather}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/harvest-planner')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              ← Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              💾 Save Harvest
            </button>
          </div>
        </div>
      </form>

      {/* Quick Tips */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Tips for Recording Harvest</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Record harvest data as soon as possible after harvesting</li>
          <li>• Weigh produce accurately for better yield tracking</li>
          <li>• Note weather conditions as they affect quality</li>
          <li>• Include any unusual observations in the notes section</li>
          <li>• Regular recording helps identify patterns and improve future harvests</li>
        </ul>
      </div>
    </div>
  );
}