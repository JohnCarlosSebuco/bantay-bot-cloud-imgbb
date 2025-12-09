import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Controls from './pages/Controls';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import History from './pages/History';
import HarvestPlanner from './pages/HarvestPlanner';
import AddHarvest from './pages/AddHarvest';
import RainfallTracker from './pages/RainfallTracker';
import CropHealthMonitor from './pages/CropHealthMonitor';
import BirdAnalytics from './pages/BirdAnalytics';
import Reports from './pages/Reports';
import { translations } from './i18n/translations';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { VolumeProvider } from './contexts/VolumeContext';
import { TourProvider } from './contexts/TourContext';
import { QRSecurityProvider } from './contexts/QRSecurityContext';
import { SilentTimeProvider } from './contexts/SilentTimeContext';
import GuidedTour from './components/ui/GuidedTour';
import QRSecurityGate from './components/QRSecurityGate';
import { Home, Gamepad2, BarChart3, History as HistoryIcon, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';

// Navigation Icon Components Map
const NavIcons = {
  home: Home,
  controls: Gamepad2,
  analytics: BarChart3,
  history: HistoryIcon,
  settings: SettingsIcon,
};

// Enhanced Icon component with Lucide icons
const NavIcon = ({ name, active, className }) => {
  const IconComponent = NavIcons[name];
  if (!IconComponent) return null;
  return (
    <IconComponent
      size={24}
      strokeWidth={active ? 2.5 : 2}
      className={`transition-all duration-200 ${active ? 'scale-110' : ''} ${className}`}
    />
  );
};

// Theme Toggle Button - Modern Pill Design
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 flex items-center gap-1 p-1 rounded-full surface-primary border border-primary shadow-lg transition-all duration-300 hover:shadow-xl"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Light mode indicator */}
      <div className={`
        flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
        ${!isDark ? 'bg-warning/20 scale-110' : 'opacity-50 scale-90'}
      `}>
        <Sun size={18} className="text-warning" />
      </div>

      {/* Dark mode indicator */}
      <div className={`
        flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
        ${isDark ? 'bg-brand/20 scale-110' : 'opacity-50 scale-90'}
      `}>
        <Moon size={18} className="text-brand" />
      </div>
    </button>
  );
}

// ScrollToTop component - scrolls to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function Navigation({ language }) {
  const location = useLocation();
  const { isDark } = useTheme();
  const t = translations[language];

  const navItems = [
    { path: '/', label: t.dashboard, icon: 'home' },
    { path: '/controls', label: t.controls, icon: 'controls' },
    { path: '/analytics', label: t.analytics, icon: 'analytics' },
    { path: '/history', label: t.history, icon: 'history' },
    { path: '/settings', label: t.settings, icon: 'settings' }
  ];

  return (
    <nav data-tour="nav-bar" className="fixed bottom-0 left-0 right-0 bg-primary border-t border-primary shadow-xl z-50 backdrop-blur-lg">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-all duration-200 ${
                isActive
                  ? 'text-brand scale-105'
                  : 'text-secondary hover:text-primary hover:scale-102'
              }`}
            >
              <NavIcon
                name={item.icon}
                active={isActive}
                className={isActive ? 'animate-scale-in' : ''}
              />
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-brand' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 bg-brand rounded-t-full animate-scale-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// App content component (inside ThemeProvider)
function AppContent() {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'tl'
  );

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <SilentTimeProvider>
      <QRSecurityProvider>
        <QRSecurityGate language={language}>
          <TourProvider>
            <Router>
              <ScrollToTop />
              <div className="min-h-screen bg-secondary pb-16 transition-colors duration-300">
                {/* <ThemeToggle /> */}
                <main className="animate-fade-in">
                  <Routes>
                    <Route path="/" element={<Dashboard language={language} />} />
                    <Route path="/controls" element={<Controls language={language} />} />
                    <Route path="/analytics" element={<Analytics language={language} />} />
                    <Route path="/history" element={<History language={language} />} />
                    <Route path="/settings" element={<Settings language={language} onLanguageChange={handleLanguageChange} />} />

                    {/* Analytics Sub-pages */}
                    <Route path="/harvest-planner" element={<HarvestPlanner language={language} />} />
                    <Route path="/add-harvest" element={<AddHarvest language={language} />} />
                    <Route path="/rainfall-tracker" element={<RainfallTracker language={language} />} />
                    <Route path="/crop-health-monitor" element={<CropHealthMonitor language={language} />} />
                    <Route path="/bird-analytics" element={<BirdAnalytics language={language} />} />
                    <Route path="/reports" element={<Reports language={language} />} />
                  </Routes>
                </main>
                <Navigation language={language} />
                <GuidedTour language={language} />
              </div>
            </Router>
          </TourProvider>
        </QRSecurityGate>
      </QRSecurityProvider>
    </SilentTimeProvider>
  );
}

// Main App component with Theme and Volume Providers
function App() {
  return (
    <ThemeProvider>
      <VolumeProvider>
        <AppContent />
      </VolumeProvider>
    </ThemeProvider>
  );
}

export default App;
