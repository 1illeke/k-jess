/**
 * Presence service for tracking player connections and heartbeats
 */

import { now } from '../utils/time.js';
import { TIMING } from '../models/lobby.model.js';

class PresenceService {
  constructor() {
    this.heartbeatInterval = null;
    this.callbacks = {
      onHeartbeat: null,
      onPlayerDisconnected: null
    };
  }

  /**
   * @param {Function} onHeartbeat - Callback for periodic heartbeat
   * @param {Function} onPlayerDisconnected - Callback for detected disconnections
   */
  start(onHeartbeat, onPlayerDisconnected) {
    this.callbacks.onHeartbeat = onHeartbeat;
    this.callbacks.onPlayerDisconnected = onPlayerDisconnected;

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.callbacks.onHeartbeat) {
        this.callbacks.onHeartbeat(now());
      }
    }, TIMING.HEARTBEAT_INTERVAL_MS);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * @param {string} socketId - Socket ID
   * @param {string} playerId - Player ID
   */
  markConnected(socketId, playerId) {
    // This is handled by the lobby service
    // Presence service mainly handles heartbeats and disconnection detection
  }

  /**
   * @param {string} socketId - Socket ID that disconnected
   */
  handleDisconnection(socketId) {
    if (this.callbacks.onPlayerDisconnected) {
      this.callbacks.onPlayerDisconnected(socketId);
    }
  }

  /**
   * @param {number} lastHeartbeat - Last heartbeat timestamp
   * @returns {boolean} True if heartbeat should be sent
   */
  shouldSendHeartbeat(lastHeartbeat) {
    return (now() - lastHeartbeat) >= TIMING.HEARTBEAT_INTERVAL_MS;
  }
}

export const presenceService = new PresenceService();