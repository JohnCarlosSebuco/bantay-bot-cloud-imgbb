import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const TimeInputCard = ({
  title,
  value,
  onChange,
  description,
  icon,
  disabled = false,
  className = '',
  style = {}
}) => {
  const { currentTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  // Convert 24h time to 12h format for display
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const containerStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['3'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`,
    transition: `all ${currentTheme.animations.duration.normal}`,
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  const contentStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const infoStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center'
  };

  const iconContainerStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: currentTheme.colors.primary + '15',
    marginRight: currentTheme.spacing['3'] + 'px'
  };

  const iconStyle = {
    fontSize: '20px',
    color: currentTheme.colors.primary
  };

  const textContainerStyle = {
    flex: 1
  };

  const titleStyle = {
    fontSize: currentTheme.typography.sizes.md,
    fontWeight: currentTheme.typography.weights.semibold,
    color: currentTheme.colors.text,
    marginBottom: description ? currentTheme.spacing['1'] + 'px' : 0
  };

  const descriptionStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    lineHeight: 1.4
  };

  const timeInputContainerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const timeInputStyle = {
    border: `1px solid ${isFocused ? currentTheme.colors.primary : currentTheme.colors.border}`,
    borderRadius: currentTheme.borderRadius.lg + 'px',
    padding: `${currentTheme.spacing['2']}px ${currentTheme.spacing['3']}px`,
    fontSize: currentTheme.typography.sizes.md,
    backgroundColor: currentTheme.colors.background,
    color: currentTheme.colors.text,
    outline: 'none',
    transition: `all ${currentTheme.animations.duration.fast}`,
    boxShadow: isFocused ? `0 0 0 3px ${currentTheme.colors.primary}20` : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    minWidth: '100px'
  };

  const timeDisplayStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    minWidth: '70px',
    textAlign: 'right'
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={contentStyle}>
        <div style={infoStyle}>
          {icon && (
            <div style={iconContainerStyle}>
              <span style={iconStyle}>{icon}</span>
            </div>
          )}
          <div style={textContainerStyle}>
            <div style={titleStyle}>{title}</div>
            {description && <div style={descriptionStyle}>{description}</div>}
          </div>
        </div>

        <div style={timeInputContainerStyle}>
          <span style={timeDisplayStyle}>{formatTime12h(value)}</span>
          <input
            type="time"
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            style={timeInputStyle}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeInputCard;
