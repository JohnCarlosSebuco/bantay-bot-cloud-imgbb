import React, { useState } from 'react';

const QuickActionButton = ({
  icon,
  label,
  sublabel,
  color = '#00B08B',
  gradient,
  onPress,
  disabled = false,
  size = 'medium',  // 'small', 'medium', 'large'
  variant = 'solid', // 'solid', 'outline', 'ghost'
  loading = false,
  className = '',
  style = {}
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const sizeConfig = {
    small: {
      padding: 'p-3',
      minHeight: 'min-h-[50px]',
      iconSize: 'text-3xl',
      labelSize: 'text-sm',
      sublabelSize: 'text-xs',
      borderRadius: 'rounded-lg',
    },
    medium: {
      padding: 'p-4',
      minHeight: 'min-h-[60px]',
      iconSize: 'text-4xl',
      labelSize: 'text-base',
      sublabelSize: 'text-sm',
      borderRadius: 'rounded-xl',
    },
    large: {
      padding: 'p-5',
      minHeight: 'min-h-[80px]',
      iconSize: 'text-5xl',
      labelSize: 'text-lg',
      sublabelSize: 'text-base',
      borderRadius: 'rounded-2xl',
    },
  };

  const config = sizeConfig[size];

  const handleMouseDown = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      onPress?.();
    }
  };

  const baseClasses = `
    ${config.padding}
    ${config.minHeight}
    ${config.borderRadius}
    flex flex-row items-center justify-center
    transition-all duration-150 ease-in-out
    cursor-pointer select-none
    shadow-lg hover:shadow-xl
    ${isPressed ? 'transform scale-95 opacity-80' : 'transform scale-100 opacity-100'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  const variantClasses = {
    solid: gradient
      ? `bg-gradient-to-br text-white`
      : `text-white`,
    outline: `border-2 bg-transparent`,
    ghost: `bg-gray-100 text-gray-800`
  };

  const renderContent = () => (
    <>
      {icon && (
        <span className={`${config.iconSize} mr-2`}>
          {icon}
        </span>
      )}

      <div className="text-center">
        <div className={`${config.labelSize} font-bold`}>
          {loading ? 'Loading...' : label}
        </div>

        {sublabel && !loading && (
          <div className={`${config.sublabelSize} opacity-90 mt-1`}>
            {sublabel}
          </div>
        )}
      </div>
    </>
  );

  const buttonStyle = {
    backgroundColor: variant === 'solid' && !gradient ? color : undefined,
    borderColor: variant === 'outline' ? color : undefined,
    backgroundImage: variant === 'solid' && gradient
      ? `linear-gradient(135deg, ${gradient.join(', ')})`
      : undefined,
    color: variant === 'outline' || variant === 'ghost' ? color : undefined,
    ...style
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={buttonStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || loading}
    >
      {renderContent()}
    </button>
  );
};

export default QuickActionButton;