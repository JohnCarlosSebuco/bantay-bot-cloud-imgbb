import { db } from './FirebaseService';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { FIREBASE_COLLECTIONS, COMMAND_TYPES } from '../config/hardware.config';

class CommandService {
  /**
   * Send command to device
   */
  async sendCommand(deviceId, action, params = {}) {
    try {
      console.log(`📤 [CommandService] Sending command: ${action} to device: ${deviceId}`);
      console.log(`📍 [CommandService] Firebase path: commands/${deviceId}/pending`);

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

      console.log(`📝 [CommandService] Command payload:`, command);
      const docRef = await addDoc(commandsRef, command);
      console.log(`✅ [CommandService] Command written successfully! Doc ID: ${docRef.id}`);

      this.monitorCommandLifecycle(docRef);

      return { success: true };
    } catch (error) {
      console.error('❌ [CommandService] Error sending command:', error);
      return { success: false, error: error.message };
    }
  }

  monitorCommandLifecycle(docRef) {
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (!snapshot.exists()) {
        // Document was deleted by device after execution - command completed successfully
        console.log(`✅ [CommandService] Command ${docRef.id} executed and cleaned up by device`);
        unsubscribe();
        return;
      }

      const data = snapshot.data();
      // Fallback: if device marks as completed instead of deleting, clean up from PWA
      if (data?.status === 'completed') {
        try {
          await deleteDoc(docRef);
          console.log(`🧹 [CommandService] Deleted completed command ${docRef.id}`);
        } catch (error) {
          // Ignore error if already deleted by device
          if (error.code !== 'not-found') {
            console.warn(`⚠️ [CommandService] Failed to delete command ${docRef.id}:`, error);
          }
        } finally {
          unsubscribe();
        }
      }
    });

    // Safety timeout to avoid lingering listeners
    setTimeout(() => {
      unsubscribe();
    }, 60000);
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
    return this.sendCommand(deviceId, 'oscillate_arms');
  }

  async rotateHeadCommand(deviceId, angle) {
    if (typeof angle === 'number' && !Number.isNaN(angle)) {
      return this.sendCommand(deviceId, 'rotate_head', { angle });
    }
    return this.sendCommand(deviceId, 'rotate_head');
  }

  async stopMovement(deviceId) {
    return this.sendCommand(deviceId, 'stop_movement');
  }

  async soundAlarm(deviceId) {
    return this.sendCommand(deviceId, 'trigger_alarm');
  }

  async testBuzzer(deviceId) {
    return this.sendCommand(deviceId, 'test_buzzer');
  }

  async resetSystem(deviceId) {
    return this.sendCommand(deviceId, 'reset_system');
  }

  async calibrateSensors(deviceId) {
    return this.sendCommand(deviceId, 'calibrate_sensors');
  }

  /**
   * Delete all pending set_volume commands for a device to prevent queue buildup
   */
  async clearPendingVolumeCommands(deviceId) {
    try {
      const commandsRef = collection(db, FIREBASE_COLLECTIONS.COMMANDS, deviceId, 'pending');
      const q = query(commandsRef, where('action', '==', 'set_volume'));
      const snapshot = await getDocs(q);

      const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
      if (deletes.length > 0) {
        await Promise.all(deletes);
        console.log(`[CommandService] Cleared ${deletes.length} stale volume command(s)`);
      }
    } catch (error) {
      console.error('[CommandService] Failed to clear pending volume commands:', error);
    }
  }

}

export default new CommandService();
