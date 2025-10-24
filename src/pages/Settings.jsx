import React from 'react';
import { translations } from '../i18n/translations';

export default function Settings({ language, setLanguage }) {
  const t = translations[language];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">⚙️ {t.settings}</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">{t.language}</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setLanguage('en')}
            className={`px-6 py-3 rounded-lg font-bold ${
              language === 'en' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('tl')}
            className={`px-6 py-3 rounded-lg font-bold ${
              language === 'tl' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            Tagalog
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t.deviceSettings}</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span>{t.cameraDevice}</span>
            <span className="text-green-600 font-bold">camera_001</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span>{t.mainDevice}</span>
            <span className="text-green-600 font-bold">main_001</span>
          </div>
        </div>
      </div>
    </div>
  );
}
