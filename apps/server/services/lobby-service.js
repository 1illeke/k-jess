// Simple in-memory lobby service for the monorepo backend
export class LobbyService {
  constructor() {
    this.lobbies = new Map();
  }

  // Generate a 5-digit lobby code
  generateCode() {
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.lobbies.has(code));
    return code;
  }

  createLobby({ hostSocketId, playerId, name, settings = {} }) {
    const code = this.generateCode();
    const currentTime = Date.now();
    
    const defaultSettings = {
      mode: '2 Player',
      cooldownMs: 1000,
      maxPlayers: 4,
      ...settings
    };

    const lobby = {
      code,
      hostId: hostSocketId,
      hostPlayerId: playerId, // Add hostPlayerId for admin page
      createdAt: currentTime,
      phase: 'lobby',
      settings: defaultSettings,
      players: new Map()
    };

    // Add host player
    const hostPlayer = {
      socketId: hostSocketId,
      playerId,
      name,
      joinedAt: currentTime,
      connected: true
    };

    lobby.players.set(hostSocketId, hostPlayer);
    
    this.lobbies.set(code, lobby);
    return code;
  }

  getLobby(code) {
    return this.lobbies.get(code) || null;
  }

  joinLobby({ code, socketId, playerId, name }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check for duplicate names (excluding the same player rejoining)
    const existingPlayerWithName = Array.from(lobby.players.values())
      .find(p => p.name === name && p.playerId !== playerId);
    if (existingPlayerWithName) {
      throw new Error(`Name "${name}" is already taken. Please choose a different name.`);
    }

    // Check if player is rejoining
    let existingPlayer = null;
    for (const player of lobby.players.values()) {
      if (player.playerId === playerId) {
        existingPlayer = player;
        break;
      }
    }

    if (existingPlayer) {
      // Rejoin - update socket ID but keep original name
      if (existingPlayer.socketId !== socketId) {
        lobby.players.delete(existingPlayer.socketId);
      }
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      // Don't update name for rejoining players - keep original name
      lobby.players.set(socketId, existingPlayer);
      
      // Cancel cleanup timer since lobby is no longer empty
      if (lobby.cleanupTimer) {
        clearTimeout(lobby.cleanupTimer);
        lobby.cleanupTimer = null;
      }
      
      return existingPlayer;
    }

    // Check capacity
    const connectedCount = Array.from(lobby.players.values())
      .filter(p => p.connected).length;
    
    if (connectedCount >= lobby.settings.maxPlayers) {
      throw new Error('Lobby is full');
    }

    // New player
    const player = {
      socketId,
      playerId,
      name,
      joinedAt: Date.now(),
      connected: true
    };

    lobby.players.set(socketId, player);
    
    // Cancel cleanup timer since lobby is no longer empty
    if (lobby.cleanupTimer) {
      clearTimeout(lobby.cleanupTimer);
      lobby.cleanupTimer = null;
    }
    
    return player;
  }

  leaveLobby({ code, socketId }) {
    const lobby = this.getLobby(code);
    if (!lobby) return false;

    const player = lobby.players.get(socketId);
    if (!player) return false;

    lobby.players.delete(socketId);

    // If lobby is empty, schedule cleanup with a delay to allow for reconnection
    if (lobby.players.size === 0) {
      // Clear any existing cleanup timer for this lobby
      if (lobby.cleanupTimer) {
        clearTimeout(lobby.cleanupTimer);
      }
      
      // Schedule cleanup after 30 seconds to allow for reconnection
      lobby.cleanupTimer = setTimeout(() => {
        // Double-check the lobby is still empty before deleting
        const currentLobby = this.getLobby(code);
        if (currentLobby && currentLobby.players.size === 0) {
          this.lobbies.delete(code);
        }
      }, 30000); // 30 seconds delay
      
    } else if (lobby.hostId === socketId) {
      // Transfer host to another player
      const newHost = Array.from(lobby.players.values()).find(p => p.connected);
      if (newHost) {
        lobby.hostId = newHost.socketId;
        lobby.hostPlayerId = newHost.playerId;
      }
    }

    return true;
  }

  updateSettings({ code, byPlayerId, partialSettings }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const host = lobby.players.get(lobby.hostId);
    if (!host || host.playerId !== byPlayerId) {
      throw new Error('Only the host can update settings');
    }

    if (lobby.phase !== 'lobby') {
      throw new Error('Cannot update settings after game starts');
    }

    // Merge settings
    Object.assign(lobby.settings, partialSettings);
  }

  startGame({ code, byPlayerId }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const host = lobby.players.get(lobby.hostId);
    if (!host || host.playerId !== byPlayerId) {
      throw new Error('Only the host can start the game');
    }

    if (lobby.phase !== 'lobby') {
      throw new Error('Game already started');
    }

    const connectedPlayers = Array.from(lobby.players.values()).filter(p => p.connected);
    
    // Validate player count based on game mode
    const requiredPlayers = this.getRequiredPlayersForMode(lobby.settings.mode);
    if (connectedPlayers.length < requiredPlayers) {
      throw new Error(`Need at least ${requiredPlayers} players to start a ${lobby.settings.mode} game`);
    }

    lobby.phase = 'in_game';
    lobby.startedAt = Date.now();
  }

  getRequiredPlayersForMode(mode) {
    switch (mode) {
      case '1v1': return 2;
      case '1v1v1': return 3;
      case '1v1v1v1': return 4;
      default: return 2;
    }
  }

  endLobby({ code, byPlayerId, reason }) {
    const lobby = this.getLobby(code);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Allow admin termination (byPlayerId === null) or host termination
    if (byPlayerId !== null) {
      const host = lobby.players.get(lobby.hostId);
      if (!host || host.playerId !== byPlayerId) {
        throw new Error('Only the host can end the lobby');
      }
    }

    lobby.phase = 'ended';
    lobby.endedAt = Date.now();
    
    // Clean up after a delay
    setTimeout(() => {
      this.lobbies.delete(code);
      // Note: playerOrientations cleanup should be handled by the main server
    }, 30000); // 30 seconds
  }

  getPublicView(code, playerOrientations = null) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const host = lobby.players.get(lobby.hostId);
    
    // Sort players by join time to assign colors in order
    const sortedPlayers = Array.from(lobby.players.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    
    const players = sortedPlayers.map((player, index) => {
      let color;
      
      // If game has started and we have stored orientations, use them
      if (lobby.phase === 'in_game' && playerOrientations && playerOrientations.has(player.playerId)) {
        const orientation = playerOrientations.get(player.playerId);
        // Map orientation to color (same as server.js logic)
        switch (orientation) {
          case 2: color = 'White'; break;  // BOTTOM
          case 0: color = 'Black'; break;  // TOP
          case 1: color = 'Red'; break;    // RIGHT
          case 3: color = 'Blue'; break;   // LEFT
          default: color = 'White'; break;
        }
      } else {
        // For lobby phase or if no stored orientations, assign based on join order
        if (index === 0) {
          // First player (host) always gets White (BOTTOM orientation)
          color = 'White';
        } else if (index === 1) {
          // Second player always gets Black (TOP orientation)
          color = 'Black';
        } else if (index === 2) {
          // Third player always gets Red (RIGHT orientation)
          color = 'Red';
        } else if (index === 3) {
          // Fourth player always gets Blue (LEFT orientation)
          color = 'Blue';
        } else {
          // Fallback for more than 4 players (shouldn't happen with current max)
          const colors = ['White', 'Black', 'Red', 'Blue'];
          color = colors[index % colors.length];
        }
      }
      
      return {
        playerId: player.playerId,
        name: player.name,
        connected: player.connected,
        color: color
      };
    });

    return {
      code: lobby.code,
      phase: lobby.phase,
      settings: { ...lobby.settings },
      hostPlayerId: host ? host.playerId : null,
      players: players
    };
  }

  getActiveCodes() {
    return Array.from(this.lobbies.keys());
  }

  getStats() {
    return {
      totalLobbies: this.lobbies.size,
      lobbies: this.getActiveCodes()
    };
  }

  // Clean up all timers (useful for server shutdown)
  cleanup() {
    for (const [code, lobby] of this.lobbies.entries()) {
      if (lobby.cleanupTimer) {
        clearTimeout(lobby.cleanupTimer);
        lobby.cleanupTimer = null;
      }
    }
  }

  // Get all active lobby codes for cleanup
  getActiveCodes() {
    return Array.from(this.lobbies.keys());
  }
}