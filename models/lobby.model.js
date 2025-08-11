/**
 * Type defs and settings stuff for lobby/game
 */

/**
 * @typedef {Object} Player
 * @property {string} socketId - Current socket connection ID
 * @property {string} playerId - Client-stable player identifier
 * @property {string} name - Display name
 * @property {number} joinedAt - Timestamp when player joined (epoch ms)
 * @property {boolean} connected - Current connection status
 */

/**
 * @typedef {Object} LobbySettings
 * @property {string} mode - Game mode
 * @property {number} cooldownMs - Action cooldown in milliseconds
 * @property {number} maxPlayers - Maximum number of players (2-4)
 * @property {boolean} randomColors - Whether to use random colors for players
 */

/**
 * @typedef {Object} Lobby
 * @property {string} code - 5-digit lobby code
 * @property {string} hostId - Socket ID of the current host
 * @property {number} createdAt - Lobby creation timestamp (epoch ms)
 * @property {"lobby"|"in_game"|"ended"} phase - Current lobby phase
 * @property {LobbySettings} settings - Lobby configuration
 * @property {Map<string, Player>} players - Map of socket ID to player data
 * @property {Object.<string, string>} playerColors - Map of playerId to color assignments
 */

/**
 * @typedef {Object} PlayerPublic
 * @property {string} playerId - Client-stable player identifier
 * @property {string} name - Display name
 * @property {boolean} connected - Connection status
 */

/**
 * @typedef {Object} LobbyPublic
 * @property {string} code - 5-digit lobby code
 * @property {"lobby"|"in_game"|"ended"} phase - Current phase
 * @property {LobbySettings} settings - Lobby settings
 * @property {string} hostPlayerId - Host's player ID
 * @property {PlayerPublic[]} players - Array of public player data
 */

/**
 * Default settings for new lobbies
 */
export const DEFAULT_SETTINGS = {
  mode: '2 Player',
  cooldownMs: 1000,
  maxPlayers: 4,
  randomColors: false
};

/**
 * Valid lobby phases
 */
export const PHASES = {
  LOBBY: 'lobby',
  IN_GAME: 'in_game',
  ENDED: 'ended'
};

/**
 * Timing constants
 */
export const TIMING = {
  GRACE_PERIOD_MS: 120000, // 2 minutes for reconnection
  CLEANUP_DELAY_MS: 300000, // 5 minutes before cleaning empty lobbies
  HEARTBEAT_INTERVAL_MS: 10000 // 10 seconds between heartbeats
};