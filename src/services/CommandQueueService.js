/**
 * Command Queue Service for BantayBot PWA
 * Wraps CommandService with offline detection and IndexedDB persistence.
 */

import CommandService from './CommandService';
import indexedDBService from './IndexedDBService';

const QUEUE_STORAGE_KEY = 'offline_command_queue';
const MAX_ATTEMPTS = 3;
const FLUSH_DELAY_MS = 200;

// Actions where only the latest value matters (deduplication)
const DEDUP_ACTIONS = ['set_volume', 'rotate_head'];

class CommandQueueService {
  constructor() {
    this.queue = [];
    this.listeners = new Set();
    this.isFlushing = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const savedQueue = await indexedDBService.getSetting(QUEUE_STORAGE_KEY);
      if (Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        console.log(`[CommandQueue] Loaded ${this.queue.length} queued commands`);
      }
    } catch (error) {
      console.warn('[CommandQueue] Failed to load queue:', error);
    }

    window.addEventListener('online', () => {
      console.log('[CommandQueue] Browser online - flushing queue');
      this.flushQueue();
    });

    this.initialized = true;

    if (navigator.onLine && this.queue.length > 0) {
      this.flushQueue();
    }
  }

  /**
   * Send a command - directly or queue if offline.
   * @returns {{ success: boolean, queued?: boolean }}
   */
  async sendCommand(deviceId, action, params = {}) {
    if (!navigator.onLine) {
      return this.enqueue(deviceId, action, params);
    }

    try {
      const result = await CommandService.sendCommand(deviceId, action, params);
      if (result.success) return { success: true };
      return this.enqueue(deviceId, action, params);
    } catch (error) {
      console.warn('[CommandQueue] Direct send failed, queuing:', error.message);
      return this.enqueue(deviceId, action, params);
    }
  }

  enqueue(deviceId, action, params) {
    if (DEDUP_ACTIONS.includes(action)) {
      this.queue = this.queue.filter(
        cmd => !(cmd.deviceId === deviceId && cmd.action === action)
      );
    }

    this.queue.push({ deviceId, action, params, attempts: 0, queuedAt: Date.now() });
    this.persistQueue();
    this.notifyListeners();
    return { success: false, queued: true };
  }

  async flushQueue() {
    if (this.isFlushing || this.queue.length === 0 || !navigator.onLine) return;

    this.isFlushing = true;
    this.notifyListeners();
    const remaining = [];

    for (const cmd of this.queue) {
      try {
        const result = await CommandService.sendCommand(cmd.deviceId, cmd.action, cmd.params);
        if (!result.success) throw new Error('Send failed');
        console.log(`[CommandQueue] Flushed: ${cmd.action}`);
      } catch (error) {
        cmd.attempts++;
        if (cmd.attempts < MAX_ATTEMPTS) {
          remaining.push(cmd);
        } else {
          console.error(`[CommandQueue] Dropped after ${MAX_ATTEMPTS} attempts: ${cmd.action}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, FLUSH_DELAY_MS));
    }

    this.queue = remaining;
    this.persistQueue();
    this.isFlushing = false;
    this.notifyListeners();
  }

  getQueueCount() { return this.queue.length; }

  onQueueChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async persistQueue() {
    try {
      await indexedDBService.saveSetting(QUEUE_STORAGE_KEY, this.queue);
    } catch (error) {
      console.warn('[CommandQueue] Persist failed:', error);
    }
  }

  notifyListeners() {
    const data = { count: this.queue.length, isFlushing: this.isFlushing };
    this.listeners.forEach(cb => cb(data));
  }
}

export default new CommandQueueService();
