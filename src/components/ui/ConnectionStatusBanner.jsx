import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

/**
 * Connection Status Banner Component
 * Shows current connection state with queued data info and action buttons
 */
const ConnectionStatusBanner = ({
  connectionState,
  queuedDetections = 0,
  offlineDuration = 0,
  userModePreference = 0,
  onRetry,
  onSync,
  syncing = false,
  language = 'en'
}) => {
  const { currentTheme } = useTheme();

  const texts = {
    en: {
      online: 'Connected to cloud',
      offline: 'Offline mode - Bot still protecting',
      syncing: 'Syncing queued data...',
      unreachable: 'Cannot reach bot (check WiFi)',
      forcedOnline: 'Online mode (manual)',
      forcedOffline: 'Offline mode (manual)',
      queued: 'detections queued',
      duration: 'Offline for',
      retry: 'Retry',
      sync: 'Sync Now'
    },
    tl: {
      online: 'Nakakonekta sa cloud',
      offline: 'Offline mode - Nagbabantay pa rin',
      syncing: 'Nagsi-sync ng data...',
      unreachable: 'Hindi maabot ang bot (check WiFi)',
      forcedOnline: 'Online mode (manual)',
      forcedOffline: 'Offline mode (manual)',
      queued: 'detection na nakapila',
      duration: 'Offline sa loob ng',
      retry: 'I-retry',
      sync: 'I-sync Ngayon'
    }
  };

  const t = texts[language] || texts.en;

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const isForced = userModePreference !== CONNECTION_MODES.AUTO;

  // Color schemes for different states
  const colors = {
    online: {
      bg: (currentTheme.colors.success || '#22c55e') + '15',
      border: (currentTheme.colors.success || '#22c55e') + '40',
      text: currentTheme.colors.success || '#22c55e',
      icon: '\u2601\uFE0F' // Cloud
    },
    offline: {
      bg: (currentTheme.colors.warning || '#f97316') + '15',
      border: (currentTheme.colors.warning || '#f97316') + '40',
      text: currentTheme.colors.warning || '#f97316',
      icon: '\uD83D\uDEAB' // No entry / cloud off
    },
    syncing: {
      bg: '#eab30815',
      border: '#eab30840',
      text: '#eab308',
      icon: '\uD83D\uDD04' // Arrows rotating
    },
    unreachable: {
      bg: currentTheme.colors.textSecondary + '15',
      border: currentTheme.colors.textSecondary + '40',
      text: currentTheme.colors.textSecondary,
      icon: '\uD83D\uDCF5' // Phone off / no signal
    }
  };

  const getStateColors = () => {
    if (connectionState === 'syncing' || syncing) return colors.syncing;
    if (connectionState === 'online') return colors.online;
    if (connectionState === 'unreachable') return colors.unreachable;
    return colors.offline;
  };

  const stateColors = getStateColors();

  const bannerStyle = {
    backgroundColor: stateColors.bg,
    border: `1px solid ${stateColors.border}`,
    borderRadius: currentTheme.borderRadius.lg + 'px',
    padding: `${currentTheme.spacing['2']}px ${currentTheme.spacing['3']}px`
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const leftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['2'] + 'px'
  };

  const iconStyle = {
    fontSize: '16px',
    animation: (connectionState === 'syncing' || syncing) ? 'spin 1s linear infinite' : 'none'
  };

  const textStyle = {
    fontSize: currentTheme.typography.sizes.xs,
    fontWeight: currentTheme.typography.weights.medium,
    color: stateColors.text
  };

  const buttonStyle = {
    fontSize: currentTheme.typography.sizes.xs,
    color: stateColors.text,
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    marginLeft: currentTheme.spacing['2'] + 'px'
  };

  const detailsStyle = {
    display: 'flex',
    gap: currentTheme.spacing['3'] + 'px',
    marginTop: currentTheme.spacing['1'] + 'px',
    fontSize: '10px',
    color: stateColors.text,
    opacity: 0.7
  };

  const getMessage = () => {
    if (connectionState === 'syncing' || syncing) return t.syncing;
    if (connectionState === 'online') {
      return isForced && userModePreference === CONNECTION_MODES.ONLINE ? t.forcedOnline : t.online;
    }
    if (connectionState === 'unreachable') return t.unreachable;
    return isForced && userModePreference === CONNECTION_MODES.OFFLINE ? t.forcedOffline : t.offline;
  };

  return (
    <div style={bannerStyle}>
      <div style={rowStyle}>
        <div style={leftStyle}>
          <span style={iconStyle}>{stateColors.icon}</span>
          <span style={textStyle}>
            {getMessage()}
            {isForced && <span style={{ marginLeft: '4px' }}>\u26A1</span>}
          </span>
        </div>
        <div>
          {connectionState === 'unreachable' && onRetry && (
            <button style={buttonStyle} onClick={onRetry}>
              {t.retry}
            </button>
          )}
          {connectionState === 'offline' && queuedDetections > 0 && onSync && (
            <button style={buttonStyle} onClick={onSync}>
              {t.sync}
            </button>
          )}
          {connectionState === 'offline' && onRetry && userModePreference !== CONNECTION_MODES.OFFLINE && (
            <button style={buttonStyle} onClick={onRetry}>
              {t.retry}
            </button>
          )}
        </div>
      </div>

      {(connectionState === 'offline' || connectionState === 'syncing') && (queuedDetections > 0 || offlineDuration > 0) && (
        <div style={detailsStyle}>
          {queuedDetections > 0 && (
            <span>{queuedDetections} {t.queued}</span>
          )}
          {offlineDuration > 0 && (
            <span>{t.duration} {formatDuration(offlineDuration)}</span>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatusBanner;
