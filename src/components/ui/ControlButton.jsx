import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ControlButton = ({
  command,
  title,
  description,
  icon,
  iconColor,
  onPress,
  confirmationMessage = null,
  isLoading = false,
  disabled = false,
  className = '',
  style = {}
}) => {
  const { currentTheme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [scale, setScale] = useState(1);

  const handleClick = () => {
    if (!disabled && !isLoading) {
      onPress?.(command, confirmationMessage);
    }
  };

  const handleMouseDown = () => {
    setIsPressed(true);
    setScale(0.96);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    setScale(1);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    setScale(1);
  };

  const containerStyle = {
    marginBottom: currentTheme.spacing['3'] + 'px',
    transform: `scale(${scale})`,
    transition: `transform ${currentTheme.animations.duration.fast}`,
    ...style
  };

  const buttonStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.6 : 1,
    transition: `all ${currentTheme.animations.duration.normal}`,
    userSelect: 'none'
  };

  const iconContainerStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iconColor + '15',
    marginRight: currentTheme.spacing['3'] + 'px',
    flexShrink: 0
  };

  const iconStyle = {
    fontSize: '24px',
    color: iconColor,
    lineHeight: 1
  };

  const textContainerStyle = {
    flex: 1,
    minWidth: 0
  };

  const titleStyle = {
    fontSize: currentTheme.typography.sizes.md,
    fontWeight: currentTheme.typography.weights.bold,
    color: isLoading ? currentTheme.colors.textSecondary : currentTheme.colors.text,
    marginBottom: currentTheme.spacing['1'] + 'px'
  };

  const descriptionStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    lineHeight: 1.4
  };

  const chevronStyle = {
    fontSize: '20px',
    color: currentTheme.colors.textSecondary,
    marginLeft: currentTheme.spacing['2'] + 'px',
    animation: isLoading ? 'spin 1s linear infinite' : 'none',
    display: 'inline-block'
  };

  return (
    <div className={className} style={containerStyle}>
      <div
        style={buttonStyle}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div style={iconContainerStyle}>
          <span style={iconStyle}>{icon}</span>
        </div>
        <div style={textContainerStyle}>
          <div style={titleStyle}>
            {isLoading ? 'Processing...' : title}
          </div>
          <div style={descriptionStyle}>{description}</div>
        </div>
        <span style={chevronStyle}>
          {isLoading ? '⟳' : '›'}
        </span>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ControlButton;