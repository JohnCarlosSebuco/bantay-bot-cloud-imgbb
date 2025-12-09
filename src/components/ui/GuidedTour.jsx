import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTour } from '../../contexts/TourContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const GuidedTour = ({ language = 'tl' }) => {
  const {
    isPlaying,
    currentStepData,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    skipTour,
    completeTour
  } = useTour();

  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef(null);

  // Find and highlight the target element
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData?.target) {
      setTargetRect(null);
      return;
    }

    const targetElement = document.querySelector(`[data-tour="${currentStepData.target}"]`);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8; // Add some padding around the element
      const viewportWidth = window.innerWidth;

      // Use exact component width but ensure it fits in viewport
      let width = rect.width + (padding * 2);
      let left = rect.left - padding;

      // If element is wider than viewport, constrain to viewport with margins
      if (width > viewportWidth - 16) {
        width = viewportWidth - 16;
        left = 8;
      } else {
        // Keep highlight within viewport bounds
        if (left < 8) left = 8;
        if (left + width > viewportWidth - 8) {
          left = viewportWidth - width - 8;
        }
      }

      setTargetRect({
        top: rect.top - padding,
        left: left,
        width: width,
        height: rect.height + (padding * 2),
        originalRect: rect
      });

      // Scroll element into view if needed
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStepData]);

  // Calculate tooltip position
  const calculateTooltipPosition = useCallback(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const arrowOffset = 12;

    let top, left;
    const position = currentStepData?.position || 'bottom';

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - arrowOffset;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        // If tooltip goes above viewport, switch to bottom
        if (top < margin) {
          top = targetRect.top + targetRect.height + arrowOffset;
        }
        break;
      case 'bottom':
      default:
        top = targetRect.top + targetRect.height + arrowOffset;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        // If tooltip goes below viewport, switch to top
        if (top + tooltipRect.height > viewportHeight - margin - 80) { // 80 for nav bar
          top = targetRect.top - tooltipRect.height - arrowOffset;
        }
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - arrowOffset;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left + targetRect.width + arrowOffset;
        break;
    }

    // Keep tooltip within viewport horizontally
    if (left < margin) left = margin;
    if (left + tooltipRect.width > viewportWidth - margin) {
      left = viewportWidth - tooltipRect.width - margin;
    }

    // Keep tooltip within viewport vertically
    if (top < margin) top = margin;
    if (top + tooltipRect.height > viewportHeight - margin - 80) {
      top = viewportHeight - tooltipRect.height - margin - 80;
    }

    setTooltipPosition({ top, left });
  }, [targetRect, currentStepData]);

  // Update position when step changes
  useEffect(() => {
    if (isPlaying && currentStepData) {
      setIsAnimating(true);

      // Small delay to allow DOM to update
      const timer = setTimeout(() => {
        updateTargetPosition();
        setIsAnimating(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStepData, currentStep, updateTargetPosition]);

  // Recalculate tooltip position after target is found
  useEffect(() => {
    if (targetRect) {
      // Small delay to ensure tooltip is rendered
      const timer = setTimeout(calculateTooltipPosition, 50);
      return () => clearTimeout(timer);
    }
  }, [targetRect, calculateTooltipPosition]);

  // Update positions on window resize
  useEffect(() => {
    const handleResize = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [updateTargetPosition]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying) return;

      switch (e.key) {
        case 'Escape':
          skipTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (isLastStep) {
            completeTour();
          } else {
            nextStep();
          }
          break;
        case 'ArrowLeft':
          if (!isFirstStep) {
            prevStep();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFirstStep, isLastStep, nextStep, prevStep, skipTour, completeTour]);

  if (!isPlaying || !currentStepData) return null;

  const title = currentStepData.title[language] || currentStepData.title.en;
  const description = currentStepData.description[language] || currentStepData.description.en;
  const icon = currentStepData.icon || '📍';

  return (
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 transition-all duration-300"
        onClick={skipTour}
        style={{
          background: targetRect
            ? `radial-gradient(ellipse at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2}px, rgba(0, 0, 0, 0.8) ${Math.max(targetRect.width, targetRect.height) / 2 + 50}px)`
            : 'rgba(0, 0, 0, 0.8)'
        }}
      />

      {/* Spotlight border highlight */}
      {targetRect && (
        <div
          className="absolute border-2 border-brand rounded-xl pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 4px rgba(var(--color-brand-rgb), 0.3), 0 0 20px rgba(var(--color-brand-rgb), 0.5)'
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        className={`absolute z-10 w-[calc(100vw-32px)] max-w-xs transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="surface-primary rounded-2xl shadow-2xl border border-primary overflow-hidden">
          {/* Header */}
          <div className="bg-brand/10 px-4 py-3 border-b border-primary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-bold text-base text-primary">{title}</h3>
            </div>
            <button
              onClick={skipTour}
              className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-secondary hover:text-primary hover:bg-tertiary/80 transition-colors"
              aria-label={language === 'tl' ? 'Isara' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <p className="text-sm text-secondary leading-relaxed">{description}</p>
          </div>

          {/* Footer - Navigation */}
          <div className="px-4 py-3 border-t border-primary flex items-center justify-between bg-tertiary/30">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? 'bg-brand w-4'
                      : idx < currentStep
                        ? 'bg-brand/50'
                        : 'bg-tertiary'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-tertiary transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">{language === 'tl' ? 'Bumalik' : 'Back'}</span>
                </button>
              )}

              {isFirstStep && (
                <button
                  onClick={skipTour}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-tertiary transition-colors"
                >
                  {language === 'tl' ? 'Laktawan' : 'Skip'}
                </button>
              )}

              <button
                onClick={isLastStep ? completeTour : nextStep}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                <span>{isLastStep
                  ? (language === 'tl' ? 'Tapos Na' : 'Done')
                  : (language === 'tl' ? 'Susunod' : 'Next')
                }</span>
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Step count text */}
        <div className="text-center mt-2">
          <span className="text-xs text-white/70">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
