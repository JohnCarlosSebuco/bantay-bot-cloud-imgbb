import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/FirebaseService';
import CommandService from '../services/CommandService';
import { appToHardwareVolume, hardwareToAppVolume } from '../utils/volumeUtils';
import { CONFIG } from '../config/config';

// Volume Context with defaults
const VolumeContext = createContext({
  volume: 70,
  setVolume: () => {},
  isMuted: false,
  setIsMuted: () => {},
});

// Volume Provider Component
export const VolumeProvider = ({ children }) => {
  const [volume, setVolumeState] = useState(70); // 0-100 range
  const [isMuted, setIsMuted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const debounceRef = useRef(null);
  const lastSentVolumeRef = useRef(null);

  // Sync volume from device sensor_data on load
  useEffect(() => {
    const sensorDocRef = doc(db, 'sensor_data', CONFIG.DEVICE_ID);

    const unsubscribe = onSnapshot(
      sensorDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.volume !== undefined && data.volume !== null) {
            const appVolume = hardwareToAppVolume(data.volume);
            // Only sync if we didn't just send this value (prevents feedback loops)
            if (lastSentVolumeRef.current !== appVolume) {
              setIsSyncing(true);
              setVolumeState(appVolume);
              // Reset syncing flag after a short delay
              setTimeout(() => setIsSyncing(false), 100);
            }
          }
        }
      },
      (error) => {
        console.error('[VolumeContext] Sync error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Debounced send to device
  const setVolume = useCallback((newVolume) => {
    // Clamp value to valid range
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce sending to device (300ms) to prevent Firebase flooding
    debounceRef.current = setTimeout(async () => {
      if (!isSyncing) {
        try {
          lastSentVolumeRef.current = clampedVolume;
          const hardwareVolume = appToHardwareVolume(clampedVolume);
          console.log(`[VolumeContext] Sending volume: ${clampedVolume}% -> ${hardwareVolume} (hardware)`);
          await CommandService.sendCommand(CONFIG.DEVICE_ID, 'set_volume', { volume: hardwareVolume });
        } catch (error) {
          console.error('[VolumeContext] Failed to send volume:', error);
        }
      }
    }, 300);
  }, [isSyncing]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const value = {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
  };

  return (
    <VolumeContext.Provider value={value}>
      {children}
    </VolumeContext.Provider>
  );
};

// Custom hook to use volume
export const useVolume = () => {
  const context = useContext(VolumeContext);
  if (!context) {
    throw new Error('useVolume must be used within a VolumeProvider');
  }
  return context;
};

export default VolumeContext;
