import { lobbyService } from '../services/lobby.service.js';
import { presenceService } from '../services/presence.service.js';
import { toErrorResponse } from '../utils/errors.js';
import { validatePayloadSize } from '../utils/validate.js';
import { now } from '../utils/time.js';
import { createGameSession } from '../services/game.service.js';

// Rate limiting per socket
const rateLimiter = new Map();
const RATE_LIMIT = { maxOps: 10, windowMs: 10000 }; // 10 ops per 10 seconds

/**
 * @param {string} socketId - Socket ID
 * @returns {boolean} True if within limits
 */
function checkRateLimit(socketId) {
  const currentTime = now();
  const socketData = rateLimiter.get(socketId) || { count: 0, resetTime: currentTime + RATE_LIMIT.windowMs };
  
  if (currentTime > socketData.resetTime) {
    socketData.count = 0;
    socketData.resetTime = currentTime + RATE_LIMIT.windowMs;
  }
  socketData.count++;
  rateLimiter.set(socketId, socketData);
  
  return socketData.count <= RATE_LIMIT.maxOps;
}

/**
 * @param {*} io - Socket.IO server
 * @param {string} code - Lobby code
 */
function emitLobbyState(io, code) {
  const lobbyPublic = lobbyService.getPublicView(code);
  if (lobbyPublic) {
    io.to(code).emit('lobby:state', {
      lobbyPublic,
      serverNow: now()
    });
  }
}

/**
 * @param {*} socket - Socket instance
 * @param {string} eventName - Event name for logging
 * @param {Function} handler - Event handler function
 */
function handleEvent(socket, eventName, handler) {
  return async (...args) => {
    try {
      // Rate limiting
      if (!checkRateLimit(socket.id)) {
        socket.emit('lobby:error', {
          reason: 'RATE_LIMITED',
          details: 'Too many requests, please slow down'
        });
        return;
      }

      // Payload size validation
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          validatePayloadSize(arg);
        }
      }

      await handler(...args);
    } catch (error) {
      console.error(`Error in ${eventName}:`, error);
      const errorResponse = toErrorResponse(error);
      socket.emit('lobby:error', {
        reason: errorResponse.code,
        details: errorResponse.message
      });
    }
  };
}

export function registerLobbySocket(io) {
  presenceService.start(
    (serverNow) => {
      for (const code of lobbyService.getActiveCodes()) {
        io.to(code).emit('lobby:heartbeat', { serverNow });
      }
    },
    (socketId) => {
      handlePlayerDisconnection(io, socketId);
    }
  );

  io.on('connection', (socket) => {
    

    /**
     * lobby:create - Creates a new lobby
     * Payload: { playerId, name, settings? }
     * Response: ACK with { code } or error
     */
    socket.on('lobby:create', handleEvent(socket, 'lobby:create', (data, ack) => {
      const { playerId, name, settings } = data || {};
      
      const code = lobbyService.createLobby({
        hostSocketId: socket.id,
        playerId,
        name,
        settings
      });

      socket.join(code);
      emitLobbyState(io, code);
      
      if (ack) ack({ code });
    }));

    /**
     * lobby:join - Joins an existing lobby
     * Payload: { code, playerId, name }
     * Response: Joins room and emits state
     */
    socket.on('lobby:join', handleEvent(socket, 'lobby:join', (data, ack) => {
      const { code, playerId, name } = data || {};
      
      const player = lobbyService.joinLobby({
        code,
        socketId: socket.id,
        playerId,
        name,
      });

      socket.join(code);
      
      // Emit player joined event
      const playerPublic = {
        playerId: player.playerId,
        name: player.name,
        connected: player.connected,
      };
      
      socket.to(code).emit('lobby:playerJoined', { playerPublic });
      emitLobbyState(io, code);
      
      if (ack) ack({ success: true });
    }));

    /**
     * lobby:leave - Leaves current lobby
     * Payload: { code }
     */
    socket.on('lobby:leave', handleEvent(socket, 'lobby:leave', (data) => {
      const { code } = data || {};
      
      const removed = lobbyService.leaveLobby({
        code,
        socketId: socket.id
      });

      if (removed) {
        const lobby = lobbyService.getLobby(code);
        if (lobby) {
          const player = lobby.players.get(socket.id);
          if (player) {
            const playerPublic = {
              playerId: player.playerId,
              name: player.name,
              connected: player.connected,
            };
            
            socket.to(code).emit('lobby:playerLeft', { playerPublic });
          }
        }
        
        socket.leave(code);
        emitLobbyState(io, code);
      }
    }));


    /**
     * lobby:updateSettings - Updates lobby settings (host only)
     * Payload: { code, partialSettings }
     */
    socket.on('lobby:updateSettings', handleEvent(socket, 'lobby:updateSettings', (data) => {
      const { code, partialSettings } = data || {};
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.updateSettings({
        code,
        byPlayerId: host?.playerId,
        partialSettings
      });

      io.to(code).emit('lobby:settingsUpdated', {
        settings: lobby.settings
      });
      
      emitLobbyState(io, code);
    }));

    /**
     * lobby:startGame - Starts the game (host only)
     * Payload: { code }
     */
    socket.on('lobby:startGame', handleEvent(socket, 'lobby:startGame', (data) => {
      const { code } = data || {};
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.startGame({
        code,
        byPlayerId: host?.playerId
      });

      // Create game session 
      const players = Array.from(lobby.players.values())
        .filter(p => p.connected)
        .map(p => ({ id: p.socketId, name: p.name }));
      
      createGameSession(code, lobby.settings || {}, players);

      io.to(code).emit('lobby:started', {
        settings: lobby.settings,
        serverNow: now()
      });
      
      emitLobbyState(io, code);
    }));

    /**
     * lobby:end - Ends the lobby (host only)
     * Payload: { code }
     */
    socket.on('lobby:end', handleEvent(socket, 'lobby:end', (data) => {
      const { code } = data || {};
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.endLobby({
        code,
        byPlayerId: host?.playerId,
        reason: 'Host ended the lobby'
      });

      io.to(code).emit('lobby:ended', {
        reason: 'Host ended the lobby'
      });
      
      // Remove all sockets from the room
      const room = io.sockets.adapter.rooms.get(code);
      if (room) {
        for (const socketId of room) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(code);
          }
        }
      }
    }));

    socket.on('disconnect', () => {
      handlePlayerDisconnection(io, socket.id);
      
      // Clean up rate limiter
      rateLimiter.delete(socket.id);
    });
  });
}

/**
 * @param {*} io - Socket.IO server
 * @param {string} socketId - Disconnected socket ID
 */
function handlePlayerDisconnection(io, socketId) {
  // Find which lobby this player was in
  for (const code of lobbyService.getActiveCodes()) {
    const lobby = lobbyService.getLobby(code);
    if (lobby && lobby.players.has(socketId)) {
      const removed = lobbyService.leaveLobby({
        code,
        socketId
      });
      
      if (removed) {
        const player = lobby.players.get(socketId);
        if (player) {
          const playerPublic = {
            playerId: player.playerId,
            name: player.name,
            connected: player.connected,
          };
          
          io.to(code).emit('lobby:playerLeft', { playerPublic });
        }
        
        emitLobbyState(io, code);
      }
      
      break; // Player can only be in one lobby
    }
  }
}