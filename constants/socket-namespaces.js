/**
 * Socket.IO namespace constants for feature isolation
 */

export const NAMESPACES = {
  LOBBY: '/lobby',
  GAME: '/game', 
  CHAT: '/chat',
  TIMER: '/timer'
};

// Default namespace (for backward compatibility during migration)
export const DEFAULT_NAMESPACE = '/';

export const NAMESPACE_CONFIG = {
  [NAMESPACES.LOBBY]: {
    description: 'Lobby management - creating, joining, leaving lobbies',
    events: ['lobby:create', 'lobby:join', 'lobby:leave', 'lobby:updateSettings', 'lobby:startGame', 'lobby:end']
  },
  [NAMESPACES.GAME]: {
    description: 'Game session management - game lifecycle events',
    events: ['game:join', 'game:start', 'game:pause', 'game:resume', 'game:quit']
  },
  [NAMESPACES.CHAT]: {
    description: 'Chat functionality within lobbies and games',
    events: ['chat:sendMessage']
  },
  [NAMESPACES.TIMER]: {
    description: 'Timer functionality for games',
    events: ['timer:start', 'timer:pause', 'timer:reset', 'timer:clear']
  }
};