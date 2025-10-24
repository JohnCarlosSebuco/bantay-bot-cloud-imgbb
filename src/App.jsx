import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Controls from './pages/Controls';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import History from './pages/History';
import { translations } from './i18n/translations';

// Icon component (simplified)
const Icon = ({ name, className }) => <span className={className}>{name}</span>;

function Navigation({ language }) {
  const location = useLocation();
  const t = translations[language];

  const navItems = [
    { path: '/', label: t.dashboard, icon: '🏠' },
    { path: '/controls', label: t.controls, icon: '🎮' },
    { path: '/analytics', label: t.analytics, icon: '📊' },
    { path: '/history', label: t.history, icon: '🕐' },
    { path: '/settings', label: t.settings, icon: '⚙️' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              location.pathname === item.path
                ? 'text-green-600'
                : 'text-gray-600'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function App() {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'tl'
  );

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <Router>
      <div className="App min-h-screen pb-20 bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard language={language} />} />
          <Route path="/controls" element={<Controls language={language} />} />
          <Route path="/analytics" element={<Analytics language={language} />} />
          <Route path="/history" element={<History language={language} />} />
          <Route path="/settings" element={<Settings language={language} setLanguage={setLanguage} />} />
        </Routes>
        <Navigation language={language} />
      </div>
    </Router>
  );
}

export default App;
