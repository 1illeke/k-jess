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
      randomColors: false,
      ...settings
    };

    const lobby = {
      code,
      hostId: hostSocketId,
      hostPlayerId: playerId, // Add hostPlayerId for admin page
      createdAt: currentTime,
      phase: 'lobby',
      settings: defaultSettings,
      players: new Map(),
      playerColors: {}
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
    
    // Initialize colors
    lobby.playerColors[playerId] = this.getPlayerColor(0, defaultSettings.randomColors);
    
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

    // Check if player is rejoining
    let existingPlayer = null;
    for (const player of lobby.players.values()) {
      if (player.playerId === playerId) {
        existingPlayer = player;
        break;
      }
    }

    if (existingPlayer) {
      // Rejoin - update socket ID
      if (existingPlayer.socketId !== socketId) {
        lobby.players.delete(existingPlayer.socketId);
      }
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      existingPlayer.name = name;
      lobby.players.set(socketId, existingPlayer);
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
    
    // Assign color to new player
    if (!lobby.playerColors[playerId]) {
      const playerIndex = Object.keys(lobby.playerColors).length;
      lobby.playerColors[playerId] = this.getPlayerColor(playerIndex, lobby.settings.randomColors);
    }
    
    return player;
  }

  leaveLobby({ code, socketId }) {
    const lobby = this.getLobby(code);
    if (!lobby) return false;

    const player = lobby.players.get(socketId);
    if (!player) return false;

    lobby.players.delete(socketId);

    // If lobby is empty, clean it up
    if (lobby.players.size === 0) {
      this.lobbies.delete(code);
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

    const oldRandomColors = lobby.settings.randomColors;
    
    // Merge settings
    Object.assign(lobby.settings, partialSettings);
    
    // Regenerate colors if randomColors setting changed
    if ('randomColors' in partialSettings && partialSettings.randomColors !== oldRandomColors) {
      const playerIds = Array.from(lobby.players.values()).map(p => p.playerId);
      lobby.playerColors = this.generateColorAssignments(playerIds, partialSettings.randomColors);
    }
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
    if (connectedPlayers.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    lobby.phase = 'in_game';
    lobby.startedAt = Date.now();
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
    }, 30000); // 30 seconds
  }

  getPublicView(code) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const host = lobby.players.get(lobby.hostId);
    const players = Array.from(lobby.players.values()).map(player => ({
      playerId: player.playerId,
      name: player.name,
      connected: player.connected,
      color: lobby.playerColors[player.playerId] || 'White'
    }));

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

  // Helper methods for color management
  getPlayerColor(index, randomColors = false) {
    const colors = ['White', 'Black', 'Orange', 'Red'];
    if (randomColors) {
      return colors[Math.floor(Math.random() * colors.length)];
    }
    return colors[index % colors.length];
  }

  generateColorAssignments(playerIds, randomColors = false) {
    const colors = ['White', 'Black', 'Orange', 'Red'];
    let colorOrder = [...colors];
    
    if (randomColors) {
      // Shuffle colors
      for (let i = colorOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colorOrder[i], colorOrder[j]] = [colorOrder[j], colorOrder[i]];
      }
    }

    const colorMap = {};
    playerIds.forEach((playerId, index) => {
      colorMap[playerId] = colorOrder[index % colorOrder.length];
    });
    
    return colorMap;
  }
}