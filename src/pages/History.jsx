import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DeviceService from '../services/DeviceService';

// Utility functions
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
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return '';
  }
};

const formatFullDate = (ts) => {
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (_) {
    return '';
  }
};

// Get sensor status based on value
const getSensorStatus = (type, value) => {
  const ranges = {
    humidity: { critical: [0, 20], warning: [20, 40], optimal: [40, 70], warningHigh: [70, 85], criticalHigh: [85, 100] },
    temperature: { critical: [0, 15], warning: [15, 20], optimal: [20, 30], warningHigh: [30, 35], criticalHigh: [35, 50] },
    conductivity: { critical: [0, 100], warning: [100, 200], optimal: [200, 2000], warningHigh: [2000, 3000], criticalHigh: [3000, 5000] },
    ph: { critical: [0, 4], warning: [4, 5.5], optimal: [5.5, 7.5], warningHigh: [7.5, 8.5], criticalHigh: [8.5, 14] },
  };

  const range = ranges[type];
  if (!range) return 'normal';

  if (value >= range.optimal[0] && value <= range.optimal[1]) return 'optimal';
  if ((value >= range.warning[0] && value < range.warning[1]) || (value > range.warningHigh[0] && value <= range.warningHigh[1])) return 'warning';
  return 'critical';
};

const getOverallStatus = (item) => {
  const statuses = [
    getSensorStatus('humidity', item.soilHumidity),
    getSensorStatus('temperature', item.soilTemperature),
    getSensorStatus('conductivity', item.soilConductivity),
    getSensorStatus('ph', item.ph),
  ];
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  return 'optimal';
};

export default function History({ language }) {
  const { currentTheme } = useTheme();
  const [sensorHistory, setSensorHistory] = useState([]);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('sensor');
  const fadeOpacity = useRef(1);

  // Filter & Sort State
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const listRef = useRef(null);

  const texts = {
    en: {
      title: 'History',
      subtitle: 'Activity logs & records',
      sensorHistory: 'Sensor',
      detectionHistory: 'Detection',
      refresh: 'Refresh',
      clearAll: 'Clear All',
      noEvents: 'No records yet',
      noFilterResults: 'No records match your filters',
      events: 'records',
      // Filters
      dateFilter: 'Date',
      statusFilter: 'Status',
      sortBy: 'Sort',
      // Date options
      today: 'Today',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      allTime: 'All time',
      // Status options
      all: 'All',
      critical: 'Critical',
      warning: 'Warning',
      optimal: 'Optimal',
      // Sort options
      newest: 'Newest first',
      oldest: 'Oldest first',
      severity: 'By severity',
      // Sensor labels
      humidity: 'Humidity',
      temperature: 'Temperature',
      nutrients: 'Nutrients',
      phLevel: 'pH Level',
      // Detection labels
      birdDetected: 'Bird Detected',
      size: 'Size',
      confidence: 'Confidence',
      zone: 'Zone',
      triggered: 'Triggered',
      // Modal
      confirmClearTitle: 'Clear All History?',
      confirmClearMessage: 'This action cannot be undone. All history records will be permanently deleted.',
      cancel: 'Cancel',
      clearConfirm: 'Clear All',
      // Empty states
      noSensorData: 'No sensor data recorded',
      noSensorDataDesc: 'Sensor readings will appear here when your device starts collecting data.',
      noDetectionData: 'No detections recorded',
      noDetectionDataDesc: 'Bird detection events will appear here when detected by your device.',
      refreshNow: 'Refresh Now',
      clearFilters: 'Clear Filters',
    },
    tl: {
      title: 'Kasaysayan',
      subtitle: 'Mga log at rekord',
      sensorHistory: 'Sensor',
      detectionHistory: 'Deteksyon',
      refresh: 'I-refresh',
      clearAll: 'Burahin Lahat',
      noEvents: 'Walang records',
      noFilterResults: 'Walang tugmang records',
      events: 'records',
      // Filters
      dateFilter: 'Petsa',
      statusFilter: 'Status',
      sortBy: 'Ayusin',
      // Date options
      today: 'Ngayon',
      last7Days: 'Huling 7 araw',
      last30Days: 'Huling 30 araw',
      allTime: 'Lahat',
      // Status options
      all: 'Lahat',
      critical: 'Kritikal',
      warning: 'Babala',
      optimal: 'Optimal',
      // Sort options
      newest: 'Pinakabago',
      oldest: 'Pinakaluma',
      severity: 'Ayon sa severity',
      // Sensor labels
      humidity: 'Halumigmig',
      temperature: 'Temperatura',
      nutrients: 'Sustansya',
      phLevel: 'pH Level',
      // Detection labels
      birdDetected: 'Ibon Nakita',
      size: 'Laki',
      confidence: 'Kumpiyansa',
      zone: 'Lokasyon',
      triggered: 'Na-trigger',
      // Modal
      confirmClearTitle: 'Burahin Lahat ng History?',
      confirmClearMessage: 'Hindi na maibabalik. Lahat ng history records ay permanenteng mabubura.',
      cancel: 'Kanselahin',
      clearConfirm: 'Burahin Lahat',
      // Empty states
      noSensorData: 'Walang sensor data',
      noSensorDataDesc: 'Lalabas dito ang mga reading kapag nagsimulang mangolekta ng data ang device.',
      noDetectionData: 'Walang detection records',
      noDetectionDataDesc: 'Lalabas dito ang mga bird detection kapag may nakita ang device.',
      refreshNow: 'I-refresh Ngayon',
      clearFilters: 'Alisin ang Filters',
    }
  };

  const t = texts[language] || texts.en;

  // Filter data based on current filters
  const filterData = (data) => {
    let filtered = [...data];

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(item => new Date(item.timestamp) >= todayStart);
    } else if (dateFilter === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.timestamp) >= weekAgo);
    } else if (dateFilter === '30days') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.timestamp) >= monthAgo);
    }

    // Status filter (for sensor data)
    if (activeTab === 'sensor' && statusFilter !== 'all') {
      filtered = filtered.filter(item => getOverallStatus(item) === statusFilter);
    }

    // Sort
    if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sortOrder === 'severity' && activeTab === 'sensor') {
      const severityOrder = { critical: 0, warning: 1, optimal: 2 };
      filtered.sort((a, b) => severityOrder[getOverallStatus(a)] - severityOrder[getOverallStatus(b)]);
    } else {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return filtered;
  };

  const refresh = async () => {
    const [s, d] = await Promise.all([
      DeviceService.getSensorHistory(50),
      DeviceService.getDetectionHistory(50),
    ]);
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

    refresh();

    // Subscribe to Firebase sensor history
    const unsubscribeSensor = DeviceService.subscribeToSensorHistory((history) => {
      setSensorHistory(history);
    }, 50);

    // Subscribe to Firebase detection history
    const unsubscribeDetection = DeviceService.subscribeToDetectionHistory((history) => {
      setDetectionHistory(history);
    }, 50);

    return () => {
      if (unsubscribeSensor) unsubscribeSensor();
      if (unsubscribeDetection) unsubscribeDetection();
    };
  }, []);

  const hasActiveFilters = dateFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setDateFilter('all');
    setStatusFilter('all');
    setSortOrder('newest');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDateDropdown(false);
      setShowStatusDropdown(false);
      setShowSortDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Tab Button Component - Readable for older users
  const TabButton = ({ label, icon, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer
        ${isActive
          ? 'bg-brand text-white shadow-sm shadow-brand/20'
          : 'text-secondary hover:text-primary hover:bg-tertiary'
        }
      `}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span className={`min-w-[18px] px-1 py-0.5 rounded-full text-[9px] font-bold text-center ${
          isActive ? 'bg-white/25 text-white' : 'bg-brand/15 text-brand'
        }`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );

  // Dropdown Component - Compact with fixed position
  const Dropdown = ({ label, value, options, isOpen, onToggle, onChange, icon }) => {
    const buttonRef = React.useRef(null);
    const [menuStyle, setMenuStyle] = React.useState({});

    React.useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: 128,
        });
      }
    }, [isOpen]);

    return (
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-tertiary hover:bg-tertiary/80 text-[10px] font-medium text-primary transition-all cursor-pointer"
        >
          {icon && <span className="text-[10px] opacity-60">{icon}</span>}
          <span className="truncate max-w-[60px]">{value}</span>
          <svg className={`w-3 h-3 text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div
            style={menuStyle}
            className="surface-primary rounded-lg shadow-2xl border border-primary overflow-hidden z-[100]"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={(e) => { e.stopPropagation(); onChange(option.value); onToggle(); }}
                className={`w-full text-left px-2.5 py-2 text-[10px] transition-colors cursor-pointer ${
                  value === option.label
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-primary hover:bg-tertiary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Status Badge Component
  const StatusBadge = ({ status, small = false }) => {
    const colors = {
      optimal: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      critical: 'bg-error/15 text-error',
    };
    const labels = {
      optimal: language === 'tl' ? 'OK' : 'OK',
      warning: '⚠',
      critical: '!',
    };
    return (
      <span className={`inline-flex items-center justify-center rounded-full font-bold ${colors[status]} ${small ? 'w-5 h-5 text-[10px]' : 'px-2 py-0.5 text-[10px] sm:text-xs'}`}>
        {labels[status]}
      </span>
    );
  };

  // Progress Bar Component
  const ProgressBar = ({ value, max, status }) => {
    const percent = Math.min((value / max) * 100, 100);
    const colors = {
      optimal: 'bg-success',
      warning: 'bg-warning',
      critical: 'bg-error',
    };
    return (
      <div className="h-1.5 bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors[status]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  // Compact Sensor History Item Component - Readable for older users
  const SensorHistoryItem = ({ item, isLast, isFirst }) => {
    const humidityStatus = getSensorStatus('humidity', item.soilHumidity);
    const tempStatus = getSensorStatus('temperature', item.soilTemperature);
    const ecStatus = getSensorStatus('conductivity', item.soilConductivity);
    const phStatus = getSensorStatus('ph', item.ph);
    const overallStatus = getOverallStatus(item);

    const statusColors = {
      optimal: 'text-success',
      warning: 'text-warning',
      critical: 'text-error',
    };

    return (
      <div className={`px-2.5 py-2 transition-colors hover:bg-tertiary/30 ${!isLast ? 'border-b border-primary/20' : ''}`}>
        {/* Compact Row Layout */}
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className={`w-1 h-8 rounded-full flex-shrink-0 ${
            overallStatus === 'optimal' ? 'bg-success' : overallStatus === 'warning' ? 'bg-warning' : 'bg-error'
          }`} />

          {/* Time */}
          <div className="w-14 shrink-0">
            <div className="text-[11px] font-semibold text-primary leading-tight">{formatTime(item.timestamp)}</div>
            <div className="text-[10px] text-secondary">{formatDate(item.timestamp)}</div>
          </div>

          {/* Sensor Values - Compact Grid */}
          <div className="flex-1 grid grid-cols-4 gap-1">
            <div className="text-center">
              <div className="text-[10px] text-secondary leading-none">💧</div>
              <div className={`text-xs font-bold leading-tight ${statusColors[humidityStatus]}`}>{item.soilHumidity?.toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-secondary leading-none">🌡️</div>
              <div className={`text-xs font-bold leading-tight ${statusColors[tempStatus]}`}>{item.soilTemperature?.toFixed(1)}°</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-secondary leading-none">⚡</div>
              <div className={`text-xs font-bold leading-tight ${statusColors[ecStatus]}`}>{item.soilConductivity?.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-secondary leading-none">🧪</div>
              <div className={`text-xs font-bold leading-tight ${statusColors[phStatus]}`}>{item.ph?.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Compact Detection History Item Component - Readable for older users
  const DetectionHistoryItem = ({ item, isLast }) => (
    <div className={`px-2.5 py-2 transition-colors hover:bg-tertiary/30 ${!isLast ? 'border-b border-primary/20' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-tertiary flex-shrink-0">
            <img
              src={item.imageUrl}
              alt="Detection"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-sm opacity-30">🐦</div>'; }}
            />
          </div>
        )}
        {!item.imageUrl && (
          <div className="w-10 h-10 rounded-lg bg-tertiary flex items-center justify-center flex-shrink-0">
            <span className="text-sm opacity-50">🐦</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-primary">{t.birdDetected}</span>
            {item.triggered && (
              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-warning/15 text-warning uppercase">
                {t.triggered}
              </span>
            )}
          </div>
          <div className="text-[10px] text-secondary">
            {formatTime(item.timestamp)} • {formatDate(item.timestamp)}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-center">
          <div>
            <div className="text-[9px] text-secondary">{t.size}</div>
            <div className="text-[11px] font-bold text-primary">{item.birdSize?.toFixed(0) || 0}px</div>
          </div>
          <div>
            <div className="text-[9px] text-secondary">{t.confidence}</div>
            <div className="text-[11px] font-bold text-success">{((item.confidence || 0) * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Empty State Component - Compact
  const EmptyState = ({ icon, title, description, showClearFilters = false }) => (
    <div className="surface-primary rounded-xl p-6 text-center border border-primary">
      <div className="w-12 h-12 rounded-xl bg-tertiary flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl opacity-50">{icon}</span>
      </div>
      <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
      <p className="text-[10px] text-secondary max-w-[200px] mx-auto">{description}</p>
      {showClearFilters && (
        <button
          onClick={clearFilters}
          className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-tertiary text-primary hover:bg-tertiary/80 transition-all cursor-pointer mx-auto"
        >
          <span>{t.clearFilters}</span>
        </button>
      )}
    </div>
  );

  const rawData = activeTab === 'sensor' ? sensorHistory : detectionHistory;
  const currentData = filterData(rawData);
  const isFiltered = hasActiveFilters && rawData.length > 0 && currentData.length === 0;

  // Date filter options
  const dateOptions = [
    { value: 'all', label: t.allTime },
    { value: 'today', label: t.today },
    { value: '7days', label: t.last7Days },
    { value: '30days', label: t.last30Days },
  ];

  // Status filter options
  const statusOptions = [
    { value: 'all', label: t.all },
    { value: 'critical', label: t.critical },
    { value: 'warning', label: t.warning },
    { value: 'optimal', label: t.optimal },
  ];

  // Sort options
  const sortOptions = [
    { value: 'newest', label: t.newest },
    { value: 'oldest', label: t.oldest },
    ...(activeTab === 'sensor' ? [{ value: 'severity', label: t.severity }] : []),
  ];

  const getDateLabel = () => dateOptions.find(o => o.value === dateFilter)?.label || t.allTime;
  const getStatusLabel = () => statusOptions.find(o => o.value === statusFilter)?.label || t.all;
  const getSortLabel = () => sortOptions.find(o => o.value === sortOrder)?.label || t.newest;

  return (
    <div className="bg-secondary flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 64px)' }}>
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Header - Consistent with Dashboard/Controls */}
        <div className="pt-4 sm:pt-5 pb-2 sm:pb-3 px-3 sm:px-4 flex-shrink-0 relative z-20 overflow-visible">
          <div className="flex items-center mb-1 sm:mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/20 flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-xl sm:text-2xl">📋</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t.title}</h1>
              <p className="text-xs sm:text-sm text-secondary">{t.subtitle}</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1.5 surface-primary p-1 rounded-xl border border-primary mb-2">
            <TabButton
              label={t.sensorHistory}
              icon="📊"
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
          </div>

          {/* Filter Bar - Single Line */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <Dropdown
              label={t.dateFilter}
              value={getDateLabel()}
              options={dateOptions}
              isOpen={showDateDropdown}
              onToggle={() => { setShowDateDropdown(!showDateDropdown); setShowStatusDropdown(false); setShowSortDropdown(false); }}
              onChange={setDateFilter}
              icon="📅"
            />
            {activeTab === 'sensor' && (
              <Dropdown
                label={t.statusFilter}
                value={getStatusLabel()}
                options={statusOptions}
                isOpen={showStatusDropdown}
                onToggle={() => { setShowStatusDropdown(!showStatusDropdown); setShowDateDropdown(false); setShowSortDropdown(false); }}
                onChange={setStatusFilter}
                icon="🔘"
              />
            )}
            <Dropdown
              label={t.sortBy}
              value={getSortLabel()}
              options={sortOptions}
              isOpen={showSortDropdown}
              onToggle={() => { setShowSortDropdown(!showSortDropdown); setShowDateDropdown(false); setShowStatusDropdown(false); }}
              onChange={setSortOrder}
              icon="↕️"
            />
            <div className="flex-1 min-w-0" />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[9px] text-brand font-medium hover:underline cursor-pointer whitespace-nowrap"
              >
                {t.clearFilters}
              </button>
            )}
            {/* Live indicator */}
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] text-secondary">Live</span>
            </div>
          </div>
        </div>

        {/* Content - Fills remaining space */}
        <div className="px-3 sm:px-4 flex-1 overflow-hidden flex flex-col min-h-0 relative z-10">
          {rawData.length === 0 ? (
            <EmptyState
              icon={activeTab === 'sensor' ? '📊' : '🐦'}
              title={activeTab === 'sensor' ? t.noSensorData : t.noDetectionData}
              description={activeTab === 'sensor' ? t.noSensorDataDesc : t.noDetectionDataDesc}
            />
          ) : isFiltered ? (
            <EmptyState
              icon="🔍"
              title={t.noFilterResults}
              description={language === 'tl' ? 'Subukang baguhin ang iyong mga filter.' : 'Try adjusting your filter criteria.'}
              showClearFilters
            />
          ) : (
            <div
              ref={listRef}
              className="surface-primary rounded-xl border border-primary overflow-hidden flex-1 overflow-y-auto scroll-smooth"
            >
              {activeTab === 'sensor' ? (
                currentData.map((item, index) => (
                  <SensorHistoryItem
                    key={item.id || index}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === currentData.length - 1}
                  />
                ))
              ) : (
                currentData.map((item, index) => (
                  <DetectionHistoryItem
                    key={item.id || index}
                    item={item}
                    isLast={index === currentData.length - 1}
                  />
                ))
              )}
            </div>
          )}

          {/* Record Count - Fixed at bottom */}
          {currentData.length > 0 && (
            <div className="flex-shrink-0 flex items-center justify-center py-1">
              <span className="text-[9px] text-secondary">
                {hasActiveFilters ? `${currentData.length}/${rawData.length}` : currentData.length} {t.events}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
