import { db } from './FirebaseService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_COLLECTIONS, COMMAND_TYPES } from '../config/hardware.config';

class CommandService {
  /**
   * Send command to device
   */
  async sendCommand(deviceId, action, params = {}) {
    try {
      const commandsRef = collection(
        db,
        FIREBASE_COLLECTIONS.COMMANDS,
        deviceId,
        'pending'
      );

      const command = {
        action,
        params,
        status: 'pending',
        created_at: serverTimestamp()
      };

      await addDoc(commandsRef, command);
      return { success: true };
    } catch (error) {
      console.error('Error sending command:', error);
      return { success: false, error: error.message };
    }
  }

  // Audio commands
  async playAudio(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.PLAY_AUDIO);
  }

  async stopAudio(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.STOP_AUDIO);
  }

  async nextTrack(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.NEXT_TRACK);
  }

  async prevTrack(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.PREV_TRACK);
  }

  async setVolume(deviceId, volume) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_VOLUME, { volume });
  }

  async setTrack(deviceId, track) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_TRACK, { track });
  }

  // Motor commands
  async rotateHead(deviceId, angle) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_HEAD, { angle });
  }

  async rotateLeft(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_LEFT);
  }

  async rotateRight(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_RIGHT);
  }

  async rotateCenter(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_CENTER);
  }

  // Servo commands
  async moveServo(deviceId, left, right) {
    return this.sendCommand(deviceId, COMMAND_TYPES.MOVE_SERVO, { left, right });
  }

  async oscillateArms(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.OSCILLATE_ARMS);
  }

  async stopOscillate(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.STOP_OSCILLATE);
  }

  async armsRest(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_REST);
  }

  async armsAlert(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_ALERT);
  }

  async armsWave(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_WAVE);
  }

  // Camera commands
  async setBrightness(deviceId, brightness) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_BRIGHTNESS, { brightness });
  }

  async setContrast(deviceId, contrast) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_CONTRAST, { contrast });
  }

  async setResolution(deviceId, resolution) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_RESOLUTION, { resolution });
  }

  async toggleGrayscale(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.TOGGLE_GRAYSCALE);
  }

  // Detection commands
  async enableDetection(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ENABLE_DETECTION);
  }

  async disableDetection(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.DISABLE_DETECTION);
  }

  async setSensitivity(deviceId, sensitivity) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_SENSITIVITY, { sensitivity });
  }

  // System commands
  async restart(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.RESTART);
  }

  async triggerAlarm(deviceId) {
    return this.sendCommand(deviceId, COMMAND_TYPES.TRIGGER_ALARM);
  }

  // Bot Control Commands from React Native
  async moveArms(deviceId) {
    return this.sendCommand(deviceId, 'MOVE_ARMS');
  }

  async rotateHeadCommand(deviceId) {
    return this.sendCommand(deviceId, 'ROTATE_HEAD');
  }

  async stopMovement(deviceId) {
    return this.sendCommand(deviceId, 'STOP_MOVEMENT');
  }

  async soundAlarm(deviceId) {
    return this.sendCommand(deviceId, 'SOUND_ALARM');
  }

  async testBuzzer(deviceId) {
    return this.sendCommand(deviceId, 'TEST_BUZZER');
  }

  async resetSystem(deviceId) {
    return this.sendCommand(deviceId, 'RESET_SYSTEM');
  }

  async calibrateSensors(deviceId) {
    return this.sendCommand(deviceId, 'CALIBRATE_SENSORS');
  }

  // Motor control
  async startMotor(deviceId, motorType) {
    return this.sendCommand(deviceId, 'START_MOTOR', { motor: motorType });
  }

  async stopMotor(deviceId, motorType) {
    return this.sendCommand(deviceId, 'STOP_MOTOR', { motor: motorType });
  }

  async stopAllMotors(deviceId) {
    return this.sendCommand(deviceId, 'STOP_ALL_MOTORS');
  }
}

export default new CommandService();
