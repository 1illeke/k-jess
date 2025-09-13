/**
 * Centralized socket event constants to prevent typos and clarify responsibilities
 * across lobby, game, chat, and timer channels.
 */

// Lobby events
export const LOBBY_EVENTS = {
  // Client to Server
  CREATE: 'lobby:create',
  JOIN: 'lobby:join',
  LEAVE: 'lobby:leave',
  UPDATE_SETTINGS: 'lobby:updateSettings',
  START_GAME: 'lobby:startGame',
  END: 'lobby:end',

  // Server to Client
  STATE: 'lobby:state',
  ERROR: 'lobby:error',
  HEARTBEAT: 'lobby:heartbeat',
  PLAYER_JOINED: 'lobby:playerJoined',
  PLAYER_LEFT: 'lobby:playerLeft',
  SETTINGS_UPDATED: 'lobby:settingsUpdated',
  STARTED: 'lobby:started',
  ENDED: 'lobby:ended'
};

// Game events
export const GAME_EVENTS = {
  // Client to Server
  JOIN: 'game:join',
  START: 'game:start',
  PAUSE: 'game:pause',
  RESUME: 'game:resume',
  QUIT: 'game:quit',
  MAKE_MOVE: 'game:makeMove',

  // Server to Client
  JOINED: 'game:joined',
  STARTED: 'game:started',
  PAUSED: 'game:paused',
  RESUMED: 'game:resumed',
  ENDED: 'game:ended',
  ERROR: 'game:error',
  MOVE_MADE: 'game:moveMade',
  GAME_STATE: 'game:gameState',
  
  // Navigation
  NAVIGATE_AWAY: 'game:navigateAway'
};

// Timer events
export const TIMER_EVENTS = {
  // Client to Server
  START: 'timer:start',
  PAUSE: 'timer:pause',
  RESET: 'timer:reset',
  CLEAR: 'timer:clear',

  // Server to Client
  UPDATE: 'timer:update'
};

// Chat events
export const CHAT_EVENTS = {
  // Client to Server
  SEND_MESSAGE: 'chat:sendMessage',

  // Server to Client
  MESSAGE_RECEIVED: 'chat:messageReceived'
};

// Connection events
export const CONNECTION_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Legacy rejoin event (to be deprecated)
  JOIN_LOBBY_LEGACY: 'joinLobby'
};

// Event payload schemas for validation
export const EVENT_SCHEMAS = {
  [LOBBY_EVENTS.CREATE]: {
    required: ['playerId', 'name'],
    optional: ['settings']
  },
  [LOBBY_EVENTS.JOIN]: {
    required: ['code', 'playerId', 'name'],
    optional: []
  },
  [LOBBY_EVENTS.LEAVE]: {
    required: ['code'],
    optional: []
  },
  [LOBBY_EVENTS.UPDATE_SETTINGS]: {
    required: ['code', 'partialSettings'],
    optional: []
  },
  [LOBBY_EVENTS.START_GAME]: {
    required: ['code'],
    optional: []
  },
  [LOBBY_EVENTS.END]: {
    required: ['code'],
    optional: []
  },
  [GAME_EVENTS.JOIN]: {
    required: ['code'],
    optional: []
  },
  [GAME_EVENTS.START]: {
    required: ['code'],
    optional: ['settings']
  },
  [GAME_EVENTS.PAUSE]: {
    required: ['code'],
    optional: ['playerName']
  },
  [GAME_EVENTS.RESUME]: {
    required: ['code'],
    optional: ['playerName']
  },
  [GAME_EVENTS.QUIT]: {
    required: ['code'],
    optional: ['playerName']
  },
  [GAME_EVENTS.MAKE_MOVE]: {
    required: ['code', 'from', 'to'],
    optional: ['playerOrientation']
  },
  [TIMER_EVENTS.START]: {
    required: ['code'],
    optional: []
  },
  [TIMER_EVENTS.PAUSE]: {
    required: ['code'],
    optional: []
  },
  [TIMER_EVENTS.RESET]: {
    required: ['code'],
    optional: []
  },
  [TIMER_EVENTS.CLEAR]: {
    required: ['code'],
    optional: []
  },
  [CHAT_EVENTS.SEND_MESSAGE]: {
    required: ['code', 'text'],
    optional: ['playerId', 'playerName']
  }
};

export const ALL_EVENTS = {
  ...LOBBY_EVENTS,
  ...GAME_EVENTS,
  ...TIMER_EVENTS,
  ...CHAT_EVENTS,
  ...CONNECTION_EVENTS
};