// Volume conversion utilities for BantayBot
// App uses 0-100 range, hardware (DFPlayer) uses 0-30 range

export const VOLUME_RANGES = {
  APP_MIN: 0,
  APP_MAX: 100,
  HARDWARE_MIN: 0,
  HARDWARE_MAX: 30,
};

/**
 * Convert app volume (0-100) to hardware volume (0-30)
 * @param {number} appVolume - Volume in 0-100 range
 * @returns {number} - Volume in 0-30 range
 */
export function appToHardwareVolume(appVolume) {
  const clamped = Math.max(VOLUME_RANGES.APP_MIN, Math.min(VOLUME_RANGES.APP_MAX, appVolume));
  return Math.round((clamped / VOLUME_RANGES.APP_MAX) * VOLUME_RANGES.HARDWARE_MAX);
}

/**
 * Convert hardware volume (0-30) to app volume (0-100)
 * @param {number} hardwareVolume - Volume in 0-30 range
 * @returns {number} - Volume in 0-100 range
 */
export function hardwareToAppVolume(hardwareVolume) {
  const clamped = Math.max(VOLUME_RANGES.HARDWARE_MIN, Math.min(VOLUME_RANGES.HARDWARE_MAX, hardwareVolume));
  return Math.round((clamped / VOLUME_RANGES.HARDWARE_MAX) * VOLUME_RANGES.APP_MAX);
}
