import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import CropDataService from '../services/CropDataService';
import DetectionHistoryService from '../services/DetectionHistoryService';
import HistoryService from '../services/HistoryService';
import PredictionService from '../services/PredictionService';

export default function Reports({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('comprehensive');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);

  const reportTypes = [
    { value: 'comprehensive', label: '📊 Comprehensive Report', description: 'Complete overview of all activities' },
    { value: 'crop-health', label: '🌱 Crop Health Report', description: 'Focus on crop growth and health metrics' },
    { value: 'bird-detection', label: '🐦 Bird Detection Report', description: 'Bird activity and protection effectiveness' },
    { value: 'environmental', label: '🌡️ Environmental Report', description: 'Weather and environmental conditions' },
    { value: 'harvest', label: '🌾 Harvest Report', description: 'Harvest yields and quality analysis' }
  ];

  useEffect(() => {
    loadPreviousReports();
  }, []);

  const loadPreviousReports = () => {
    const saved = localStorage.getItem('generated_reports');
    if (saved) {
      setGeneratedReports(JSON.parse(saved));
    }
  };

  const generateReport = async () => {
    setLoading(true);

    try {
      const data = {
        metadata: {
          type: reportType,
          dateRange,
          generatedAt: new Date().toISOString(),
          period: getDaysBetween(dateRange.from, dateRange.to)
        }
      };

      // Collect data based on report type
      if (reportType === 'comprehensive' || reportType === 'crop-health') {
        data.cropData = await CropDataService.getCropData();
        data.environmentalHistory = await HistoryService.getRecentEnvHistory(data.metadata.period);
        data.harvestHistory = await CropDataService.getHarvestHistory();

        if (data.cropData) {
          data.healthAssessment = await PredictionService.assessCropHealth(25, 60, 500, data.cropData.cropType);
          data.harvestPrediction = await PredictionService.predictHarvestDate(data.cropData.plantingDate, data.cropData.cropType);
        }
      }

      if (reportType === 'comprehensive' || reportType === 'bird-detection') {
        data.detectionStats = await DetectionHistoryService.getStatistics();
        data.birdPatterns = await PredictionService.analyzeBirdPatterns();
        data.weeklyDetections = await DetectionHistoryService.getWeeklyData();
      }

      if (reportType === 'comprehensive' || reportType === 'environmental') {
        data.rainfallData = await PredictionService.analyzeRainfall();
        data.environmentalSummary = await calculateEnvironmentalSummary(data.environmentalHistory || []);
      }

      setReportData(data);

      // Save generated report
      const reportRecord = {
        id: Date.now().toString(),
        type: reportType,
        dateRange,
        generatedAt: new Date().toISOString(),
        summary: generateReportSummary(data)
      };

      const updated = [reportRecord, ...generatedReports].slice(0, 10); // Keep last 10 reports
      setGeneratedReports(updated);
      localStorage.setItem('generated_reports', JSON.stringify(updated));

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }

    setLoading(false);
  };

  const calculateEnvironmentalSummary = (history) => {
    if (!history.length) return null;

    const temps = history.map(h => h.temperature).filter(t => t != null);
    const humidities = history.map(h => h.humidity).filter(h => h != null);

    return {
      avgTemperature: temps.reduce((a, b) => a + b, 0) / temps.length || 0,
      maxTemperature: Math.max(...temps, 0),
      minTemperature: Math.min(...temps, 0),
      avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length || 0,
      dataPoints: history.length
    };
  };

  const generateReportSummary = (data) => {
    const items = [];

    if (data.cropData) {
      items.push(`Crop: ${data.cropData.cropType}`);
    }

    if (data.detectionStats) {
      items.push(`Birds detected: ${data.detectionStats.totalAllTime}`);
    }

    if (data.harvestHistory) {
      items.push(`Harvest records: ${data.harvestHistory.length}`);
    }

    return items.join(' | ');
  };

  const getDaysBetween = (from, to) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
  };

  const downloadReport = (data) => {
    const reportContent = {
      ...data,
      generatedBy: 'BantayBot Smart Crop Protection System',
      version: '1.0',
      disclaimer: 'This report is generated automatically based on sensor data and may require verification.'
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bantaybot-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">📋 Reports</h1>
        <p className="text-indigo-100">Generate comprehensive system reports</p>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔧 Generate New Report</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-3">
              Report Type
            </label>
            <div className="space-y-3">
              {reportTypes.map(type => (
                <label
                  key={type.value}
                  className={`block p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    reportType === type.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`font-semibold ${reportType === type.value ? 'text-indigo-600' : 'text-gray-800'}`}>
                    {type.label}
                  </div>
                  <div className={`text-sm ${reportType === type.value ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {type.description}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range and Actions */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-3">
              Date Range
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Report Period</div>
                <div className="font-semibold">{getDaysBetween(dateRange.from, dateRange.to)} days</div>
              </div>

              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-indigo-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ Generating...' : '📊 Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Report Display */}
      {reportData && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6" id="report-content">
          {/* Report Header */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {reportTypes.find(t => t.value === reportData.metadata.type)?.label}
                </h1>
                <p className="text-gray-600">
                  {new Date(reportData.metadata.dateRange.from).toLocaleDateString()} - {new Date(reportData.metadata.dateRange.to).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Generated on {new Date(reportData.metadata.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport(reportData)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  💾 Download
                </button>
                <button
                  onClick={printReport}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">📝 Executive Summary</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800">
                  Report generated for {reportData.metadata.period} days covering system performance,
                  crop health, and protection effectiveness.
                </p>
              </div>
            </div>

            {/* Crop Health Section */}
            {reportData.cropData && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">🌱 Crop Information</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Crop Type</div>
                    <div className="font-semibold">{reportData.cropData.cropType}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Planting Date</div>
                    <div className="font-semibold">{new Date(reportData.cropData.plantingDate).toLocaleDateString()}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Plot Size</div>
                    <div className="font-semibold">{reportData.cropData.plotSize} sq meters</div>
                  </div>
                </div>

                {reportData.healthAssessment && (
                  <div className="mt-4 bg-green-50 p-4 rounded-lg">
                    <div className="text-green-800 font-semibold mb-2">Health Assessment</div>
                    <div className="text-green-700">
                      Current Health Score: {reportData.healthAssessment.score}/100 ({reportData.healthAssessment.status})
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detection Statistics */}
            {reportData.detectionStats && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">🐦 Bird Detection Summary</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-purple-600">Total Detections</div>
                    <div className="text-2xl font-bold text-purple-800">{reportData.detectionStats.totalAllTime}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Peak Hour</div>
                    <div className="text-2xl font-bold text-blue-800">{reportData.detectionStats.peakHour}:00</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600">Avg Per Hour</div>
                    <div className="text-2xl font-bold text-green-800">{reportData.detectionStats.avgPerHour}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm text-orange-600">Today</div>
                    <div className="text-2xl font-bold text-orange-800">{reportData.detectionStats.totalToday}</div>
                  </div>
                </div>

                {reportData.birdPatterns && (
                  <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-800 font-semibold mb-2">Protection Effectiveness</div>
                    <div className="text-purple-700">
                      Current effectiveness: {Math.round(reportData.birdPatterns.effectiveness * 100)}%
                      ({reportData.birdPatterns.avgPerDay} birds per day average)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Environmental Data */}
            {reportData.environmentalSummary && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">🌡️ Environmental Conditions</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm text-orange-600">Avg Temperature</div>
                    <div className="text-lg font-bold text-orange-800">{reportData.environmentalSummary.avgTemperature.toFixed(1)}°C</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-sm text-red-600">Max Temperature</div>
                    <div className="text-lg font-bold text-red-800">{reportData.environmentalSummary.maxTemperature.toFixed(1)}°C</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Min Temperature</div>
                    <div className="text-lg font-bold text-blue-800">{reportData.environmentalSummary.minTemperature.toFixed(1)}°C</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600">Avg Humidity</div>
                    <div className="text-lg font-bold text-green-800">{reportData.environmentalSummary.avgHumidity.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Harvest Data */}
            {reportData.harvestHistory && reportData.harvestHistory.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">🌾 Harvest Records</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Crop</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Yield (kg)</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.harvestHistory.slice(0, 10).map((harvest, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">{new Date(harvest.date).toLocaleDateString()}</td>
                          <td className="border border-gray-300 px-4 py-2">{harvest.cropType}</td>
                          <td className="border border-gray-300 px-4 py-2">{harvest.yield}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className="capitalize">{harvest.quality}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
            Generated by BantayBot Smart Crop Protection System v1.0
          </div>
        </div>
      )}

      {/* Previous Reports */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📂 Previous Reports</h2>

        {generatedReports.length > 0 ? (
          <div className="space-y-3">
            {generatedReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-semibold">
                    {reportTypes.find(t => t.value === report.type)?.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(report.generatedAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{report.summary}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {getDaysBetween(report.dateRange.from, report.dateRange.to)} days
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>📋 No previous reports</p>
            <p className="text-sm">Generate your first report to get started</p>
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
        <button
          onClick={() => navigate('/bird-analytics')}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
        >
          🐦 Bird Analytics
        </button>
      </div>
    </div>
  );
}