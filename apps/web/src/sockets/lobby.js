import socket, { saveLastRoom } from './socket.js'
import { LOBBY_EVENTS } from '../../constants/socket-events.js'

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
export function createLobby({ playerName }, { onCreated, onError, onPlayers, onLobbyState } = {}) {
  const playerId = getPlayerId();
  
  const handleError = (err) => onError?.(err);
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

  socket.emit(LOBBY_EVENTS.CREATE, { playerId, name: playerName }, (response) => {
    if (response?.code && onCreated) {
      onCreated({ code: response.code });
      saveLastRoom({ code: response.code, playerName });
    }
  });

  socket.on(LOBBY_EVENTS.ERROR, handleError);
  socket.on(LOBBY_EVENTS.STATE, handleState);

  return () => {
    socket.off(LOBBY_EVENTS.ERROR, handleError);
    socket.off(LOBBY_EVENTS.STATE, handleState);
  };
}

export function joinLobby({ code, playerName }, { onPlayers, onError, onLobbyState, onJoined } = {}) {
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
  
  // Use acknowledgement for better error handling
  socket.emit(LOBBY_EVENTS.JOIN, { code, playerId, name: playerName }, (response) => {
    if (response?.success) {
      onJoined?.({ success: true, player: response.player });
    } else {
      onError?.({ reason: 'JOIN_FAILED', details: response?.error || 'Failed to join lobby' });
    }
  });
  
  socket.on(LOBBY_EVENTS.STATE, handleState);
  socket.on(LOBBY_EVENTS.PLAYER_JOINED, handlePlayerJoined);
  socket.on(LOBBY_EVENTS.PLAYER_LEFT, handlePlayerLeft);
  socket.on(LOBBY_EVENTS.ERROR, handleError);

  return () => {
    socket.off(LOBBY_EVENTS.STATE, handleState);
    socket.off(LOBBY_EVENTS.PLAYER_JOINED, handlePlayerJoined);
    socket.off(LOBBY_EVENTS.PLAYER_LEFT, handlePlayerLeft);
    socket.off(LOBBY_EVENTS.ERROR, handleError);
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
  
  socket.emit(LOBBY_EVENTS.UPDATE_SETTINGS, { code, partialSettings: backendSettings });
  socket.on(LOBBY_EVENTS.ERROR, handleError);
  
  setTimeout(() => {
    socket.off(LOBBY_EVENTS.ERROR, handleError);
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
  socket.emit(LOBBY_EVENTS.JOIN, { code, playerId, name });
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
    socket.on(LOBBY_EVENTS.STATE, handleState);
    socket.on(LOBBY_EVENTS.SETTINGS_UPDATED, handleSettingsUpdated);
  }

  return () => {
    if (onSettings) {
      socket.off(LOBBY_EVENTS.STATE, handleState);
      socket.off(LOBBY_EVENTS.SETTINGS_UPDATED, handleSettingsUpdated);
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
  socket.emit(LOBBY_EVENTS.LEAVE, { code });
}

export function startGame({ code }, { onStarted, onError } = {}) {
  const handleStarted = (data) => onStarted?.(data);
  const handleError = (err) => onError?.(err);

  // Use acknowledgement for immediate feedback
  socket.emit(LOBBY_EVENTS.START_GAME, { code }, (response) => {
    if (response?.success) {
      // Game start confirmed by server
    } else {
      onError?.({ reason: 'START_FAILED', details: response?.error || 'Failed to start game' });
    }
  });
  
  socket.on(LOBBY_EVENTS.STARTED, handleStarted);
  socket.on(LOBBY_EVENTS.ERROR, handleError);

  // Clean up listeners
  setTimeout(() => {
    socket.off(LOBBY_EVENTS.STARTED, handleStarted);
    socket.off(LOBBY_EVENTS.ERROR, handleError);
  }, 10000);
}