import { createGameSession, getGameSession, removeGameSession } from '../services/game.service.js';
import { lobbyService } from '../services/lobby.service.js';
import { GAME_EVENTS } from '../constants/socket-events.js';

export function registerGameSocket(io) {
  io.on('connection', (socket) => {
    
    socket.on(GAME_EVENTS.JOIN, ({ code } = {}, ack) => {
      try {
        const lobby = lobbyService.getLobby(code);
        if (!lobby) {
          socket.emit(GAME_EVENTS.ERROR, { message: 'Game not found' });
          return;
        }

        socket.join(code);
        
        // Send game state to the joining player
        const gameData = { 
          code, 
          players: Array.from(lobby.players.values()).map(p => ({
            id: p.playerId,
            name: p.name,
            connected: p.connected,
          }))
        };
        
        socket.emit(GAME_EVENTS.JOINED, gameData);
        if (ack) ack({ success: true, ...gameData });
      } catch (err) {
        console.error('Error joining game:', err);
        const errorMsg = err.message || 'Failed to join game';
        socket.emit(GAME_EVENTS.ERROR, { message: errorMsg });
        if (ack) ack({ success: false, error: errorMsg });
      }
    });
    socket.on(GAME_EVENTS.START, ({ code, settings } = {}, ack) => {
      try {
        const lobby = lobbyService.getLobby(code);
        if (!lobby) {
          socket.emit(GAME_EVENTS.ERROR, { message: 'Lobby not found' });
          return;
        }

        const host = lobby.players.get(socket.id);
        if (!host || lobby.hostId !== socket.id) {
          socket.emit(GAME_EVENTS.ERROR, { message: 'Only the host can start the game' });
          return;
        }

        lobbyService.startGame({
          code,
          byPlayerId: host.playerId
        });

        // Get connected players
        const players = Array.from(lobby.players.values())
          .filter(p => p.connected)
          .map(p => ({ id: p.socketId, name: p.name }));

        const session = createGameSession(code, settings || {}, players);
        const gameData = { code, settings: session.settings, players: session.players };
        io.to(code).emit(GAME_EVENTS.STARTED, gameData);
        if (ack) ack({ success: true, ...gameData });
      } catch (err) {
        console.error('Error starting game:', err);
        const errorMsg = err.message || 'Failed to start game';
        socket.emit(GAME_EVENTS.ERROR, { message: errorMsg });
        if (ack) ack({ success: false, error: errorMsg });
      }
    });

    socket.on(GAME_EVENTS.PAUSE, ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) {
        return; // Ignore if not in an active game
      }
      io.to(code).emit(GAME_EVENTS.PAUSED, { code, pausedBy: playerName || 'Unknown Player' });
    });

    socket.on(GAME_EVENTS.RESUME, ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) {
        return; // Ignore if not in an active game
      }
      io.to(code).emit(GAME_EVENTS.RESUMED, { code, resumedBy: playerName || 'Unknown Player' });
    });

    socket.on(GAME_EVENTS.QUIT, ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) return; // Ignore if not in an active game
      const message = `${playerName || 'A'} player quit`;
      io.to(code).emit(GAME_EVENTS.ENDED, { code, message });
      removeGameSession(code);
      // send back to lobby
      io.to(code).emit(GAME_EVENTS.NAVIGATE_AWAY, { destination: 'lobby' });
    });
  });
}