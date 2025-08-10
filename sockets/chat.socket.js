import { appendMessage } from '../services/chat.service.js';

export function registerChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('sendMessage', ({ code, playerId, playerName, text } = {}) => {
      if (!code || !text) return;
      const message = {
        playerId: playerId || socket.id,
        playerName: playerName || 'Player',
        text: String(text).slice(0, 500),
        timestamp: Date.now(),
      };
      appendMessage(code, message);
      io.to(code).emit('messageReceived', message);
    });
  });
}