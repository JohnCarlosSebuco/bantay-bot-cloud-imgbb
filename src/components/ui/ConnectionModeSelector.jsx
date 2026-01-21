import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CONNECTION_MODES } from '../../services/OfflineModeService';

/**
 * Connection Mode Selector Component
 * Allows user to select between AUTO, ONLINE, and OFFLINE modes
 */
const ConnectionModeSelector = ({
  currentMode,
  onModeChange,
  disabled = false,
  language = 'en'
}) => {
  const { currentTheme } = useTheme();

  const texts = {
    en: {
      title: 'Connection Mode',
      auto: 'Auto',
      autoDesc: 'Detect automatically',
      online: 'Online',
      onlineDesc: 'Always use cloud',
      offline: 'Offline',
      offlineDesc: 'Local only'
    },
    tl: {
      title: 'Connection Mode',
      auto: 'Auto',
      autoDesc: 'Awtomatikong detect',
      online: 'Online',
      onlineDesc: 'Palaging cloud',
      offline: 'Offline',
      offlineDesc: 'Lokal lang'
    }
  };

  const t = texts[language] || texts.en;

  const modes = [
    {
      value: CONNECTION_MODES.AUTO,
      label: t.auto,
      description: t.autoDesc,
      icon: '\u26A1', // Lightning bolt
      color: currentTheme.colors.primary
    },
    {
      value: CONNECTION_MODES.ONLINE,
      label: t.online,
      description: t.onlineDesc,
      icon: '\uD83D\uDCF6', // Signal bars / wifi
      color: currentTheme.colors.success || '#22c55e'
    },
    {
      value: CONNECTION_MODES.OFFLINE,
      label: t.offline,
      description: t.offlineDesc,
      icon: '\uD83D\uDEB7', // No wifi symbol
      color: currentTheme.colors.warning || '#f97316'
    }
  ];

  const containerStyle = {
    marginBottom: currentTheme.spacing['4'] + 'px'
  };

  const titleStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    fontWeight: currentTheme.typography.weights.medium,
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: currentTheme.spacing['2'] + 'px'
  };

  const getButtonStyle = (mode) => {
    const isSelected = currentMode === mode.value;
    return {
      padding: currentTheme.spacing['3'] + 'px',
      borderRadius: currentTheme.borderRadius.lg + 'px',
      border: `2px solid ${isSelected ? mode.color : currentTheme.colors.border}`,
      backgroundColor: isSelected ? mode.color + '15' : currentTheme.colors.surface,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: `all ${currentTheme.animations.duration.fast}`,
      textAlign: 'center'
    };
  };

  const iconStyle = (mode) => {
    const isSelected = currentMode === mode.value;
    return {
      fontSize: '20px',
      marginBottom: currentTheme.spacing['1'] + 'px',
      filter: isSelected ? 'none' : 'grayscale(0.5)',
      opacity: isSelected ? 1 : 0.6
    };
  };

  const labelStyle = (mode) => {
    const isSelected = currentMode === mode.value;
    return {
      fontSize: currentTheme.typography.sizes.xs,
      fontWeight: currentTheme.typography.weights.medium,
      color: isSelected ? currentTheme.colors.text : currentTheme.colors.textSecondary
    };
  };

  const descStyle = {
    fontSize: '10px',
    color: currentTheme.colors.textSecondary,
    marginTop: '2px'
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{t.title}</div>
      <div style={gridStyle}>
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => !disabled && onModeChange(mode.value)}
            disabled={disabled}
            style={getButtonStyle(mode)}
          >
            <div style={iconStyle(mode)}>{mode.icon}</div>
            <div style={labelStyle(mode)}>{mode.label}</div>
            <div style={descStyle}>{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConnectionModeSelector;
