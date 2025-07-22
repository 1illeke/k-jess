export function setupChatHandlers(socket, io, games) {
  socket.on('chat', ({ gameId, message, player }) => {
    if (games[gameId]) {
      const chatMsg = { id: Date.now(), player, message };
      games[gameId].chat.push(chatMsg);
      io.to(gameId).emit('chat', chatMsg);
    }
  });
} 