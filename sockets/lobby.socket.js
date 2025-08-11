import { lobbyService } from '../services/lobby.service.js';
import { presenceService } from '../services/presence.service.js';
import { toErrorResponse } from '../utils/errors.js';
import { validatePayloadSize } from '../utils/validate.js';
import { now } from '../utils/time.js';
import { createGameSession } from '../services/game.service.js';
import { LOBBY_EVENTS } from '../constants/socket-events.js';
import { NAMESPACES } from '../constants/socket-namespaces.js';

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
function emitLobbyState(ioOrNamespace, code) {
  const lobbyPublic = lobbyService.getPublicView(code);
  if (lobbyPublic) {
    ioOrNamespace.to(code).emit(LOBBY_EVENTS.STATE, {
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
        socket.emit(LOBBY_EVENTS.ERROR, {
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
      socket.emit(LOBBY_EVENTS.ERROR, {
        reason: errorResponse.code,
        details: errorResponse.message
      });
    }
  };
}

export function registerLobbySocket(io) {
  // Create lobby namespace for better isolation
  const lobbyNamespace = io.of(NAMESPACES.LOBBY);
  
  // For backward compatibility, also register on default namespace
  registerLobbyHandlers(io);
  registerLobbyHandlers(lobbyNamespace, true);
}

function registerLobbyHandlers(ioOrNamespace, isNamespace = false) {
  if (!isNamespace) {
    // Only start presence service once for the default namespace
    presenceService.start(
      (serverNow) => {
        for (const code of lobbyService.getActiveCodes()) {
          ioOrNamespace.to(code).emit(LOBBY_EVENTS.HEARTBEAT, { serverNow });
          // Also emit to namespace if it exists
          if (ioOrNamespace.of) {
            ioOrNamespace.of(NAMESPACES.LOBBY).to(code).emit(LOBBY_EVENTS.HEARTBEAT, { serverNow });
          }
        }
      },
      (socketId) => {
        handlePlayerDisconnection(ioOrNamespace, socketId);
      }
    );
  }

  ioOrNamespace.on('connection', (socket) => {
    

    /**
     * lobby:create - Creates a new lobby
     * Payload: { playerId, name, settings? }
     * Response: ACK with { code } or error
     */
    socket.on(LOBBY_EVENTS.CREATE, handleEvent(socket, LOBBY_EVENTS.CREATE, (data, ack) => {
      const { playerId, name, settings } = data || {};
      
      const code = lobbyService.createLobby({
        hostSocketId: socket.id,
        playerId,
        name,
        settings
      });

      socket.join(code);
      emitLobbyState(ioOrNamespace, code);
      
      if (ack) ack({ code });
    }));

    /**
     * lobby:join - Joins an existing lobby
     * Payload: { code, playerId, name }
     * Response: Joins room and emits state
     */
    socket.on(LOBBY_EVENTS.JOIN, handleEvent(socket, LOBBY_EVENTS.JOIN, (data, ack) => {
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
      
      socket.to(code).emit(LOBBY_EVENTS.PLAYER_JOINED, { playerPublic });
      emitLobbyState(ioOrNamespace, code);
      
      if (ack) ack({ success: true, player: playerPublic });
    }));

    /**
     * lobby:leave - Leaves current lobby
     * Payload: { code }
     */
    socket.on(LOBBY_EVENTS.LEAVE, handleEvent(socket, LOBBY_EVENTS.LEAVE, (data) => {
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
            
            socket.to(code).emit(LOBBY_EVENTS.PLAYER_LEFT, { playerPublic });
          }
        }
        
        socket.leave(code);
        emitLobbyState(ioOrNamespace, code);
      }
    }));


    /**
     * lobby:updateSettings - Updates lobby settings (host only)
     * Payload: { code, partialSettings }
     */
    socket.on(LOBBY_EVENTS.UPDATE_SETTINGS, handleEvent(socket, LOBBY_EVENTS.UPDATE_SETTINGS, (data) => {
      const { code, partialSettings } = data || {};
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.updateSettings({
        code,
        byPlayerId: host?.playerId,
        partialSettings
      });

      ioOrNamespace.to(code).emit(LOBBY_EVENTS.SETTINGS_UPDATED, {
        settings: lobby.settings
      });
      
      emitLobbyState(ioOrNamespace, code);
    }));

    /**
     * lobby:startGame - Starts the game (host only)
     * Payload: { code }
     */
    socket.on(LOBBY_EVENTS.START_GAME, handleEvent(socket, LOBBY_EVENTS.START_GAME, (data, ack) => {
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

      ioOrNamespace.to(code).emit(LOBBY_EVENTS.STARTED, {
        settings: lobby.settings,
        serverNow: now()
      });
      
      emitLobbyState(ioOrNamespace, code);
      
      if (ack) ack({ success: true, gameStarted: true });
    }));

    /**
     * lobby:end - Ends the lobby (host only)
     * Payload: { code }
     */
    socket.on(LOBBY_EVENTS.END, handleEvent(socket, LOBBY_EVENTS.END, (data) => {
      const { code } = data || {};
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.endLobby({
        code,
        byPlayerId: host?.playerId,
        reason: 'Host ended the lobby'
      });

      ioOrNamespace.to(code).emit(LOBBY_EVENTS.ENDED, {
        reason: 'Host ended the lobby'
      });
      
      // Remove all sockets from the room
      const adapter = ioOrNamespace.adapter || ioOrNamespace.sockets.adapter;
      const room = adapter.rooms.get(code);
      if (room) {
        for (const socketId of room) {
          const socketInRoom = ioOrNamespace.sockets ? ioOrNamespace.sockets.get(socketId) : ioOrNamespace.connected[socketId];
          if (socketInRoom) {
            socketInRoom.leave(code);
          }
        }
      }
    }));

    socket.on('disconnect', () => {
      handlePlayerDisconnection(ioOrNamespace, socket.id);
      
      // Clean up rate limiter
      rateLimiter.delete(socket.id);
    });
  });
}

/**
 * @param {*} io - Socket.IO server
 * @param {string} socketId - Disconnected socket ID
 */
function handlePlayerDisconnection(ioOrNamespace, socketId) {
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
          
          ioOrNamespace.to(code).emit(LOBBY_EVENTS.PLAYER_LEFT, { playerPublic });
        }
        
        emitLobbyState(ioOrNamespace, code);
      }
      
      break; // Player can only be in one lobby
    }
  }
}