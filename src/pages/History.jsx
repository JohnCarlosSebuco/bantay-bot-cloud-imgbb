import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import HistoryService from '../services/HistoryService';
import DeviceService from '../services/DeviceService';

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
  const [sensorHistory, setSensorHistory] = useState([]);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('sensor');
  const fadeOpacity = useRef(1);

  const texts = {
    en: {
      title: 'History',
      subtitle: 'Sensor logs',
      sensorHistory: 'Sensor',
      detectionHistory: 'Detection',
      motionHistory: 'Motion',
      environmentHistory: 'Environment',
      clearAll: 'Clear',
      refresh: 'Refresh',
      confirmClearTitle: 'Clear All',
      confirmClearMessage: 'Clear all history? This cannot be undone.',
      motionDetected: 'Motion detected',
      temperatureChange: 'Temperature',
      humidityChange: 'Humidity',
      noEvents: 'No records yet',
      loading: 'Loading...',
      events: 'records'
    },
    tl: {
      title: 'Kasaysayan',
      subtitle: 'Logs ng sensor',
      sensorHistory: 'Sensor',
      detectionHistory: 'Deteksyon',
      motionHistory: 'Galaw',
      environmentHistory: 'Environment',
      clearAll: 'Burahin',
      refresh: 'I-refresh',
      confirmClearTitle: 'Burahin',
      confirmClearMessage: 'Burahin lahat? Hindi maibabalik.',
      motionDetected: 'May galaw',
      temperatureChange: 'Temperatura',
      humidityChange: 'Humidity',
      noEvents: 'Walang records',
      loading: 'Loading...',
      events: 'records'
    }
  };

  const t = texts[language] || texts.en;

  const refresh = async () => {
    const [m, e, s, d] = await Promise.all([
      HistoryService.getMotionHistory(),
      HistoryService.getEnvHistory(),
      DeviceService.getSensorHistory(50),
      DeviceService.getDetectionHistory(50),
    ]);
    setMotion(m);
    setEnv(e);
    setSensorHistory(s);
    setDetectionHistory(d);
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

    // Subscribe to Firebase sensor history
    const unsubscribeSensor = DeviceService.subscribeToSensorHistory((history) => {
      setSensorHistory(history);
    }, 50);

    // Subscribe to Firebase detection history
    const unsubscribeDetection = DeviceService.subscribeToDetectionHistory((history) => {
      setDetectionHistory(history);
    }, 50);

    return () => {
      HistoryService.off('update', onUpdate);
      HistoryService.stop();
      if (unsubscribeSensor) unsubscribeSensor();
      if (unsubscribeDetection) unsubscribeDetection();
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

  // Sensor History Item Component
  const SensorHistoryItem = ({ item, isLast }) => (
    <div className={`p-3 sm:p-4 ${!isLast ? 'border-b border-primary' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs sm:text-sm font-medium text-primary">{item.timestamp}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">💧</span>
          <div>
            <div className="text-[10px] text-secondary">{language === 'tl' ? 'Halumigmig' : 'Humidity'}</div>
            <div className="text-xs sm:text-sm font-semibold text-primary">{item.soilHumidity?.toFixed(1)}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🌡️</span>
          <div>
            <div className="text-[10px] text-secondary">{language === 'tl' ? 'Temperatura' : 'Temperature'}</div>
            <div className="text-xs sm:text-sm font-semibold text-primary">{item.soilTemperature?.toFixed(1)}°C</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <div>
            <div className="text-[10px] text-secondary">{language === 'tl' ? 'Sustansya' : 'EC'}</div>
            <div className="text-xs sm:text-sm font-semibold text-primary">{item.soilConductivity?.toFixed(0)} µS</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🧪</span>
          <div>
            <div className="text-[10px] text-secondary">pH</div>
            <div className="text-xs sm:text-sm font-semibold text-primary">{item.ph?.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Detection History Item Component
  const DetectionHistoryItem = ({ item, isLast }) => (
    <div className={`p-3 sm:p-4 ${!isLast ? 'border-b border-primary' : ''}`}>
      <div className="flex gap-3">
        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-tertiary flex-shrink-0">
            <img
              src={item.imageUrl}
              alt="Detection"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">🐦</span>
              <span className="text-xs sm:text-sm font-semibold text-primary">
                {language === 'tl' ? 'Ibon Nakita' : 'Bird Detected'}
              </span>
            </div>
            {item.triggered && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-warning/20 text-warning">
                {language === 'tl' ? 'Na-trigger' : 'Triggered'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <div className="text-[10px] text-secondary">{language === 'tl' ? 'Laki' : 'Size'}</div>
              <div className="text-xs font-medium text-primary">{item.birdSize?.toFixed(0) || 0} px</div>
            </div>
            <div>
              <div className="text-[10px] text-secondary">{language === 'tl' ? 'Kumpiyansa' : 'Confidence'}</div>
              <div className="text-xs font-medium text-primary">{(item.confidence * 100)?.toFixed(0) || 0}%</div>
            </div>
            {item.detectionZone && (
              <div className="col-span-2">
                <div className="text-[10px] text-secondary">{language === 'tl' ? 'Lokasyon' : 'Zone'}</div>
                <div className="text-xs font-medium text-primary truncate">{item.detectionZone}</div>
              </div>
            )}
          </div>
          <div className="text-[10px] text-secondary mt-1">
            {formatTime(item.timestamp)} - {formatDate(item.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );

  // Empty State Component
  const EmptyState = ({ icon }) => (
    <div className="surface-primary rounded-xl p-8 sm:p-12 text-center border border-primary">
      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-50">{icon}</div>
      <div className="text-sm sm:text-base text-secondary font-medium">{t.noEvents}</div>
    </div>
  );

  const currentData = activeTab === 'sensor' ? sensorHistory : activeTab === 'detection' ? detectionHistory : activeTab === 'motion' ? motion : env;

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4">
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
          <div className="flex gap-1 sm:gap-2 surface-primary p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-primary">
            <TabButton
              label={t.sensorHistory}
              icon="🌱"
              count={sensorHistory.length}
              isActive={activeTab === 'sensor'}
              onClick={() => setActiveTab('sensor')}
            />
            <TabButton
              label={t.detectionHistory}
              icon="🐦"
              count={detectionHistory.length}
              isActive={activeTab === 'detection'}
              onClick={() => setActiveTab('detection')}
            />
            {/* <TabButton
              label={t.motionHistory}
              icon="👁️"
              count={motion.length}
              isActive={activeTab === 'motion'}
              onClick={() => setActiveTab('motion')}
            /> */}
            <TabButton
              label={t.environmentHistory}
              icon="🌡️"
              count={env.length}
              isActive={activeTab === 'environment'}
              onClick={() => setActiveTab('environment')}
            />
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-10">
          {currentData.length === 0 ? (
            <EmptyState icon={activeTab === 'sensor' ? '🌱' : activeTab === 'detection' ? '🐦' : activeTab === 'motion' ? '🔍' : '📊'} />
          ) : (
            <div className="surface-primary rounded-xl sm:rounded-2xl border border-primary overflow-hidden max-h-[60vh] overflow-y-auto">
              {activeTab === 'sensor' ? (
                currentData.map((item, index) => (
                  <SensorHistoryItem
                    key={item.id || index}
                    item={item}
                    isLast={index === currentData.length - 1}
                  />
                ))
              ) : activeTab === 'detection' ? (
                currentData.map((item, index) => (
                  <DetectionHistoryItem
                    key={item.id || index}
                    item={item}
                    isLast={index === currentData.length - 1}
                  />
                ))
              ) : (
                currentData.map((item, index) => (
                  <EventItem
                    key={index}
                    item={item}
                    type={activeTab}
                    isLast={index === currentData.length - 1}
                  />
                ))
              )}
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
