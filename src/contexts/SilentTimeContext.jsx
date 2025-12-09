import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import CommandService from '../services/CommandService';
import ConfigService from '../services/ConfigService';
import { CONFIG } from '../config/config';

// Helper function to check if current time is within silent time range
const isInSilentTime = (startTime, endTime) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight range (e.g., 19:00 to 05:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

// Silent Time Context with defaults
const SilentTimeContext = createContext({
  isSilentTimeActive: false,
  settings: {
    enabled: false,
    startTime: '19:00',
    endTime: '05:00'
  },
  updateSettings: () => {},
});

// localStorage key for tracking last command
const STORAGE_KEY = 'bantaybot-silenttime-lastcommand';

// Silent Time Provider Component
export const SilentTimeProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    startTime: '19:00',
    endTime: '05:00'
  });
  const [isSilentTimeActive, setIsSilentTimeActive] = useState(false);
  const lastCommandRef = useRef(null);
  const intervalRef = useRef(null);

  // Load settings from ConfigService on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        await ConfigService.initialize();
        const config = ConfigService.get();
        setSettings({
          enabled: config.silentTimeEnabled || false,
          startTime: config.silentTimeStart || '19:00',
          endTime: config.silentTimeEnd || '05:00'
        });

        // Load last command from localStorage
        const storedLastCommand = localStorage.getItem(STORAGE_KEY);
        if (storedLastCommand) {
          lastCommandRef.current = storedLastCommand;
        }
      } catch (error) {
        console.error('[SilentTimeContext] Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Core function to check time and send appropriate command
  const checkAndSync = useCallback(async () => {
    const { enabled, startTime, endTime } = settings;

    // If feature is disabled, ensure detection is ON
    if (!enabled) {
      setIsSilentTimeActive(false);
      // Only send enable command if we previously sent disable
      if (lastCommandRef.current === 'disable') {
        try {
          console.log('[SilentTimeContext] Feature disabled, enabling detection');
          await CommandService.enableDetection(CONFIG.DEVICE_ID);
          lastCommandRef.current = 'enable';
          localStorage.setItem(STORAGE_KEY, 'enable');
        } catch (error) {
          console.error('[SilentTimeContext] Failed to enable detection:', error);
        }
      }
      return;
    }

    // Check if we're in silent time
    const inSilentTime = isInSilentTime(startTime, endTime);
    setIsSilentTimeActive(inSilentTime);

    // Determine what command we need
    const neededCommand = inSilentTime ? 'disable' : 'enable';

    // Only send command if state has changed
    if (lastCommandRef.current !== neededCommand) {
      try {
        if (inSilentTime) {
          console.log('[SilentTimeContext] Entering silent time, disabling detection');
          await CommandService.disableDetection(CONFIG.DEVICE_ID);
        } else {
          console.log('[SilentTimeContext] Exiting silent time, enabling detection');
          await CommandService.enableDetection(CONFIG.DEVICE_ID);
        }
        lastCommandRef.current = neededCommand;
        localStorage.setItem(STORAGE_KEY, neededCommand);
        console.log(`[SilentTimeContext] Command sent: ${neededCommand}`);
      } catch (error) {
        console.error(`[SilentTimeContext] Failed to ${neededCommand} detection:`, error);
      }
    }
  }, [settings]);

  // Run check on mount and whenever settings change
  useEffect(() => {
    // Run immediately
    checkAndSync();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up interval to check every 60 seconds
    intervalRef.current = setInterval(checkAndSync, 60000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAndSync]);

  // Update settings and save to ConfigService
  const updateSettings = useCallback(async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      await ConfigService.update({
        silentTimeEnabled: updatedSettings.enabled,
        silentTimeStart: updatedSettings.startTime,
        silentTimeEnd: updatedSettings.endTime
      });
      console.log('[SilentTimeContext] Settings saved:', updatedSettings);
    } catch (error) {
      console.error('[SilentTimeContext] Failed to save settings:', error);
    }
  }, [settings]);

  const value = {
    isSilentTimeActive,
    settings,
    updateSettings,
  };

  return (
    <SilentTimeContext.Provider value={value}>
      {children}
    </SilentTimeContext.Provider>
  );
};

// Custom hook to use silent time
export const useSilentTime = () => {
  const context = useContext(SilentTimeContext);
  if (!context) {
    throw new Error('useSilentTime must be used within a SilentTimeProvider');
  }
  return context;
};

export default SilentTimeContext;
