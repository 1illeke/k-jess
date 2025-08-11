import { appendMessage } from '../services/chat.service.js';
import { CHAT_EVENTS } from '../constants/socket-events.js';

export function registerChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on(CHAT_EVENTS.SEND_MESSAGE, ({ code, playerId, playerName, text } = {}) => {
      if (!code || !text) return;
      const message = {
        playerId: playerId || socket.id,
        playerName: playerName || 'Player',
        text: String(text).slice(0, 500),
        timestamp: Date.now(),
      };
      appendMessage(code, message);
      io.to(code).emit(CHAT_EVENTS.MESSAGE_RECEIVED, message);
    });
  });
}