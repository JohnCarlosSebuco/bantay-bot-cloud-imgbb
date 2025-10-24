import React from 'react';
import { translations } from '../i18n/translations';

export default function History({ language }) {
  const t = translations[language];
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">🕐 {t.history}</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p>Detection history and event logs</p>
      </div>
    </div>
  );
}
