import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { LOBBY_EVENTS, GAME_EVENTS, CHAT_EVENTS, TIMER_EVENTS } from './constants/socket-events.js';
import { LobbyService } from './services/lobby-service.js';
import { ChessEngine, Piece } from './services/chess-engine.js';
import { KISSEngine } from './services/kiss-engine.js';

const app = express();
const server = createServer(app);

// Environment variables
const PORT = process.env.PORT || 4000;
const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('CORS Origins:', CORS_ORIGINS);

// CORS middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    lobbies: lobbyService.getStats().totalLobbies,
    onlineCount: io.sockets.sockets.size
  });
});

// Online count endpoint
app.get('/api/online-count', (req, res) => {
  res.json({ 
    onlineCount: io.sockets.sockets.size,
    timestamp: new Date().toISOString()
  });
});

// Admin endpoints
app.get('/api/admin/lobbies', (req, res) => {
  try {
    const lobbies = [];
    
    for (const code of lobbyService.getActiveCodes()) {
      const lobby = lobbyService.getLobby(code);
      if (lobby) {
        // Convert players Map to array with detailed info
        const playersArray = Array.from(lobby.players.values()).map(player => ({
          playerId: player.playerId,
          name: player.name,
          connected: player.connected,
          joinedAt: player.joinedAt,
          disconnectedAt: player.disconnectedAt
        }));
        
        lobbies.push({
          code: lobby.code,
          phase: lobby.phase,
          settings: lobby.settings,
          hostPlayerId: lobby.hostPlayerId,
          createdAt: lobby.createdAt,
          startedAt: lobby.startedAt,
          endedAt: lobby.endedAt,
          players: playersArray
        });
      }
    }
    
    res.json({
      lobbies,
      serverNow: new Date().toISOString(),
      totalCount: lobbies.length
    });
  } catch (error) {
    console.error('Error fetching lobbies for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/lobbies/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'Lobby code is required' });
    }
    
    const lobby = lobbyService.getLobby(code);
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    
    // End the lobby (this will handle cleanup)
    lobbyService.endLobby({
      code,
      byPlayerId: null, // Admin termination
      reason: 'Terminated by admin'
    });
    
    // Notify all players in the lobby
    io.to(code).emit(LOBBY_EVENTS.ENDED, {
      reason: 'Lobby terminated by admin'
    });
    
    // Remove all sockets from the room
    const room = io.sockets.adapter.rooms.get(code);
    if (room) {
      for (const socketId of room) {
        const socketInRoom = io.sockets.sockets.get(socketId);
        if (socketInRoom) {
          socketInRoom.leave(code);
        }
      }
    }
    
    // Also clean up game room if it exists
    const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
    if (gameRoom) {
      for (const socketId of gameRoom) {
        const socketInRoom = io.sockets.sockets.get(socketId);
        if (socketInRoom) {
          socketInRoom.leave(`game:${code}`);
        }
      }
    }
    
    // Clean up game timer
    gameTimers.delete(code);
    
    // Clean up chat history
    chatRooms.delete(code);
    
    // Clean up chess engine
    chessEngines.delete(code);
    
    console.log(`Admin terminated lobby ${code}`);
    
    res.json({
      success: true,
      message: `Lobby ${code} terminated successfully`
    });
  } catch (error) {
    console.error('Error terminating lobby:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize services
const lobbyService = new LobbyService();

// Simple in-memory storage for game features
const gameTimers = new Map(); // code -> { startTime, elapsed, paused }
const chatRooms = new Map();  // code -> messages[]
const chessEngines = new Map(); // code -> ChessEngine instance

// Function to broadcast online count to all clients
function broadcastOnlineCount() {
  const count = io.sockets.sockets.size;
  io.emit('online-count-update', { onlineCount: count });
}

// Helper: finalize and cleanup a game/lobby when it ends
function finalizeGameAndCleanup({ code, lobby, status }) {
  try {
    // Pause and remove timer
    const timer = gameTimers.get(code);
    if (timer && !timer.paused) {
      timer.elapsed += Date.now() - timer.startTime;
      timer.paused = true;
      gameTimers.set(code, timer);
    }
    // Remove timer entirely after pause
    gameTimers.delete(code);

    // Mark lobby ended and timestamp
    if (lobby) {
      lobby.phase = 'ended';
      lobby.endedAt = Date.now();
    }

    // Emit a final GAME_OVER to each player with their orientation
    if (status) {
      const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
      if (gameRoom) {
        for (const socketId of gameRoom) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            const player = lobby?.players.get(socketId);
            const playerOrientation = player ? getPlayerOrientation(lobby, player) : null;
            playerSocket.emit(GAME_EVENTS.GAME_OVER, {
              reason: status.gameOverReason,
              winner: status.winner,
              loser: status.loser,
              playerOrientation
            });
          }
        }
      } else {
        // Fallback broadcast without per-player orientation
        io.to(`game:${code}`).emit(GAME_EVENTS.GAME_OVER, {
          reason: status.gameOverReason,
          winner: status.winner,
          loser: status.loser
        });
      }
    }

    // Clear chess engine resources
    chessEngines.delete(code);

    // Clear stored orientations for this game
    playerOrientations.delete(code);

    // Clear chat history
    chatRooms.delete(code);

    // Schedule lobby removal shortly after game over
    setTimeout(() => {
      // Safeguard: only remove if still ended
      const l = lobbyService.getLobby(code);
      if (l && l.phase === 'ended') {
        lobbyService.endLobby({ code, byPlayerId: null, reason: 'Auto-cleanup after game over' });
      }
    }, 2000);
  } catch (cleanupError) {
    console.error('Error during finalizeGameAndCleanup:', cleanupError);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Broadcast updated count to all clients
  broadcastOnlineCount();

  // Handle lobby creation
  socket.on(LOBBY_EVENTS.CREATE, (data, ack) => {
    try {
      const { playerId, name, settings } = data || {};
      
      if (!playerId || !name) {
        const error = { reason: 'INVALID_INPUT', details: 'playerId and name are required' };
        socket.emit(LOBBY_EVENTS.ERROR, error);
        if (ack) ack({ success: false, error: error.details });
        return;
      }

      const code = lobbyService.createLobby({
        hostSocketId: socket.id,
        playerId,
        name,
        settings
      });

      socket.join(code);
      
      if (ack) ack({ code, success: true });
      console.log(`Lobby created: ${code} by ${name}`);
      
      // Emit state after acknowledgment to ensure frontend is listening
      setTimeout(() => {
        emitLobbyState(io, code);
      }, 100);
    } catch (error) {
      console.error('Error creating lobby:', error);
      const errorResponse = { reason: 'CREATE_FAILED', details: error.message };
      socket.emit(LOBBY_EVENTS.ERROR, errorResponse);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle lobby join
  socket.on(LOBBY_EVENTS.JOIN, (data, ack) => {
    try {
      const { code, playerId, name } = data || {};
      
      if (!code || !playerId || !name) {
        const error = { reason: 'INVALID_INPUT', details: 'code, playerId and name are required' };
        socket.emit(LOBBY_EVENTS.ERROR, error);
        if (ack) ack({ success: false, error: error.details });
        return;
      }

      const player = lobbyService.joinLobby({
        code,
        socketId: socket.id,
        playerId,
        name
      });

      socket.join(code);
      
      // Notify other players
      const playerPublic = {
        playerId: player.playerId,
        name: player.name,
        connected: player.connected,
      };
      
      socket.to(code).emit(LOBBY_EVENTS.PLAYER_JOINED, { playerPublic });
      emitLobbyState(io, code);
      
      if (ack) ack({ success: true, player: playerPublic });
      console.log(`Player ${name} joined lobby ${code}`);
    } catch (error) {
      console.error('Error joining lobby:', error);
      const errorResponse = { reason: 'JOIN_FAILED', details: error.message };
      socket.emit(LOBBY_EVENTS.ERROR, errorResponse);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle lobby leave
  socket.on(LOBBY_EVENTS.LEAVE, (data) => {
    try {
      const { code } = data || {};
      if (!code) return;
      
      // Get player info BEFORE removing them
      const lobby = lobbyService.getLobby(code);
      const player = lobby?.players.get(socket.id);
      
      const removed = lobbyService.leaveLobby({
        code,
        socketId: socket.id
      });

      if (removed && player) {
        const playerPublic = {
          playerId: player.playerId,
          name: player.name,
          connected: false,
        };
        
        socket.to(code).emit(LOBBY_EVENTS.PLAYER_LEFT, { playerPublic });
        socket.leave(code);
        emitLobbyState(io, code);
        console.log(`Player left lobby ${code}`);
      }
    } catch (error) {
      console.error('Error leaving lobby:', error);
      socket.emit(LOBBY_EVENTS.ERROR, { reason: 'LEAVE_FAILED', details: error.message });
    }
  });

  // Handle settings update
  socket.on(LOBBY_EVENTS.UPDATE_SETTINGS, (data) => {
    try {
      const { code, partialSettings } = data || {};
      if (!code) return;
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.updateSettings({
        code,
        byPlayerId: host?.playerId,
        partialSettings
      });

      io.to(code).emit(LOBBY_EVENTS.SETTINGS_UPDATED, {
        settings: lobby.settings
      });
      
      emitLobbyState(io, code);
      console.log(`Settings updated for lobby ${code}`);
    } catch (error) {
      console.error('Error updating settings:', error);
      socket.emit(LOBBY_EVENTS.ERROR, { reason: 'SETTINGS_UPDATE_FAILED', details: error.message });
    }
  });

  // Handle game start
  socket.on(LOBBY_EVENTS.START_GAME, (data, ack) => {
    try {
      const { code } = data || {};
      if (!code) return;
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.startGame({
        code,
        byPlayerId: host?.playerId
      });

      io.to(code).emit(LOBBY_EVENTS.STARTED, {
        settings: lobby.settings,
        serverNow: Date.now()
      });
      
      emitLobbyState(io, code);
      
      // Only emit game start events for actual new games
      io.to(`game:${code}`).emit(GAME_EVENTS.STARTED, { code });
      
      // Initialize timer for new games - start immediately
      if (!gameTimers.has(code)) {
        gameTimers.set(code, { elapsed: 0, paused: false, startTime: Date.now() });
        console.log(`Timer initialized and started for new game ${code}`);
      } else {
        console.log(`Timer already exists for game ${code}, preserving existing timer`);
      }
      
      // Store player orientations for this game to preserve them on reconnection
      const orientations = new Map();
      const connectedPlayers = Array.from(lobby.players.values()).filter(p => p.connected);
      for (const player of connectedPlayers) {
        const orientation = getPlayerOrientation(lobby, player);
        orientations.set(player.playerId, orientation);
        console.log(`Stored orientation for player ${player.name} (${player.playerId}): ${orientation}`);
      }
      playerOrientations.set(code, orientations);
      
      // Initialize appropriate chess engine based on game mode setting
      let chessEngine;
      
      // Use game mode setting to determine engine, not player count
      if (lobby.settings.mode === '1v1') {
        // Use original engine for 2-player games
        chessEngine = new ChessEngine(code, lobby.settings);
      } else {
        // Use KISS engine for 3/4 player games
        chessEngine = new KISSEngine(code, {...lobby.settings, maxPlayers: connectedPlayers.length});
      }
      
      chessEngines.set(code, chessEngine);
      
      // Send initial game state to all players
      const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
      if (gameRoom) {
        for (const socketId of gameRoom) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            // Get player's orientation from lobby
            const player = lobby.players.get(socketId);
            const playerOrientation = getPlayerOrientation(lobby, player);
            
            // Send initial game state for this player
            const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
            playerSocket.emit(GAME_EVENTS.GAME_STATE, gameState);
          }
        }
      }
      
      if (ack) ack({ success: true, gameStarted: true });
      console.log(`Game started for lobby ${code}`);
    } catch (error) {
      console.error('Error starting game:', error);
      const errorResponse = { reason: 'START_FAILED', details: error.message };
      socket.emit(LOBBY_EVENTS.ERROR, errorResponse);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle lobby end
  socket.on(LOBBY_EVENTS.END, (data) => {
    try {
      const { code } = data || {};
      if (!code) return;
      
      const lobby = lobbyService.getLobby(code);
      const host = lobby?.players.get(socket.id);
      
      lobbyService.endLobby({
        code,
        byPlayerId: host?.playerId,
        reason: 'Host ended the lobby'
      });

      io.to(code).emit(LOBBY_EVENTS.ENDED, {
        reason: 'Host ended the lobby'
      });
      
      // Remove all sockets from the room
      const room = io.sockets.adapter.rooms.get(code);
      if (room) {
        for (const socketId of room) {
          const socketInRoom = io.sockets.sockets.get(socketId);
          if (socketInRoom) {
            socketInRoom.leave(code);
          }
        }
      }
      console.log(`Lobby ${code} ended`);
    } catch (error) {
      console.error('Error ending lobby:', error);
      socket.emit(LOBBY_EVENTS.ERROR, { reason: 'END_FAILED', details: error.message });
    }
  });

  // Handle game join
  socket.on(GAME_EVENTS.JOIN, (data, ack) => {
    try {
      const { code } = data || {};
      if (!code) {
        if (ack) ack({ success: false, error: 'Code required' });
        return;
      }

      const lobby = lobbyService.getLobby(code);
      if (!lobby) {
        if (ack) ack({ success: false, error: 'Game not found' });
        return;
      }

      socket.join(`game:${code}`);
      
      // If game has ended, send game over state
      if (lobby.phase === 'ended') {
        const chessEngine = chessEngines.get(code);
        if (chessEngine) {
          // Get player's orientation from lobby
          const player = lobby.players.get(socket.id);
          const playerOrientation = getPlayerOrientation(lobby, player);
          
          // Send current game state for this player (ended state)
          const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
          socket.emit(GAME_EVENTS.GAME_STATE, gameState);
          
          // Send game over event
          const gameStatus = chessEngine.getGameStatus();
          if (gameStatus.gameOver) {
            socket.emit(GAME_EVENTS.GAME_OVER, {
              reason: gameStatus.gameOverReason,
              winner: gameStatus.winner
            });
          }
          
          // Send final timer state
          const timer = gameTimers.get(code);
          if (timer) {
            const currentElapsed = Math.floor(timer.elapsed / 1000);
            socket.emit(TIMER_EVENTS.UPDATE, { code, elapsed: currentElapsed });
            console.log(`Sent final timer state to player in ended game: ${currentElapsed}s elapsed`);
          }
        }
      }
      // If game is already started, send current game state to the joining player
      else if (lobby.phase === 'in_game') {
        const chessEngine = chessEngines.get(code);
        if (chessEngine) {
          // Get player's orientation from lobby
          const player = lobby.players.get(socket.id);
          const playerOrientation = getPlayerOrientation(lobby, player);
          
          // Send current game state for this player
          const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
          socket.emit(GAME_EVENTS.GAME_STATE, gameState);
          
          // Also send current timer state
          const timer = gameTimers.get(code);
          if (timer) {
            let currentElapsed;
            if (timer.paused) {
              // Timer is paused (game ended), send the final elapsed time
              currentElapsed = Math.floor(timer.elapsed / 1000);
            } else {
              // Timer is running, calculate current time
              currentElapsed = Math.floor((timer.elapsed + (Date.now() - timer.startTime)) / 1000);
            }
            socket.emit(TIMER_EVENTS.UPDATE, { code, elapsed: currentElapsed });
            console.log(`Sent timer sync to rejoining player: ${currentElapsed}s elapsed (paused: ${timer.paused})`);
          }
        } else {
          // Game is in progress but no engine exists - recreate it
          const connectedPlayers = Array.from(lobby.players.values()).filter(p => p.connected);
          
          // Use game mode setting to determine engine, not player count
          if (lobby.settings.mode === '1v1') {
            chessEngine = new ChessEngine(code, lobby.settings);
          } else {
            chessEngine = new KISSEngine(code, {...lobby.settings, maxPlayers: connectedPlayers.length});
          }
          
          chessEngines.set(code, chessEngine);
          
          // Send initial game state for this player
          const player = lobby.players.get(socket.id);
          const playerOrientation = getPlayerOrientation(lobby, player);
          const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
          socket.emit(GAME_EVENTS.GAME_STATE, gameState);
          
          // Also send current timer state
          const timer = gameTimers.get(code);
          if (timer) {
            let currentElapsed;
            if (timer.paused) {
              // Timer is paused (game ended), send the final elapsed time
              currentElapsed = Math.floor(timer.elapsed / 1000);
            } else {
              // Timer is running, calculate current time
              currentElapsed = Math.floor((timer.elapsed + (Date.now() - timer.startTime)) / 1000);
            }
            socket.emit(TIMER_EVENTS.UPDATE, { code, elapsed: currentElapsed });
            console.log(`Sent timer sync to rejoining player (recreated engine): ${currentElapsed}s elapsed (paused: ${timer.paused})`);
          }
        }
      }
      
      if (ack) ack({ success: true });
      console.log(`Player joined game ${code}`);
    } catch (error) {
      console.error('Error joining game:', error);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle game pause
  socket.on(GAME_EVENTS.PAUSE, (data) => {
    try {
      const { code, playerName } = data || {};
      if (!code) return;

      const lobby = lobbyService.getLobby(code);
      if (!lobby) return;

      // Pause timer
      const timer = gameTimers.get(code);
      if (timer && !timer.paused) {
        timer.elapsed += Date.now() - timer.startTime;
        timer.paused = true;
        gameTimers.set(code, timer);
      }

      io.to(`game:${code}`).emit(GAME_EVENTS.PAUSED, { 
        code, 
        pausedBy: playerName || 'Unknown Player' 
      });
      
      console.log(`Game ${code} paused by ${playerName}`);
    } catch (error) {
      console.error('Error pausing game:', error);
    }
  });

  // Handle game resume
  socket.on(GAME_EVENTS.RESUME, (data) => {
    try {
      const { code, playerName } = data || {};
      if (!code) return;

      const lobby = lobbyService.getLobby(code);
      if (!lobby) return;

      // Resume timer
      const timer = gameTimers.get(code);
      if (timer && timer.paused) {
        timer.startTime = Date.now();
        timer.paused = false;
        gameTimers.set(code, timer);
      }

      io.to(`game:${code}`).emit(GAME_EVENTS.RESUMED, { 
        code, 
        resumedBy: playerName || 'Unknown Player' 
      });
      
      console.log(`Game ${code} resumed by ${playerName}`);
    } catch (error) {
      console.error('Error resuming game:', error);
    }
  });

  // Handle game quit
  socket.on(GAME_EVENTS.QUIT, (data) => {
    try {
      const { code, playerName } = data || {};
      if (!code) return;

      // Leave game room but NOT lobby room - they're going back to lobby
      socket.leave(`game:${code}`);
      
      // Reset lobby phase back to 'lobby' if all players have left the game
      const lobby = lobbyService.getLobby(code);
      if (lobby && lobby.phase === 'in_game') {
        const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
        if (!gameRoom || gameRoom.size === 0) {
          // No one left in game, reset lobby to lobby phase
          lobby.phase = 'lobby';
          
          // Pause the timer when game ends due to all players quitting
          const timer = gameTimers.get(code);
          if (timer && !timer.paused) {
            timer.elapsed += Date.now() - timer.startTime;
            timer.paused = true;
            gameTimers.set(code, timer);
            console.log(`Timer paused for game ${code} - all players quit`);
          }
          
          emitLobbyState(io, code);
        }
      }
      
      socket.emit(GAME_EVENTS.NAVIGATE_AWAY);
      
      console.log(`Player ${playerName} quit game ${code}`);
    } catch (error) {
      console.error('Error quitting game:', error);
    }
  });

  // Handle chess move
  socket.on(GAME_EVENTS.MAKE_MOVE, (data, ack) => {
    try {
      const { code, from, to, playerOrientation } = data || {};
      console.log('=== BACKEND MOVE DEBUG ===');
      console.log('Move data:', { code, from, to, playerOrientation });
      
      if (!code || !from || !to) {
        console.log('Missing required fields');
        if (ack) ack({ success: false, error: 'Missing required fields' });
        return;
      }

      const lobby = lobbyService.getLobby(code);
      if (!lobby) {
        console.log('Game not found');
        if (ack) ack({ success: false, error: 'Game not found' });
        return;
      }

      // Check if game has ended
      if (lobby.phase === 'ended') {
        console.log('Game has ended, cannot make moves');
        if (ack) ack({ success: false, error: 'Game has ended' });
        return;
      }

      // Get or create chess engine for this game
      let chessEngine = chessEngines.get(code);
      if (!chessEngine) {
        console.log('Creating new chess engine');
        const connectedPlayers = Array.from(lobby.players.values()).filter(p => p.connected);
        
        // Use game mode setting to determine engine, not player count
        if (lobby.settings.mode === '1v1') {
          // Use original engine for 2-player games
          chessEngine = new ChessEngine(code, lobby.settings);
        } else {
          // Use KISS engine for 3/4 player games
          chessEngine = new KISSEngine(code, {...lobby.settings, maxPlayers: connectedPlayers.length});
        }
        
        chessEngines.set(code, chessEngine);
      }

      // Derive authoritative orientation from server-side mapping
      const player = lobby.players.get(socket.id);
      if (!player) {
        console.log('Unauthorized move: player not found in lobby');
        if (ack) ack({ success: false, error: 'Unauthorized' });
        return;
      }
      const serverOrientation = getPlayerOrientation(lobby, player);
      console.log('Derived player orientation:', serverOrientation);
      console.log('Engine type:', chessEngine.constructor.name);

      // Check if move requires promotion
      if (chessEngine.requiresPromotion(from, to, serverOrientation)) {
        console.log('Move requires promotion');
        if (ack) ack({ 
          success: false, 
          error: 'Promotion required', 
          requiresPromotion: true,
          from,
          to
        });
        return;
      }

      // Make the move
      const result = chessEngine.makeMove(from, to, serverOrientation);
      console.log('Move result:', result);
      
      if (!result.success) {
        console.log('Move failed:', result.error);
        if (ack) ack({ success: false, error: result.error });
        return;
      }

      // Send game state to all players in the game room
      const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
      if (gameRoom) {
        for (const socketId of gameRoom) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            // Get player's orientation from lobby
            const player = lobby.players.get(socketId);
            const playerOrientation = getPlayerOrientation(lobby, player);
            
            // Send game state for this specific player's perspective
            const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
            playerSocket.emit(GAME_EVENTS.GAME_STATE, gameState);
          }
        }
      }

      // Handle game status events
      if (result.gameStatus) {
        const status = result.gameStatus;
        
        // Emit check events
        for (const [team, checkResult] of Object.entries(status.inCheck)) {
          if (checkResult.inCheck) {
            io.to(`game:${code}`).emit(GAME_EVENTS.CHECK, {
              team: parseInt(team),
              attackingPiece: checkResult.attackingPiece,
              kingSquare: checkResult.kingSquare
            });
          }
        }
        
        // Emit checkmate events
        for (const [team, checkmateResult] of Object.entries(status.inCheckmate)) {
          if (checkmateResult.inCheckmate) {
            io.to(`game:${code}`).emit(GAME_EVENTS.CHECKMATE, {
              team: parseInt(team),
              allAttackers: checkmateResult.allAttackers,
              kingSquare: checkmateResult.kingSquare,
              winner: status.winner,
              loser: status.loser
            });
          }
        }
        
        // Emit stalemate events
        for (const [team, stalemateResult] of Object.entries(status.inStalemate)) {
          if (stalemateResult.inStalemate) {
            io.to(`game:${code}`).emit(GAME_EVENTS.STALEMATE, {
              team: parseInt(team)
            });
          }
        }
        
        // Emit game over event and cleanup
        if (status.gameOver) {
          console.log(`Game ${code} ended - reason: ${status.gameOverReason}`);
          finalizeGameAndCleanup({ code, lobby, status });
        }
      }

      // Broadcast the move to all players
      io.to(`game:${code}`).emit(GAME_EVENTS.MOVE_MADE, {
        move: result.move,
        gameState: result.gameState,
        gameStatus: result.gameStatus
      });

      if (ack) ack({ success: true, move: result.move });
      console.log(`Move made in game ${code}: ${from} -> ${to}`);
    } catch (error) {
      console.error('Error making move:', error);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle pawn promotion
  socket.on(GAME_EVENTS.PAWN_PROMOTION, (data, ack) => {
    try {
      const { code, from, to, promotionPiece, playerOrientation } = data || {};
      console.log('=== BACKEND PROMOTION DEBUG ===');
      console.log('Promotion data:', { code, from, to, promotionPiece, playerOrientation });
      
      if (!code || !from || !to || promotionPiece === null || promotionPiece === undefined) {
        console.log('Missing required fields for promotion');
        if (ack) ack({ success: false, error: 'Missing required fields for promotion' });
        return;
      }

      const lobby = lobbyService.getLobby(code);
      if (!lobby) {
        console.log('Game not found');
        if (ack) ack({ success: false, error: 'Game not found' });
        return;
      }

      // Check if game has ended
      if (lobby.phase === 'ended') {
        console.log('Game has ended, cannot make moves');
        if (ack) ack({ success: false, error: 'Game has ended' });
        return;
      }

      // Get chess engine for this game
      const chessEngine = chessEngines.get(code);
      if (!chessEngine) {
        console.log('Chess engine not found');
        if (ack) ack({ success: false, error: 'Chess engine not found' });
        return;
      }

      // Validate promotion piece
      console.log('Piece constants:', Piece);
      console.log('Promotion piece received:', promotionPiece);
      const validPromotionPieces = [Piece.QUEEN, Piece.ROOK, Piece.BISHOP, Piece.KNIGHT];
      console.log('Valid promotion pieces:', validPromotionPieces);
      if (!validPromotionPieces.includes(promotionPiece)) {
        console.log('Invalid promotion piece:', promotionPiece);
        if (ack) ack({ success: false, error: 'Invalid promotion piece' });
        return;
      }

      // Derive authoritative orientation from server-side mapping
      const player = lobby.players.get(socket.id);
      if (!player) {
        console.log('Unauthorized promotion: player not found in lobby');
        if (ack) ack({ success: false, error: 'Unauthorized' });
        return;
      }
      const serverOrientation = getPlayerOrientation(lobby, player);

      // Make the move with promotion using server-derived orientation
      const result = chessEngine.makeMove(from, to, serverOrientation, promotionPiece);
      console.log('Promotion move result:', result);
      
      if (!result.success) {
        console.log('Promotion move failed:', result.error);
        if (ack) ack({ success: false, error: result.error });
        return;
      }

      // Send game state to all players in the game room
      const gameRoom = io.sockets.adapter.rooms.get(`game:${code}`);
      if (gameRoom) {
        for (const socketId of gameRoom) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            // Get player's orientation from lobby
            const player = lobby.players.get(socketId);
            const playerOrientation = getPlayerOrientation(lobby, player);
            
            // Send game state for this specific player's perspective
            const gameState = chessEngine.getGameStateForPlayer(playerOrientation);
            playerSocket.emit(GAME_EVENTS.GAME_STATE, gameState);
          }
        }
      }

      // Handle game status events (same as regular move)
      if (result.gameStatus) {
        const status = result.gameStatus;
        
        // Emit check events
        for (const [team, checkResult] of Object.entries(status.inCheck)) {
          if (checkResult.inCheck) {
            io.to(`game:${code}`).emit(GAME_EVENTS.CHECK, {
              team: parseInt(team),
              attackingPiece: checkResult.attackingPiece,
              kingSquare: checkResult.kingSquare
            });
          }
        }
        
        // Emit checkmate events
        for (const [team, checkmateResult] of Object.entries(status.inCheckmate)) {
          if (checkmateResult.inCheckmate) {
            io.to(`game:${code}`).emit(GAME_EVENTS.CHECKMATE, {
              team: parseInt(team),
              allAttackers: checkmateResult.allAttackers,
              kingSquare: checkmateResult.kingSquare,
              winner: status.winner,
              loser: status.loser
            });
          }
        }
        
        // Emit stalemate events
        for (const [team, stalemateResult] of Object.entries(status.inStalemate)) {
          if (stalemateResult.inStalemate) {
            io.to(`game:${code}`).emit(GAME_EVENTS.STALEMATE, {
              team: parseInt(team)
            });
          }
        }
        
        // Emit game over event and cleanup
        if (status.gameOver) {
          console.log(`Game ${code} ended - reason: ${status.gameOverReason}`);
          finalizeGameAndCleanup({ code, lobby, status });
        }
      }

      // Broadcast the move to all players
      io.to(`game:${code}`).emit(GAME_EVENTS.MOVE_MADE, {
        move: result.move,
        gameState: result.gameState,
        gameStatus: result.gameStatus
      });

      if (ack) ack({ success: true, move: result.move });
      console.log(`Promotion move made in game ${code}: ${from} -> ${to} (${promotionPiece})`);
    } catch (error) {
      console.error('Error handling pawn promotion:', error);
      if (ack) ack({ success: false, error: error.message });
    }
  });

  // Handle chat message
  socket.on(CHAT_EVENTS.SEND_MESSAGE, (data) => {
    try {
      const { code, playerId, playerName, text } = data || {};
      if (!code || !text) return;

      const message = {
        playerId: playerId || socket.id,
        playerName: playerName || 'Unknown',
        text: text.trim(),
        timestamp: Date.now()
      };

      // Store message
      if (!chatRooms.has(code)) {
        chatRooms.set(code, []);
      }
      const messages = chatRooms.get(code);
      messages.push(message);
      
      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.splice(0, messages.length - 100);
      }

      // Broadcast to all players in the game room
      io.to(`game:${code}`).emit(CHAT_EVENTS.MESSAGE_RECEIVED, message);
      
      console.log(`Chat message in ${code} from ${playerName}: ${text}`);
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Handle timer start
  socket.on(TIMER_EVENTS.START, (data) => {
    try {
      const { code } = data || {};
      if (!code) return;

      // Do not start timer for ended games
      const lobby = lobbyService.getLobby(code);
      if (lobby && lobby.phase === 'ended') {
        console.log(`Ignoring timer start for ended game ${code}`);
        return;
      }

      const existingTimer = gameTimers.get(code);
      
      // Only start timer if it doesn't exist or is paused
      if (!existingTimer) {
        // Create new timer
        gameTimers.set(code, { elapsed: 0, paused: false, startTime: Date.now() });
        console.log(`Timer created and started for lobby ${code}`);
      } else if (existingTimer.paused) {
        // Resume existing timer
        existingTimer.startTime = Date.now();
        existingTimer.paused = false;
        gameTimers.set(code, existingTimer);
        console.log(`Timer resumed for lobby ${code}`);
      } else {
        // Timer is already running, don't reset it
        console.log(`Timer already running for lobby ${code}, ignoring start request`);
      }
      
      // Send immediate timer update to confirm it's working
      const timer = gameTimers.get(code);
      if (timer && !timer.paused) {
        const currentElapsed = Math.floor((timer.elapsed + (Date.now() - timer.startTime)) / 1000);
        io.to(`game:${code}`).emit(TIMER_EVENTS.UPDATE, { code, elapsed: currentElapsed });
        console.log(`Sent immediate timer update: ${currentElapsed}s for game ${code}`);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  });

  // Handle timer pause
  socket.on(TIMER_EVENTS.PAUSE, (data) => {
    try {
      const { code } = data || {};
      if (!code) return;

      const timer = gameTimers.get(code);
      if (timer && !timer.paused) {
        timer.elapsed += Date.now() - timer.startTime;
        timer.paused = true;
        gameTimers.set(code, timer);
      }

      console.log(`Timer paused for ${code}`);
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  });

  // Handle timer reset
  socket.on(TIMER_EVENTS.RESET, (data) => {
    try {
      const { code } = data || {};
      if (!code) return;

      // Do not reset timer for ended games
      const lobby = lobbyService.getLobby(code);
      if (lobby && lobby.phase === 'ended') {
        console.log(`Ignoring timer reset for ended game ${code}`);
        return;
      }

      gameTimers.set(code, { elapsed: 0, paused: true, startTime: Date.now() });
      console.log(`Timer reset for ${code}`);
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handlePlayerDisconnection(socket.id);
    
    // Broadcast updated count to remaining clients
    broadcastOnlineCount();
  });
});

// Helper function to emit lobby state
function emitLobbyState(io, code) {
  // Get stored orientations if game has started
  const orientations = playerOrientations.get(code) || null;
  const lobbyPublic = lobbyService.getPublicView(code, orientations);
  if (lobbyPublic) {
    io.to(code).emit(LOBBY_EVENTS.STATE, {
      lobbyPublic,
      serverNow: Date.now()
    });
  }
}

// Store original player orientations when game starts
const playerOrientations = new Map(); // gameCode -> Map(playerId -> orientation)

// Helper function to get player orientation based on lobby order
function getPlayerOrientation(lobby, player) {
  if (!lobby || !player) return null;
  
  // If game has started, use stored orientations
  if (lobby.phase === 'in_game' && playerOrientations.has(lobby.code)) {
    const orientations = playerOrientations.get(lobby.code);
    if (orientations.has(player.playerId)) {
      return orientations.get(player.playerId);
    }
  }
  
  // For new games or if orientation not stored, assign based on join order
  const players = Array.from(lobby.players.values())
    .filter(p => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  
  const playerIndex = players.findIndex(p => p.playerId === player.playerId);
  
  // Use stable orientation assignment based on join order
  // This matches the color assignment in lobby service
  if (playerIndex === 0) {
    return 2; // First player (host) always gets BOTTOM (White)
  } else if (playerIndex === 1) {
    return 0; // Second player always gets TOP (Black)
  } else if (playerIndex === 2) {
    return 1; // Third player always gets RIGHT (Red)
  } else if (playerIndex === 3) {
    return 3; // Fourth player always gets LEFT (Blue)
  }
  
  return 2; // Default to BOTTOM
}

// Handle player disconnection
function handlePlayerDisconnection(socketId) {
  // Find which lobby this player was in
  for (const code of lobbyService.getActiveCodes()) {
    const lobby = lobbyService.getLobby(code);
    if (lobby && lobby.players.has(socketId)) {
      // Get player info BEFORE removing them
      const player = lobby.players.get(socketId);
      
      const removed = lobbyService.leaveLobby({
        code,
        socketId
      });
      
      if (removed && player) {
        const playerPublic = {
          playerId: player.playerId,
          name: player.name,
          connected: player.connected,
        };
        
        io.to(code).emit(LOBBY_EVENTS.PLAYER_LEFT, { playerPublic });
        emitLobbyState(io, code);
        
        // Check if lobby is now empty and clean up orientations
        const remainingPlayers = Array.from(lobby.players.values()).filter(p => p.connected);
        if (remainingPlayers.length === 0) {
          console.log(`Lobby ${code} is now empty, cleaning up orientations`);
          playerOrientations.delete(code);
        }
        
        // If game was in progress and now has no players, pause the timer
        if (lobby.phase === 'in_game' && remainingPlayers.length === 0) {
          const timer = gameTimers.get(code);
          if (timer && !timer.paused) {
            timer.elapsed += Date.now() - timer.startTime;
            timer.paused = true;
            gameTimers.set(code, timer);
            console.log(`Timer paused for game ${code} - all players disconnected`);
          }
        }
      }
      
      break; // Player can only be in one lobby
    }
  }
}

// Timer update system - broadcast current time every second
const timerStartTime = Date.now();
let updateCounter = 0;

function sendTimerUpdates() {
  const now = Date.now();
  updateCounter++;
  
  // sanity check for timer
  const realElapsedMs = now - timerStartTime;
  
  for (const [code, timer] of gameTimers.entries()) {
    if (!timer.paused) {
      const currentElapsed = Math.floor((timer.elapsed + (now - timer.startTime)) / 1000);
      io.to(`game:${code}`).emit(TIMER_EVENTS.UPDATE, { code, elapsed: currentElapsed });
      console.log(`Broadcasting timer update: ${currentElapsed}s for game ${code}`);
    }
  }
  
  const nextUpdateIn = 1000 - (realElapsedMs % 1000);
  setTimeout(sendTimerUpdates, nextUpdateIn);
}

// Start the timer system
setTimeout(sendTimerUpdates, 1000);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  lobbyService.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  lobbyService.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});