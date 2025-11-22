import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import HistoryService from '../services/HistoryService';

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
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
  const [activeTab, setActiveTab] = useState('motion');
  const fadeOpacity = useRef(1);

  const texts = {
    en: {
      title: 'History',
      subtitle: 'Events & logs',
      motionHistory: 'Motion',
      environmentHistory: 'Environment',
      clearAll: 'Clear',
      refresh: 'Refresh',
      confirmClearTitle: 'Clear All',
      confirmClearMessage: 'Clear all history? This cannot be undone.',
      motionDetected: 'Motion detected',
      temperatureChange: 'Temperature',
      humidityChange: 'Humidity',
      noEvents: 'No events yet',
      loading: 'Loading...',
      events: 'events'
    },
    tl: {
      title: 'Kasaysayan',
      subtitle: 'Events at logs',
      motionHistory: 'Galaw',
      environmentHistory: 'Environment',
      clearAll: 'Burahin',
      refresh: 'I-refresh',
      confirmClearTitle: 'Burahin',
      confirmClearMessage: 'Burahin lahat? Hindi maibabalik.',
      motionDetected: 'May galaw',
      temperatureChange: 'Temperatura',
      humidityChange: 'Humidity',
      noEvents: 'Walang events',
      loading: 'Loading...',
      events: 'events'
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

  // Tab Button Component
  const TabButton = ({ label, icon, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer
        ${isActive
          ? 'bg-brand text-white shadow-md'
          : 'bg-tertiary text-secondary hover:bg-brand/10 hover:text-primary'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
          isActive ? 'bg-white/20' : 'bg-brand/20 text-brand'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  // Event Item Component
  const EventItem = ({ item, type, isLast }) => (
    <div className={`flex justify-between items-center p-2 sm:p-3 ${!isLast ? 'border-b border-primary' : ''}`}>
      <div className="flex items-center gap-2 sm:gap-3 flex-1">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
          type === 'motion' ? 'bg-warning/20' : 'bg-info/20'
        }`}>
          <span className="text-sm sm:text-lg">
            {type === 'motion' ? '🐦' : item.type === 'temperature' ? '🌡️' : '💧'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm text-primary font-medium truncate">
            {type === 'motion'
              ? t.motionDetected
              : `${item.type === 'temperature' ? t.temperatureChange : t.humidityChange}: ${item.value?.toFixed(1)}${item.type === 'temperature' ? '°C' : '%'}`
            }
          </div>
          <div className="text-[10px] sm:text-xs text-secondary">{formatTime(item.timestamp)}</div>
        </div>
      </div>
      <div className="text-[10px] sm:text-xs text-secondary text-right shrink-0 ml-2">{formatDate(item.timestamp)}</div>
    </div>
  );

  // Empty State Component
  const EmptyState = ({ icon }) => (
    <div className="surface-primary rounded-xl p-8 sm:p-12 text-center border border-primary">
      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-50">{icon}</div>
      <div className="text-sm sm:text-base text-secondary font-medium">{t.noEvents}</div>
    </div>
  );

  const currentData = activeTab === 'motion' ? motion : env;

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-14 sm:pt-16 pb-3 sm:pb-4 px-3 sm:px-4">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
                <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className={`
                  px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1
                  ${refreshing
                    ? 'bg-tertiary text-secondary cursor-wait'
                    : 'bg-brand text-white hover:bg-brand/90 cursor-pointer'
                  }
                `}
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              </button>
              <button
                onClick={clearAll}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🗑️</span>
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 surface-primary p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-primary">
            <TabButton
              label={t.motionHistory}
              icon="🐦"
              count={motion.length}
              isActive={activeTab === 'motion'}
              onClick={() => setActiveTab('motion')}
            />
            <TabButton
              label={t.environmentHistory}
              icon="🌡️"
              count={env.length}
              isActive={activeTab === 'environment'}
              onClick={() => setActiveTab('environment')}
            />
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-24">
          {currentData.length === 0 ? (
            <EmptyState icon={activeTab === 'motion' ? '🔍' : '📊'} />
          ) : (
            <div className="surface-primary rounded-xl sm:rounded-2xl border border-primary overflow-hidden max-h-[60vh] overflow-y-auto">
              {currentData.map((item, index) => (
                <EventItem
                  key={index}
                  item={item}
                  type={activeTab}
                  isLast={index === currentData.length - 1}
                />
              ))}
            </div>
          )}

          {/* Event Count */}
          {currentData.length > 0 && (
            <div className="text-center mt-3 sm:mt-4">
              <span className="text-[10px] sm:text-xs text-secondary">
                {currentData.length} {t.events}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
