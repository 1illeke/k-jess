// Lobby service stuff 

import { generate5DigitCode } from '../utils/code.js';
import { createError, ERROR_CODES } from '../utils/errors.js';
import { validateCode, validateName, validatePlayerId, validateSettings } from '../utils/validate.js';
import { now, isOlderThan } from '../utils/time.js';
import { DEFAULT_SETTINGS, PHASES, TIMING } from '../models/lobby.model.js';

class LobbyService {
  constructor() {
    /** @type {Map<string, import('../models/lobby.model.js').Lobby>} */
    this.lobbies = new Map();
    this.cleanupInterval = null;
  }

  start() {
    // Schedule cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLobbies();
    }, 60000);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Creates a new lobby
   * @param {Object} params - Creation parameters
   * @param {string} params.hostSocketId - Socket ID of the host
   * @param {string} params.playerId - Host's player ID
   * @param {string} params.name - Host's display name
   * @param {Object} [params.settings] - Lobby settings
   * @returns {string} Generated lobby code
   * @throws {AppError} If creation fails
   */
  createLobby({ hostSocketId, playerId, name, settings }) {
    validatePlayerId(playerId);
    validateName(name);
    
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    validateSettings(mergedSettings);

    const existingCodes = new Set(this.lobbies.keys());
    const code = generate5DigitCode(existingCodes); // code gen
    
    const currentTime = now();
    
    /** @type {import('../models/lobby.model.js').Lobby} */
    const lobby = {
      code,
      hostId: hostSocketId,
      createdAt: currentTime,
      phase: PHASES.LOBBY,
      settings: mergedSettings,
      players: new Map()
    };

    // Add host
    lobby.players.set(hostSocketId, {
      socketId: hostSocketId,
      playerId,
      name,
      joinedAt: currentTime,
      connected: true
    });

    this.lobbies.set(code, lobby);
    return code;
  }

  /**
   * @param {string} code - Lobby code
   * @returns {import('../models/lobby.model.js').Lobby|null} Lobby or null if not found
   */
  getLobby(code) {
    return this.lobbies.get(code) || null;
  }

  /**
   * @param {Object} params - Join parameters
   * @param {string} params.code - Lobby code
   * @param {string} params.socketId - Player's socket ID
   * @param {string} params.playerId - Player's stable ID
   * @param {string} params.name - Player's display name
   * @returns {import('../models/lobby.model.js').Player} The joined player
   * @throws {AppError} If join fails
   */
  joinLobby({ code, socketId, playerId, name }) {
    validateCode(code);
    validatePlayerId(playerId);
    validateName(name);

    const lobby = this.getLobby(code);
    if (!lobby) {
      throw createError(ERROR_CODES.NOT_FOUND, 'Lobby not found');
    }

    // rejoining
    let existingPlayer = null;
    for (const player of lobby.players.values()) {
      if (player.playerId === playerId) {
        existingPlayer = player;
        break;
      }
    }

    // only allow existing players to rejoin
    if (lobby.phase !== PHASES.LOBBY && !existingPlayer) {
      throw createError(ERROR_CODES.ALREADY_STARTED, 'Lobby has already started');
    }

    if (existingPlayer) {
      // Rejoin - update socket ID and mark as connected
      if (existingPlayer.socketId !== socketId) {
        lobby.players.delete(existingPlayer.socketId);
      }
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      existingPlayer.name = name;
      lobby.players.set(socketId, existingPlayer);
      return existingPlayer;
    }

    // check capacity
    const connectedCount = Array.from(lobby.players.values())
      .filter(p => p.connected).length;
    
    if (connectedCount >= lobby.settings.maxPlayers) {
      throw createError(ERROR_CODES.ROOM_FULL, 'Lobby is full');
    }

    // new player
    const player = {
      socketId,
      playerId,
      name,
      joinedAt: now(),
      connected: true
    };

    lobby.players.set(socketId, player);
    return player;
  }

  /**
   * @param {Object} params - Leave parameters
   * @param {string} params.code - Lobby code
   * @param {string} params.socketId - Player's socket ID
   * @returns {boolean} True if player was removed
   */
  leaveLobby({ code, socketId }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      return false;
    }

    const player = lobby.players.get(socketId);
    if (!player) {
      return false;
    }

    // grace period
    player.connected = false;
    player.disconnectedAt = now();

    // If host left, transfer host
    if (lobby.hostId === socketId) {
      this.transferHostIfNeeded(code);
    }

    return true;
  }

  /**
   * @param {string} code - Lobby code
   * @returns {boolean} True if host was transferred
   */
  transferHostIfNeeded(code) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      return false;
    }

    const currentHost = lobby.players.get(lobby.hostId);
    if (currentHost && currentHost.connected) {
      return false; // Host is still connected
    }

    let newHost = null;
    let oldestTime = Infinity;

    for (const player of lobby.players.values()) {
      if (player.connected && player.joinedAt < oldestTime) {
        newHost = player;
        oldestTime = player.joinedAt;
      }
    }

    if (newHost) {
      lobby.hostId = newHost.socketId;
      return true;
    }

    return false;
  }

  /**
   * lobby settings (host only)
   * @param {Object} params - Update parameters
   * @param {string} params.code - Lobby code
   * @param {string} params.byPlayerId - Player ID requesting update
   * @param {Object} params.partialSettings - Settings to update
   * @throws {AppError} If update fails
   */
  updateSettings({ code, byPlayerId, partialSettings }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw createError(ERROR_CODES.NOT_FOUND, 'Lobby not found');
    }

    const host = lobby.players.get(lobby.hostId);
    if (!host || host.playerId !== byPlayerId) {
      throw createError(ERROR_CODES.NOT_HOST, 'Only the host can update settings');
    }

    if (lobby.phase !== PHASES.LOBBY) {
      throw createError(ERROR_CODES.PHASE_CONFLICT, 'Cannot update settings after game starts');
    }

    validateSettings(partialSettings);
    
    // Merge settings
    Object.assign(lobby.settings, partialSettings);
  }

  /**
   * Start ganme (host only)
   * @param {Object} params - Start parameters
   * @param {string} params.code - Lobby code
   * @param {string} params.byPlayerId - Player ID requesting start
   * @throws {AppError} If start fails
   */
  startGame({ code, byPlayerId }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw createError(ERROR_CODES.NOT_FOUND, 'Lobby not found');
    }

    const host = lobby.players.get(lobby.hostId);
    if (!host || host.playerId !== byPlayerId) {
      throw createError(ERROR_CODES.NOT_HOST, 'Only the host can start the game');
    }

    if (lobby.phase !== PHASES.LOBBY) {
      throw createError(ERROR_CODES.ALREADY_STARTED, 'Game already started');
    }

    const connectedCount = Array.from(lobby.players.values())
      .filter(p => p.connected).length;
    
    if (connectedCount < 2) {
      throw createError(ERROR_CODES.INVALID_INPUT, 'Need at least 2 players to start');
    }

    lobby.phase = PHASES.IN_GAME;
    lobby.startedAt = now();
  }

  /**
   * @param {Object} params - End parameters
   * @param {string} params.code - Lobby code
   * @param {string} params.byPlayerId - Player ID requesting end
   * @param {string} [params.reason] - Reason for ending
   * @throws {AppError} If end fails
   */
  endLobby({ code, byPlayerId, reason = 'Host ended the lobby' }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw createError(ERROR_CODES.NOT_FOUND, 'Lobby not found');
    }

    // admin terminate
    if (byPlayerId !== 'ADMIN') {
      const host = lobby.players.get(lobby.hostId);
      if (!host || host.playerId !== byPlayerId) {
        throw createError(ERROR_CODES.NOT_HOST, 'Only the host can end the lobby');
      }
    }

    lobby.phase = PHASES.ENDED;
    lobby.endedAt = now();
    lobby.endReason = reason;
  }

  /**
   * Gets public view of a lobby
   * @param {string} code - Lobby code
   * @returns {import('../models/lobby.model.js').LobbyPublic|null} Public lobby data
   */
  getPublicView(code) {
    const lobby = this.getLobby(code);
    if (!lobby || lobby.phase === PHASES.ENDED) {
      return null;
    }

    const host = lobby.players.get(lobby.hostId);
    const players = Array.from(lobby.players.values()).map(player => ({
      playerId: player.playerId,
      name: player.name,
      connected: player.connected,
    }));

    return {
      code: lobby.code,
      phase: lobby.phase,
      settings: { ...lobby.settings },
      hostPlayerId: host ? host.playerId : null,
      players
    };
  }

  /**
   * Gets all active lobby codes (for uniqueness checking)
   * @returns {string[]} Array of active lobby codes
   */
  getActiveCodes() {
    return Array.from(this.lobbies.keys())
      .filter(code => {
        const lobby = this.lobbies.get(code);
        return lobby && lobby.phase !== PHASES.ENDED;
      });
  }

  // Clean up
  cleanupOldLobbies() {
    const toDelete = [];
    
    for (const [code, lobby] of this.lobbies.entries()) {
      let shouldDelete = false;

      // 5 minute delete 
      if (lobby.phase === PHASES.ENDED && 
          isOlderThan(lobby.endedAt || lobby.createdAt, TIMING.CLEANUP_DELAY_MS)) {
        shouldDelete = true;
      }

      // empty lobbies
      const hasConnectedPlayers = Array.from(lobby.players.values())
        .some(p => p.connected);
      
      if (!hasConnectedPlayers && 
          isOlderThan(lobby.createdAt, TIMING.CLEANUP_DELAY_MS)) {
        shouldDelete = true;
      }

      // Clean up disconnected players after grace period
      for (const [socketId, player] of lobby.players.entries()) {
        if (!player.connected && player.disconnectedAt &&
            isOlderThan(player.disconnectedAt, TIMING.GRACE_PERIOD_MS)) {
          lobby.players.delete(socketId);
          if (lobby.hostId === socketId) {
            this.transferHostIfNeeded(code);
          }
        }
      }

      if (shouldDelete) {
        toDelete.push(code);
      }
    }

    for (const code of toDelete) {
      this.lobbies.delete(code);
    }

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old lobbies`);
    }
  }

  /**
   * for admin page
   * @returns {Object} Statistics about current lobbies
   */
  getStats() {
    const stats = {
      totalLobbies: this.lobbies.size,
      lobbyPhase: 0,
      inGamePhase: 0,
      endedPhase: 0,
      totalPlayers: 0,
      connectedPlayers: 0
    };

    for (const lobby of this.lobbies.values()) {
      switch (lobby.phase) {
        case PHASES.LOBBY:
          stats.lobbyPhase++;
          break;
        case PHASES.IN_GAME:
          stats.inGamePhase++;
          break;
        case PHASES.ENDED:
          stats.endedPhase++;
          break;
      }

      stats.totalPlayers += lobby.players.size;
      stats.connectedPlayers += Array.from(lobby.players.values())
        .filter(p => p.connected).length;
    }

    return stats;
  }
}

export const lobbyService = new LobbyService();

// Start the service
lobbyService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  lobbyService.stop();
});

process.on('SIGINT', () => {
  lobbyService.stop();
  process.exit(0);
});