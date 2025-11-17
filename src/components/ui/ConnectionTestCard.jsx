import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ConnectionTestCard = ({
  title,
  description,
  buttonText = 'Test Connection',
  onTest,
  testResults = null,
  isLoading = false,
  className = '',
  style = {}
}) => {
  const { currentTheme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const handleTest = () => {
    if (!isLoading) {
      onTest?.();
    }
  };

  const containerStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderRadius: currentTheme.borderRadius.xl + 'px',
    padding: currentTheme.spacing['4'] + 'px',
    marginBottom: currentTheme.spacing['3'] + 'px',
    boxShadow: currentTheme.shadows.sm,
    border: `1px solid ${currentTheme.colors.border}`,
    borderLeft: `4px solid ${currentTheme.colors.info}`,
    transition: `all ${currentTheme.animations.duration.normal}`,
    ...style
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['3'] + 'px'
  };

  const titleStyle = {
    fontSize: currentTheme.typography.sizes.md,
    fontWeight: currentTheme.typography.weights.semibold,
    color: currentTheme.colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['2'] + 'px'
  };

  const descriptionStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    marginBottom: currentTheme.spacing['3'] + 'px',
    lineHeight: 1.4
  };

  const buttonStyle = {
    backgroundColor: isLoading ? currentTheme.colors.border : currentTheme.colors.info,
    color: 'white',
    border: 'none',
    borderRadius: currentTheme.borderRadius.lg + 'px',
    padding: `${currentTheme.spacing['3']}px ${currentTheme.spacing['4']}px`,
    fontSize: currentTheme.typography.sizes.md,
    fontWeight: currentTheme.typography.weights.bold,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: `all ${currentTheme.animations.duration.fast}`,
    transform: isPressed && !isLoading ? 'scale(0.98)' : 'scale(1)',
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['2'] + 'px',
    width: '100%',
    justifyContent: 'center',
    opacity: isLoading ? 0.6 : 1
  };

  const resultsStyle = {
    marginTop: currentTheme.spacing['3'] + 'px',
    padding: currentTheme.spacing['3'] + 'px',
    backgroundColor: currentTheme.colors.background,
    borderRadius: currentTheme.borderRadius.md + 'px',
    border: `1px solid ${currentTheme.colors.border}`
  };

  const resultItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: currentTheme.spacing['2'] + 'px',
    paddingBottom: currentTheme.spacing['2'] + 'px',
    borderBottom: `1px solid ${currentTheme.colors.border}`
  };

  const resultLabelStyle = {
    fontSize: currentTheme.typography.sizes.sm,
    color: currentTheme.colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: currentTheme.spacing['2'] + 'px'
  };

  const getStatusStyle = (status) => {
    const baseStyle = {
      fontSize: currentTheme.typography.sizes.sm,
      fontWeight: currentTheme.typography.weights.medium,
      padding: `${currentTheme.spacing['1']}px ${currentTheme.spacing['2']}px`,
      borderRadius: currentTheme.borderRadius.md + 'px'
    };

    switch (status) {
      case 'Connected':
        return {
          ...baseStyle,
          color: currentTheme.colors.success,
          backgroundColor: currentTheme.colors.success + '20'
        };
      case 'Failed':
        return {
          ...baseStyle,
          color: currentTheme.colors.error,
          backgroundColor: currentTheme.colors.error + '20'
        };
      case 'Testing...':
        return {
          ...baseStyle,
          color: currentTheme.colors.warning,
          backgroundColor: currentTheme.colors.warning + '20'
        };
      default:
        return {
          ...baseStyle,
          color: currentTheme.colors.textSecondary,
          backgroundColor: currentTheme.colors.border
        };
    }
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <span>📡</span>
          <span>{title}</span>
        </div>
      </div>

      {/* Description */}
      {description && <div style={descriptionStyle}>{description}</div>}

      {/* Test Results */}
      {testResults && (
        <div style={resultsStyle}>
          {testResults.camera !== undefined && (
            <div style={resultItemStyle}>
              <div style={resultLabelStyle}>
                <span>📷</span>
                <span>Camera Board</span>
              </div>
              <div style={getStatusStyle(testResults.camera)}>
                {testResults.camera}
              </div>
            </div>
          )}

          {testResults.mainBoard !== undefined && (
            <div style={resultItemStyle}>
              <div style={resultLabelStyle}>
                <span>🔧</span>
                <span>Main Board</span>
              </div>
              <div style={getStatusStyle(testResults.mainBoard)}>
                {testResults.mainBoard}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Button */}
      <button
        style={buttonStyle}
        onClick={handleTest}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span style={{
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }}>⟳</span>
            <span>Testing...</span>
          </>
        ) : (
          <>
            <span>🔍</span>
            <span>{buttonText}</span>
          </>
        )}
      </button>

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

export default ConnectionTestCard;