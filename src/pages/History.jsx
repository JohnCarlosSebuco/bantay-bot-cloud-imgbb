import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import HistoryService from '../services/HistoryService';

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return '';
  }
};

const formatDate = (ts) => {
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return '';
  }
};

export default function History({ language }) {
  const { currentTheme } = useTheme();
  const [motion, setMotion] = useState([]);
  const [env, setEnv] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeOpacity = useRef(1);

  const texts = {
    en: {
      title: 'Event History',
      subtitle: 'System events and sensor logs',
      motionHistory: 'Motion Detection History',
      environmentHistory: 'Environment History',
      clearAll: 'Clear All',
      refresh: 'Refresh',
      confirmClearTitle: 'Clear All History',
      confirmClearMessage: 'Are you sure you want to clear all history? This cannot be undone.',
      cancel: 'Cancel',
      clear: 'Clear',
      motionDetected: 'Motion detected',
      temperatureChange: 'Temperature change',
      humidityChange: 'Humidity change',
      noEvents: 'No events recorded yet',
      loading: 'Loading history...'
    },
    tl: {
      title: 'Kasaysayan ng Event',
      subtitle: 'Mga event ng sistema at sensor logs',
      motionHistory: 'Kasaysayan ng Pagdetekta ng Galaw',
      environmentHistory: 'Kasaysayan ng Environment',
      clearAll: 'Burahin Lahat',
      refresh: 'I-refresh',
      confirmClearTitle: 'Burahin ang Lahat',
      confirmClearMessage: 'Sigurado ka bang gusto mong burahin ang lahat ng history? Hindi na ito maibabalik.',
      cancel: 'Kanselahin',
      clear: 'Burahin',
      motionDetected: 'Nadetektang galaw',
      temperatureChange: 'Pagbabago sa temperatura',
      humidityChange: 'Pagbabago sa humidity',
      noEvents: 'Walang narekord na events',
      loading: 'Naglo-load ng history...'
    }
  };

  const t = texts[language] || texts.en;

  const refresh = async () => {
    const [m, e] = await Promise.all([
      HistoryService.getMotionHistory(),
      HistoryService.getEnvHistory(),
    ]);
    setMotion(m);
    setEnv(e);
  };

  useEffect(() => {
    // Fade in animation
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 500, 1);
      fadeOpacity.current = progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();

    HistoryService.start();
    refresh();
    const onUpdate = () => refresh();
    HistoryService.on('update', onUpdate);
    return () => {
      HistoryService.off('update', onUpdate);
      HistoryService.stop();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const clearAll = async () => {
    if (window.confirm(`${t.confirmClearTitle}\n\n${t.confirmClearMessage}`)) {
      await HistoryService.clearAll();
      refresh();
    }
  };

  // Now using CSS classes instead of inline styles for better theme reliability

  const MotionHistorySection = () => (
    <div className="mb-6">
      <div className="flex items-center mb-3">
        <span className="text-xl text-warning mr-2">🚶</span>
        <h2 className="text-lg font-bold text-primary">{t.motionHistory}</h2>
      </div>
      <div className="surface-primary rounded-xl border border-primary max-h-96 overflow-y-auto">
        {motion.length === 0 ? (
          <div className="text-center p-8 text-secondary">
            <div className="text-5xl mb-2">🔍</div>
            <div>{t.noEvents}</div>
          </div>
        ) : (
          motion.map((item, index) => (
            <div key={index} className={`flex justify-between items-center p-3 ${
              index !== motion.length - 1 ? 'border-b border-primary' : ''
            }`}>
              <div className="flex-1">
                <div className="text-sm text-primary mb-1">{t.motionDetected}</div>
                <div className="text-xs text-secondary">{formatTime(item.timestamp)}</div>
              </div>
              <div className="text-xs text-secondary text-right min-w-15">{formatDate(item.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const EnvironmentHistorySection = () => (
    <div className="mb-6">
      <div className="flex items-center mb-3">
        <span className="text-xl text-info mr-2">🌡️</span>
        <h2 className="text-lg font-bold text-primary">{t.environmentHistory}</h2>
      </div>
      <div className="surface-primary rounded-xl border border-primary max-h-96 overflow-y-auto">
        {env.length === 0 ? (
          <div className="text-center p-8 text-secondary">
            <div className="text-5xl mb-2">📊</div>
            <div>{t.noEvents}</div>
          </div>
        ) : (
          env.map((item, index) => (
            <div key={index} className={`flex justify-between items-center p-3 ${
              index !== env.length - 1 ? 'border-b border-primary' : ''
            }`}>
              <div className="flex-1">
                <div className="text-sm text-primary mb-1">
                  {item.type === 'temperature' ? t.temperatureChange : t.humidityChange}: {item.value?.toFixed(1)}
                  {item.type === 'temperature' ? '°C' : '%'}
                </div>
                <div className="text-xs text-secondary">{formatTime(item.timestamp)}</div>
              </div>
              <div className="text-xs text-secondary text-right min-w-15">{formatDate(item.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <div className="opacity-100">
        {/* Header */}
        <div className="pt-16 pb-6 px-4 bg-secondary">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-3xl text-brand mr-2">📊</span>
                <h1 className="text-4xl font-bold text-primary">{t.title}</h1>
              </div>
              <p className="text-sm text-secondary font-medium">{t.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-2 py-2 rounded-md bg-brand text-white text-sm font-medium cursor-pointer border-0"
                disabled={refreshing}
              >
                <span>🔄</span>
                <span>{refreshing ? t.loading : t.refresh}</span>
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-2 py-2 rounded-md bg-error text-white text-sm font-medium cursor-pointer border-0"
              >
                <span>🗑️</span>
                <span>{t.clearAll}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 pb-24">
          <MotionHistorySection />
          <EnvironmentHistorySection />
        </div>
      </div>
    </div>
  );
}