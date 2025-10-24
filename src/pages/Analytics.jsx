import React from 'react';
import { translations } from '../i18n/translations';

export default function Analytics({ language }) {
  const t = translations[language];
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">📊 {t.analytics}</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p>Analytics features: Harvest Planner, Rainfall Tracker, Crop Health Monitor, Bird Analytics</p>
        <p className="text-sm text-gray-500 mt-2">To be implemented with Recharts for visualizations</p>
      </div>
    </div>
  );
}
