import { setupGameLogicHandlers } from './gameLogicHandlers.js';
import { setupChatHandlers } from './chatHandlers.js';
import { games, disconnectTimers } from './persistence.js';

export function setupGameHandlers(io) {
  io.on('connection', (socket) => {
    setupGameLogicHandlers(socket, io, games, disconnectTimers);
    setupChatHandlers(socket, io, games);
  });
} 