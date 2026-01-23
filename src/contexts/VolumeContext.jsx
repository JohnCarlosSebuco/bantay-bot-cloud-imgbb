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
  commitVolume: () => {},
  isMuted: false,
  setIsMuted: () => {},
});

// Volume Provider Component
export const VolumeProvider = ({ children }) => {
  const [volume, setVolumeState] = useState(70); // 0-100 range
  const [isMuted, setIsMuted] = useState(false);
  const lastSentVolumeRef = useRef(null);
  const volumeRef = useRef(volume);

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
              setVolumeState(appVolume);
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

  // Keep ref in sync with state (avoids stale closures)
  volumeRef.current = volume;

  // Update local UI state only (no Firebase write)
  const setVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  // Send current volume to Firebase immediately (called on slider release)
  const commitVolume = useCallback(async () => {
    try {
      const currentVolume = volumeRef.current;
      lastSentVolumeRef.current = currentVolume;
      const hardwareVolume = appToHardwareVolume(currentVolume);
      console.log(`[VolumeContext] Committing volume: ${currentVolume}% -> ${hardwareVolume} (hardware)`);
      await CommandService.sendCommand(CONFIG.DEVICE_ID, 'set_volume', { volume: hardwareVolume });
      return { success: true };
    } catch (error) {
      console.error('[VolumeContext] Failed to commit volume:', error);
      return { success: false };
    }
  }, []);

  const value = {
    volume,
    setVolume,
    commitVolume,
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
