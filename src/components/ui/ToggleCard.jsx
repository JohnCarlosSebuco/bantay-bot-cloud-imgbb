import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ToggleCard = ({
  title,
  value,
  onValueChange,
  description,
  icon,
  disabled = false,
  loading = false,
  className = '',
  style = {}
}) => {
  const { currentTheme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const handleToggle = () => {
    if (!disabled && !loading) {
      onValueChange?.(!value);
    }
  };

  const containerStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['3'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: `all ${currentTheme.animations.duration.normal}`,
    transform: isPressed ? 'scale(0.98)' : 'scale(1)',
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

  const toggleContainerStyle = {
    position: 'relative',
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    backgroundColor: value ? currentTheme.colors.primary : currentTheme.colors.border,
    transition: `all ${currentTheme.animations.duration.fast}`,
    cursor: disabled || loading ? 'not-allowed' : 'pointer'
  };

  const toggleKnobStyle = {
    position: 'absolute',
    top: '2px',
    left: value ? '26px' : '2px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: `all ${currentTheme.animations.duration.fast}`,
    transform: loading ? 'scale(0.9)' : 'scale(1)'
  };

  const loadingStyle = {
    fontSize: '12px',
    animation: loading ? 'spin 1s linear infinite' : 'none'
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={handleToggle}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
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

        {/* Toggle Switch */}
        <div style={toggleContainerStyle}>
          <div style={toggleKnobStyle}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                ...loadingStyle
              }}>
                ⟳
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading state overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: currentTheme.borderRadius.xl + 'px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: currentTheme.typography.sizes.sm,
          color: currentTheme.colors.textSecondary
        }}>
          Updating...
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ToggleCard;