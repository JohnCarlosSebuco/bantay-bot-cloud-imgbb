import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TourContext = createContext();

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export const TourProvider = ({ children }) => {
  // Track which tours have been completed
  const [completedTours, setCompletedTours] = useState(() => {
    const saved = localStorage.getItem('bantaybot-completed-tours');
    return saved ? JSON.parse(saved) : {};
  });

  // Check if user has seen any tour (first time user detection)
  const [hasSeenAnyTour, setHasSeenAnyTour] = useState(() => {
    return localStorage.getItem('bantaybot-has-seen-tour') === 'true';
  });

  // Current active tour state
  const [activeTour, setActiveTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Check if this is first time user
  const isFirstTimeUser = !hasSeenAnyTour;

  // Save completed tours to localStorage
  useEffect(() => {
    localStorage.setItem('bantaybot-completed-tours', JSON.stringify(completedTours));
  }, [completedTours]);

  // Start a tour for a specific page
  const startTour = useCallback((pageName, steps) => {
    if (!steps || steps.length === 0) return;

    setActiveTour({ pageName, steps });
    setCurrentStep(0);
    setIsPlaying(true);

    // Scroll to top when starting tour
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    if (activeTour && currentStep < activeTour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour complete
      completeTour();
    }
  }, [activeTour, currentStep]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Go to a specific step
  const goToStep = useCallback((stepIndex) => {
    if (activeTour && stepIndex >= 0 && stepIndex < activeTour.steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [activeTour]);

  // Complete current tour
  const completeTour = useCallback(() => {
    if (activeTour) {
      setCompletedTours(prev => ({
        ...prev,
        [activeTour.pageName]: true
      }));

      // Mark that user has seen at least one tour
      if (!hasSeenAnyTour) {
        setHasSeenAnyTour(true);
        localStorage.setItem('bantaybot-has-seen-tour', 'true');
      }
    }
    setActiveTour(null);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [activeTour, hasSeenAnyTour]);

  // Skip/close tour without completing
  const skipTour = useCallback(() => {
    // Still mark as seen even if skipped
    if (!hasSeenAnyTour) {
      setHasSeenAnyTour(true);
      localStorage.setItem('bantaybot-has-seen-tour', 'true');
    }
    setActiveTour(null);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [hasSeenAnyTour]);

  // Check if a specific tour has been completed
  const isTourCompleted = useCallback((pageName) => {
    return completedTours[pageName] === true;
  }, [completedTours]);

  // Reset all tours (for testing or settings)
  const resetAllTours = useCallback(() => {
    setCompletedTours({});
    setHasSeenAnyTour(false);
    localStorage.removeItem('bantaybot-completed-tours');
    localStorage.removeItem('bantaybot-has-seen-tour');
  }, []);

  const value = {
    // State
    activeTour,
    currentStep,
    isPlaying,
    isFirstTimeUser,
    hasSeenAnyTour,
    completedTours,

    // Actions
    startTour,
    nextStep,
    prevStep,
    goToStep,
    completeTour,
    skipTour,
    isTourCompleted,
    resetAllTours,

    // Computed
    currentStepData: activeTour?.steps[currentStep] || null,
    totalSteps: activeTour?.steps.length || 0,
    isLastStep: activeTour ? currentStep === activeTour.steps.length - 1 : false,
    isFirstStep: currentStep === 0,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};

export default TourContext;
