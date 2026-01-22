import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Droplets,
  Thermometer,
  FlaskConical,
  Zap,
  Heart,
  CloudRain,
  AlertTriangle,
  Clock,
  Moon,
  Check,
  Leaf,
  Snowflake,
} from 'lucide-react';
import notificationService from '../../services/NotificationService';

const NotificationPreferences = ({ language = 'en' }) => {
  const [preferences, setPreferences] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const texts = {
    en: {
      title: 'Push Notifications',
      subtitle: 'Get alerts for crop conditions',
      enableNotifications: 'Enable Push Notifications',
      enableDesc: 'Receive alerts even when app is closed',
      permissionRequired: 'Permission Required',
      permissionDenied: 'Notifications Blocked',
      permissionDeniedDesc: 'Enable in browser settings',
      grantPermission: 'Enable Notifications',
      categories: 'Alert Categories',
      soilMoisture: 'Soil Moisture',
      soilMoistureDesc: 'Low moisture alerts',
      soilTemperature: 'Soil Temperature',
      soilTemperatureDesc: 'Hot/cold alerts',
      soilPH: 'Soil pH',
      soilPHDesc: 'Acidic/alkaline alerts',
      soilConductivity: 'Nutrients',
      soilConductivityDesc: 'Low nutrient alerts',
      healthScore: 'Health Score',
      healthScoreDesc: 'Overall health alerts',
      waterStress: 'Water Stress',
      waterStressDesc: 'Drought warnings',
      warning: 'Warning',
      critical: 'Critical',
      throttling: 'Notification Frequency',
      throttlingDesc: 'Control how often alerts are sent',
      minInterval: 'Minimum interval',
      minutes: 'minutes',
      quietHours: 'Quiet Hours',
      quietHoursDesc: 'No alerts during sleep time',
      from: 'From',
      to: 'To',
      saving: 'Saving...',
      saved: 'Saved!',
      notSupported: 'Not Supported',
      notSupportedDesc: 'Push notifications are not supported in this browser',
      // Recommendations
      recommendations: 'Smart Recommendations',
      recommendationsDesc: 'Action alerts like irrigate, fertilize',
      irrigate: 'Irrigate Paddy',
      irrigateDesc: 'Low moisture alert',
      drainage: 'Mid-Season Drainage',
      drainageDesc: 'High moisture alert',
      waterDepth: 'Water Depth',
      waterDepthDesc: 'Temperature-based alerts',
      fertilizer: 'Fertilizer',
      fertilizerDesc: 'Nutrient level alerts',
      phAsh: 'Apply Ash',
      phAshDesc: 'Low pH alert',
    },
    tl: {
      title: 'Push Notifications',
      subtitle: 'Makatanggap ng alerto sa kondisyon ng pananim',
      enableNotifications: 'I-enable ang Push Notifications',
      enableDesc: 'Makatanggap ng alerto kahit sarado ang app',
      permissionRequired: 'Kailangan ng Pahintulot',
      permissionDenied: 'Naka-block ang Notifications',
      permissionDeniedDesc: 'I-enable sa browser settings',
      grantPermission: 'I-enable ang Notifications',
      categories: 'Mga Uri ng Alerto',
      soilMoisture: 'Basa ng Lupa',
      soilMoistureDesc: 'Alerto sa tuyong lupa',
      soilTemperature: 'Init ng Lupa',
      soilTemperatureDesc: 'Alerto sa init/lamig',
      soilPH: 'pH ng Lupa',
      soilPHDesc: 'Alerto sa asim/tabang',
      soilConductivity: 'Sustansya',
      soilConductivityDesc: 'Alerto sa kulang na sustansya',
      healthScore: 'Health Score',
      healthScoreDesc: 'Alerto sa kabuuang kalusugan',
      waterStress: 'Stress sa Tubig',
      waterStressDesc: 'Babala sa tagtuyot',
      warning: 'Babala',
      critical: 'Kritikal',
      throttling: 'Dalas ng Notification',
      throttlingDesc: 'Kontrolin kung gaano kadalas ang alerto',
      minInterval: 'Minimum na pagitan',
      minutes: 'minuto',
      quietHours: 'Tahimik na Oras',
      quietHoursDesc: 'Walang alerto habang natutulog',
      from: 'Mula',
      to: 'Hanggang',
      saving: 'Nagse-save...',
      saved: 'Na-save na!',
      notSupported: 'Hindi Suportado',
      notSupportedDesc: 'Hindi suportado ang push notifications sa browser na ito',
      // Recommendations
      recommendations: 'Mga Rekomendasyon',
      recommendationsDesc: 'Mga alerto tulad ng patubig, pataba',
      irrigate: 'Padaluyin ang Tubig',
      irrigateDesc: 'Alerto sa tuyong lupa',
      drainage: 'Pagsasapaw',
      drainageDesc: 'Alerto sa sobrang basa',
      waterDepth: 'Lalim ng Tubig',
      waterDepthDesc: 'Alerto batay sa temperatura',
      fertilizer: 'Pataba',
      fertilizerDesc: 'Alerto sa sustansya',
      phAsh: 'Maglagay ng Abo',
      phAshDesc: 'Alerto sa mababang pH',
    },
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    loadPreferences();
    setPermissionStatus(notificationService.getPermissionStatus());
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    await notificationService.initialize();
    const prefs = notificationService.getPreferences();
    setPreferences(prefs);
    setLoading(false);
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    await notificationService.requestPermission();
    setPermissionStatus(notificationService.getPermissionStatus());
    await loadPreferences();
    setLoading(false);
  };

  const updatePreference = async (key, value) => {
    // If enabling notifications and permission not granted, request permission first
    if (key === 'enabled' && value === true && permissionStatus !== 'granted') {
      setLoading(true);
      await notificationService.requestPermission();
      const newStatus = notificationService.getPermissionStatus();
      setPermissionStatus(newStatus);
      setLoading(false);

      // If permission was denied, don't enable
      if (newStatus !== 'granted') {
        return;
      }
    }

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setSaving(true);
    await notificationService.savePreferences(updated);
    setSaving(false);
    showSaved();
  };

  const updateCategoryPreference = async (category, field, value) => {
    const updated = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [field]: value,
      },
    };
    setPreferences(updated);
    setSaving(true);
    await notificationService.savePreferences(updated);
    setSaving(false);
    showSaved();
  };

  const updateThrottlePreference = async (field, value) => {
    const updated = {
      ...preferences,
      throttle: {
        ...preferences.throttle,
        [field]: value,
      },
    };
    setPreferences(updated);
    setSaving(true);
    await notificationService.savePreferences(updated);
    setSaving(false);
    showSaved();
  };

  const updateRecommendationPreference = async (field, value) => {
    const updated = {
      ...preferences,
      recommendations: {
        ...preferences.recommendations,
        [field]: value,
      },
    };
    setPreferences(updated);
    setSaving(true);
    await notificationService.savePreferences(updated);
    setSaving(false);
    showSaved();
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Check if notifications are supported
  if (!notificationService.isSupported()) {
    return (
      <div className="surface-primary rounded-xl p-4 border border-primary">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <BellOff className="text-gray-400" size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-primary">{t.notSupported}</h4>
            <p className="text-xs text-secondary">{t.notSupportedDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !preferences) {
    return (
      <div className="surface-primary rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const notificationCategories = [
    {
      key: 'soil_moisture',
      icon: Droplets,
      label: t.soilMoisture,
      desc: t.soilMoistureDesc,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      key: 'soil_temperature',
      icon: Thermometer,
      label: t.soilTemperature,
      desc: t.soilTemperatureDesc,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
    {
      key: 'soil_ph',
      icon: FlaskConical,
      label: t.soilPH,
      desc: t.soilPHDesc,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
    {
      key: 'soil_conductivity',
      icon: Zap,
      label: t.soilConductivity,
      desc: t.soilConductivityDesc,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
    },
    {
      key: 'health_score',
      icon: Heart,
      label: t.healthScore,
      desc: t.healthScoreDesc,
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
    },
    {
      key: 'water_stress',
      icon: CloudRain,
      label: t.waterStress,
      desc: t.waterStressDesc,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/20',
    },
  ];

  const recommendationCategories = [
    {
      key: 'irrigate',
      icon: Droplets,
      label: t.irrigate,
      desc: t.irrigateDesc,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      key: 'drainage',
      icon: CloudRain,
      label: t.drainage,
      desc: t.drainageDesc,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/20',
    },
    {
      key: 'water_depth',
      icon: Thermometer,
      label: t.waterDepth,
      desc: t.waterDepthDesc,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
    {
      key: 'fertilizer',
      icon: Leaf,
      label: t.fertilizer,
      desc: t.fertilizerDesc,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      key: 'ph_ash',
      icon: FlaskConical,
      label: t.phAsh,
      desc: t.phAshDesc,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Permission Status */}
      {permissionStatus !== 'granted' && (
        <div className="surface-primary rounded-xl p-4 border-2 border-warning/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning" size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-primary">
                {permissionStatus === 'denied' ? t.permissionDenied : t.permissionRequired}
              </h4>
              <p className="text-xs text-secondary">
                {permissionStatus === 'denied' ? t.permissionDeniedDesc : t.enableDesc}
              </p>
            </div>
          </div>
          {permissionStatus !== 'denied' && (
            <button
              onClick={handleRequestPermission}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              {t.grantPermission}
            </button>
          )}
        </div>
      )}

      {/* Master Toggle */}
      <div className="surface-primary rounded-xl p-4 border border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                preferences.enabled ? 'bg-brand/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {preferences.enabled ? (
                <Bell className="text-brand" size={20} />
              ) : (
                <BellOff className="text-gray-400" size={20} />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-primary">{t.enableNotifications}</h4>
              <p className="text-xs text-secondary">{t.enableDesc}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => updatePreference('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
          </label>
        </div>
      </div>

      {/* Alert Categories */}
      {preferences.enabled && permissionStatus === 'granted' && (
        <div className="surface-primary rounded-xl p-4 border border-primary">
          <h4 className="font-semibold text-primary mb-3">{t.categories}</h4>
          <div className="space-y-2">
            {notificationCategories.map(({ key, icon: Icon, label, desc, color, bgColor }) => (
              <div key={key} className="bg-tertiary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-primary">{label}</span>
                      <p className="text-xs text-secondary">{desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[key]?.enabled}
                      onChange={(e) => updateCategoryPreference(key, 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
                {preferences[key]?.enabled && (
                  <div className="flex gap-4 mt-2 pl-10">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[key]?.warning}
                        onChange={(e) => updateCategoryPreference(key, 'warning', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-warning focus:ring-warning"
                      />
                      <span className="text-warning font-medium">{t.warning}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[key]?.critical}
                        onChange={(e) => updateCategoryPreference(key, 'critical', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-error focus:ring-error"
                      />
                      <span className="text-error font-medium">{t.critical}</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Recommendations */}
      {preferences.enabled && permissionStatus === 'granted' && (
        <div className="surface-primary rounded-xl p-4 border border-primary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Leaf size={16} className="text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold text-primary">{t.recommendations}</h4>
                <p className="text-xs text-secondary">{t.recommendationsDesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.recommendations?.enabled}
                onChange={(e) => updateRecommendationPreference('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>
          {preferences.recommendations?.enabled && (
            <div className="space-y-2">
              {recommendationCategories.map(({ key, icon: Icon, label, desc, color, bgColor }) => (
                <div key={key} className="bg-tertiary rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-primary">{label}</span>
                        <p className="text-xs text-secondary">{desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.recommendations?.[key]}
                        onChange={(e) => updateRecommendationPreference(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Throttling Settings */}
      {preferences.enabled && permissionStatus === 'granted' && (
        <div className="surface-primary rounded-xl p-4 border border-primary">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-secondary" />
            </div>
            <div>
              <h4 className="font-semibold text-primary">{t.throttling}</h4>
              <p className="text-xs text-secondary">{t.throttlingDesc}</p>
            </div>
          </div>

          <div className="space-y-4 pl-10">
            {/* Minimum Interval */}
            <div>
              <label className="text-xs text-secondary block mb-1">{t.minInterval}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={preferences.throttle?.minIntervalMinutes || 30}
                  onChange={(e) =>
                    updateThrottlePreference('minIntervalMinutes', parseInt(e.target.value) || 30)
                  }
                  className="w-20 px-3 py-2 border border-primary rounded-lg text-sm bg-tertiary text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="text-sm text-secondary">{t.minutes}</span>
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Moon size={16} className="text-secondary" />
                  <span className="text-sm text-primary">{t.quietHours}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.throttle?.respectQuietHours || false}
                    onChange={(e) => updateThrottlePreference('respectQuietHours', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>
              <p className="text-xs text-secondary mb-2">{t.quietHoursDesc}</p>
              {preferences.throttle?.respectQuietHours && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">{t.from}</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={preferences.throttle?.quietHoursStart || 22}
                    onChange={(e) =>
                      updateThrottlePreference('quietHoursStart', parseInt(e.target.value) || 22)
                    }
                    className="w-14 px-2 py-1.5 border border-primary rounded text-sm bg-tertiary text-primary text-center focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <span className="text-xs text-secondary">{t.to}</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={preferences.throttle?.quietHoursEnd || 6}
                    onChange={(e) =>
                      updateThrottlePreference('quietHoursEnd', parseInt(e.target.value) || 6)
                    }
                    className="w-14 px-2 py-1.5 border border-primary rounded text-sm bg-tertiary text-primary text-center focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Status */}
      {(saving || saved) && (
        <div
          className={`text-center text-sm font-medium transition-opacity ${
            saved ? 'text-success' : 'text-brand'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            {saved && <Check size={16} />}
            {saving ? t.saving : t.saved}
          </span>
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
