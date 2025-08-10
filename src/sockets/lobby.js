import socket, { saveLastRoom } from './socket.js'

// get stable player ID
function getPlayerId() {
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('playerId', playerId);
  }
  return playerId;
}

function transformPlayers(lobbyPublic) {
  if (!lobbyPublic?.players) return [];
  return lobbyPublic.players.map(player => ({
    id: player.playerId, // Use playerId as id 
    name: player.name,
    connected: player.connected,
  }));
}

// Emitters
export function createLobby({ playerName }, { onCreated, onError, onPlayers } = {}) {
  const playerId = getPlayerId();
  
  const handleError = (err) => onError?.(err);

  // only use ACK callback for creation, dont listen to lobby:state for creation
  socket.emit('lobby:create', { playerId, name: playerName }, (response) => {
    if (response?.code && onCreated) {
      onCreated({ code: response.code });
      saveLastRoom({ code: response.code, playerName });
    }
  });

  socket.on('lobby:error', handleError);

  return () => {
    socket.off('lobby:error', handleError);
  };
}

export function joinLobby({ code, playerName }, { onPlayers, onError, onLobbyState } = {}) {
  const playerId = getPlayerId();
  
  const handleState = (data) => {
    const { lobbyPublic } = data || {};
    if (lobbyPublic) {
      if (onPlayers) {
        onPlayers(transformPlayers(lobbyPublic));
      }
      if (onLobbyState) {
        onLobbyState(lobbyPublic);
      }
    }
  };

  const handlePlayerJoined = (data) => {
    // Refresh the full state when a player joins
    // The lobby:state event will provide the complete player list
  };

  const handlePlayerLeft = (data) => {
    // Refresh the full state when a player leaves
    // The lobby:state event will provide the complete player list
  };

  const handleError = (err) => onError?.(err);

  saveLastRoom({ code, playerName });
  
  socket.emit('lobby:join', { code, playerId, name: playerName });
  
  socket.on('lobby:state', handleState);
  socket.on('lobby:playerJoined', handlePlayerJoined);
  socket.on('lobby:playerLeft', handlePlayerLeft);
  socket.on('lobby:error', handleError);

  return () => {
    socket.off('lobby:state', handleState);
    socket.off('lobby:playerJoined', handlePlayerJoined);
    socket.off('lobby:playerLeft', handlePlayerLeft);
    socket.off('lobby:error', handleError);
  };
}

export function updateSettings({ code, settings }, { onError } = {}) {
  const handleError = (err) => onError?.(err);
  const backendSettings = {
    mode: '2 Player',
    maxPlayers: getMaxPlayersFromMode(settings.mode),
    cooldownMs: 1000,
    randomColors: settings.randomColors
  };
  
  socket.emit('lobby:updateSettings', { code, partialSettings: backendSettings });
  socket.on('lobby:error', handleError);
  
  setTimeout(() => {
    socket.off('lobby:error', handleError);
  }, 5000);
}

function getMaxPlayersFromMode(mode) {
  switch (mode) {
    case '1v1': return 2;
    case '1v1v1': return 3;
    case '1v1v1v1': return 4;
    default: return 4;
  }
}

export function updatePlayerName({ code, name }, { onError } = {}) {
  // Player name updates are handled through lobby:join with updated name
  const playerId = getPlayerId();
  socket.emit('lobby:join', { code, playerId, name });
}

export function listenLobby({ onPlayers, onSettings } = {}) {
  const handleState = (data) => {
    const { lobbyPublic } = data || {};
    if (lobbyPublic) {
      if (onPlayers) {
        onPlayers(transformPlayers(lobbyPublic));
      }
      if (onSettings) {
        const frontendSettings = {
          mode: getModeFromMaxPlayers(lobbyPublic.settings?.maxPlayers || 4),
          randomColors: lobbyPublic.settings?.randomColors || false
        };
        onSettings(frontendSettings);
      }
    }
  };

  const handleSettingsUpdated = (data) => {
    if (onSettings && data?.settings) {
      const frontendSettings = {
        mode: getModeFromMaxPlayers(data.settings.maxPlayers || 4),
        randomColors: data.settings.randomColors || false
      };
      onSettings(frontendSettings);
    }
  };

  // Only listen for settings, not state (to avoid conflicts with join/create)
  if (onSettings) {
    socket.on('lobby:state', handleState);
    socket.on('lobby:settingsUpdated', handleSettingsUpdated);
  }

  return () => {
    if (onSettings) {
      socket.off('lobby:state', handleState);
      socket.off('lobby:settingsUpdated', handleSettingsUpdated);
    }
  };
}

function getModeFromMaxPlayers(maxPlayers) {
  switch (maxPlayers) {
    case 2: return '1v1';
    case 3: return '1v1v1';
    case 4: return '1v1v1v1';
    default: return '1v1v1v1';
  }
}

export function leaveLobby({ code }) {
  socket.emit('lobby:leave', { code });
}

export function startGame({ code }, { onStarted, onError } = {}) {
  const handleStarted = (data) => onStarted?.(data);
  const handleError = (err) => onError?.(err);

  socket.emit('lobby:startGame', { code });
  socket.on('lobby:started', handleStarted);
  socket.on('lobby:error', handleError);

  // Clean up listeners
  setTimeout(() => {
    socket.off('lobby:started', handleStarted);
    socket.off('lobby:error', handleError);
  }, 10000);
}