import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import DetectionHistoryService from '../services/DetectionHistoryService';
import PredictionService from '../services/PredictionService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function BirdAnalytics({ language }) {
  const navigate = useNavigate();
  const t = translations[language];
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [birdPatterns, setBirdPatterns] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statistics = await DetectionHistoryService.getStatistics();
      setStats(statistics);

      const weekly = await DetectionHistoryService.getWeeklyData();
      setWeeklyData(weekly);

      const patterns = await PredictionService.analyzeBirdPatterns();
      setBirdPatterns(patterns);
    } catch (error) {
      console.error('Error loading bird analytics:', error);
    }
    setLoading(false);
  };

  const addDemoData = async () => {
    const success = await DetectionHistoryService.addDemoData();
    if (success) {
      alert('Demo data added successfully!');
      loadData();
    } else {
      alert('Failed to add demo data');
    }
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all detection history? This action cannot be undone.')) {
      const success = await DetectionHistoryService.clearHistory();
      if (success) {
        alert('Detection history cleared');
        loadData();
      } else {
        alert('Failed to clear history');
      }
    }
  };

  const exportData = async () => {
    const data = await DetectionHistoryService.exportHistory();
    if (data) {
      alert('Detection data exported successfully! Check your downloads folder.');
    } else {
      alert('Failed to export data');
    }
  };

  // Prepare hourly data for chart
  const hourlyChartData = stats ? stats.hourlyData.map((count, hour) => ({
    hour: `${hour}:00`,
    detections: count,
    period: hour < 12 ? 'AM' : 'PM'
  })) : [];

  // Prepare pie chart data for time periods
  const timePeriodsData = stats ? [
    { name: 'Dawn (5-8 AM)', value: stats.hourlyData.slice(5, 8).reduce((a, b) => a + b, 0), color: '#8884d8' },
    { name: 'Morning (8-12 PM)', value: stats.hourlyData.slice(8, 12).reduce((a, b) => a + b, 0), color: '#82ca9d' },
    { name: 'Afternoon (12-6 PM)', value: stats.hourlyData.slice(12, 18).reduce((a, b) => a + b, 0), color: '#ffc658' },
    { name: 'Evening (6-8 PM)', value: stats.hourlyData.slice(18, 20).reduce((a, b) => a + b, 0), color: '#ff7c7c' },
    { name: 'Night (8 PM-5 AM)', value: [...stats.hourlyData.slice(20), ...stats.hourlyData.slice(0, 5)].reduce((a, b) => a + b, 0), color: '#8dd1e1' },
  ].filter(period => period.value > 0) : [];

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
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">🐦 Bird Analytics</h1>
        <p className="text-purple-100">Detailed analysis of bird detection patterns</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.totalToday || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">🦅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Time</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalAllTime || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Peak Hour</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.peakHour || 0}:00</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg/Hour</p>
              <p className="text-2xl font-bold text-green-600">{stats?.avgPerHour || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Hourly Activity Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Hourly Activity Pattern</h2>

          {hourlyChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    label={{ value: 'Detections', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Detections']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Bar dataKey="detections" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No activity data available</p>
                <p className="text-sm">Add some bird detections to see patterns</p>
              </div>
            </div>
          )}
        </div>

        {/* Time Period Distribution */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🕐 Activity by Time Period</h2>

          {timePeriodsData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timePeriodsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {timePeriodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <span className="text-4xl mb-2 block">🥧</span>
                <p>No time period data</p>
                <p className="text-sm">Detection data needed for analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Weekly Activity Trend</h2>

        {weeklyData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis label={{ value: 'Detections', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value, name) => [`${value}`, 'Bird Detections']}
                  labelFormatter={(label, payload) => {
                    const data = payload && payload[0] && payload[0].payload;
                    return data ? `${data.day} (${data.date})` : label;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📈</span>
              <p>No weekly trend data</p>
              <p className="text-sm">Start detecting birds to see trends</p>
            </div>
          </div>
        )}
      </div>

      {/* Insights and Recommendations */}
      {birdPatterns && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Insights & Recommendations</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Peak Activity</h3>
              <p className="text-sm text-blue-700">
                Most bird activity occurs at {birdPatterns.peakHour}:00 with {birdPatterns.peakHourDetections} detections.
                Consider increasing deterrent activity during this time.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">📊 Effectiveness</h3>
              <p className="text-sm text-green-700">
                Current protection effectiveness: {Math.round(birdPatterns.effectiveness * 100)}%
                {birdPatterns.effectiveness > 0.8 ? ' - Excellent protection!' :
                 birdPatterns.effectiveness > 0.6 ? ' - Good protection level.' : ' - Consider improving deterrent strategies.'}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">⏱️ Timing Strategy</h3>
              <p className="text-sm text-yellow-700">
                Based on patterns, activate deterrents 30 minutes before peak hours.
                Early morning (5-8 AM) and late afternoon (4-6 PM) are typically high-activity periods.
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">📈 Trend Analysis</h3>
              <p className="text-sm text-purple-700">
                Average {birdPatterns.avgPerDay} birds per day.
                {parseFloat(birdPatterns.avgPerDay) > 5 ?
                  'High activity - consider stronger deterrents.' :
                  'Moderate activity - current strategy appears effective.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔧 Data Management</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={addDemoData}
            className="bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            🎲 Add Demo Data
          </button>

          <button
            onClick={exportData}
            className="bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            💾 Export Data
          </button>

          <button
            onClick={loadData}
            className="bg-purple-500 text-white p-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
          >
            🔄 Refresh Data
          </button>

          <button
            onClick={clearHistory}
            className="bg-red-500 text-white p-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Last Detection Info */}
      {stats?.lastDetection && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Last Detection</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-600">Timestamp</div>
              <div className="font-semibold">{new Date(stats.lastDetection.timestamp).toLocaleString()}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Confidence</div>
              <div className="font-semibold">{stats.lastDetection.confidence}%</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Position</div>
              <div className="font-semibold">X: {stats.lastDetection.position.x}, Y: {stats.lastDetection.position.y}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Type</div>
              <div className="font-semibold capitalize">{stats.lastDetection.type}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Back to Analytics
        </button>
        <button
          onClick={() => navigate('/controls')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          🎮 Detection Controls
        </button>
        <button
          onClick={() => navigate('/reports')}
          className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors"
        >
          📋 Generate Report
        </button>
      </div>
    </div>
  );
}