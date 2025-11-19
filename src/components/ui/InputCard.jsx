import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const InputCard = ({
  title,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'text',
  description,
  icon,
  error,
  required = false,
  disabled = false,
  className = '',
  style = {}
}) => {
  const { currentTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(value));

  const handleChange = (e) => {
    const newValue = e.target.value;
    setHasValue(Boolean(newValue));
    onChangeText?.(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const containerStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['3'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${error ? currentTheme.colors.error : currentTheme.colors.border}`,
    transition: `all ${currentTheme.animations.duration.normal}`,
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['2'] + 'px'
  };

  const iconStyle = {
    fontSize: '20px',
    color: currentTheme.colors.primary,
    marginRight: currentTheme.spacing['2'] + 'px'
  };

  const labelStyle = {
    fontSize: currentTheme.typography.sizes.md,
    fontWeight: currentTheme.typography.weights.semibold,
    color: currentTheme.colors.text,
    flex: 1
  };

  const requiredStyle = {
    color: currentTheme.colors.error,
    marginLeft: currentTheme.spacing['1'] + 'px'
  };

  const descriptionStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    marginBottom: currentTheme.spacing['2'] + 'px',
    lineHeight: 1.4
  };

  const inputStyle = {
    width: '100%',
    border: `1px solid ${isFocused ? currentTheme.colors.primary : currentTheme.colors.border}`,
    borderRadius: currentTheme.borderRadius.lg + 'px',
    padding: currentTheme.spacing['3'] + 'px',
    fontSize: currentTheme.typography.sizes.md,
    backgroundColor: currentTheme.colors.background,
    color: currentTheme.colors.text,
    outline: 'none',
    transition: `all ${currentTheme.animations.duration.fast}`,
    boxShadow: isFocused ? `0 0 0 3px ${currentTheme.colors.primary}20` : 'none'
  };

  const errorStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.error,
    marginTop: currentTheme.spacing['1'] + 'px',
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['1'] + 'px'
  };

  const inputType = keyboardType === 'numeric' ? 'number' :
                   keyboardType === 'email' ? 'email' :
                   keyboardType === 'password' ? 'password' : 'text';

  return (
    <div className={className} style={containerStyle}>
      {/* Header with icon and label */}
      <div style={headerStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <span style={labelStyle}>
          {title}
          {required && <span style={requiredStyle}>*</span>}
        </span>
      </div>

      {/* Description */}
      {description && <div style={descriptionStyle}>{description}</div>}

      {/* Input field */}
      <input
        type={inputType}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
      />

      {/* Error message */}
      {error && (
        <div style={errorStyle}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default InputCard;