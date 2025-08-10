import { createGameSession, getGameSession, removeGameSession } from '../services/game.service.js';
import { lobbyService } from '../services/lobby.service.js';

export function registerGameSocket(io) {
  io.on('connection', (socket) => {
    
    socket.on('joinGame', ({ code } = {}) => {
      try {
        const lobby = lobbyService.getLobby(code);
        if (!lobby) {
          socket.emit('gameError', { message: 'Game not found' });
          return;
        }

        socket.join(code);
        
        // Send game state to the joining player
        socket.emit('gameJoined', { 
          code, 
          players: Array.from(lobby.players.values()).map(p => ({
            id: p.playerId,
            name: p.name,
            connected: p.connected,
          }))
        });
      } catch (err) {
        console.error('Error joining game:', err);
        socket.emit('gameError', { message: err.message || 'Failed to join game' });
      }
    });
    socket.on('startGame', ({ code, settings } = {}) => {
      try {
        const lobby = lobbyService.getLobby(code);
        if (!lobby) {
          socket.emit('gameError', { message: 'Lobby not found' });
          return;
        }

        const host = lobby.players.get(socket.id);
        if (!host || lobby.hostId !== socket.id) {
          socket.emit('gameError', { message: 'Only the host can start the game' });
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
        io.to(code).emit('gameStarted', { code, settings: session.settings, players: session.players });
      } catch (err) {
        console.error('Error starting game:', err);
        socket.emit('gameError', { message: err.message || 'Failed to start game' });
      }
    });

    socket.on('pauseGame', ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) {
        return; // Ignore if not in an active game
      }
      io.to(code).emit('gamePaused', { code, pausedBy: playerName || 'Unknown Player' });
    });

    socket.on('resumeGame', ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) {
        return; // Ignore if not in an active game
      }
      io.to(code).emit('gameResumed', { code, resumedBy: playerName || 'Unknown Player' });
    });

    socket.on('quitGame', ({ code, playerName } = {}) => {
      const session = getGameSession(code);
      if (!session) return; // Ignore if not in an active game
      const message = `${playerName || 'A'} player quit`;
      io.to(code).emit('gameEnded', { code, message });
      removeGameSession(code);
      // send back to lobby
      io.to(code).emit('navigateAway', { destination: 'lobby' });
    });
  });
}