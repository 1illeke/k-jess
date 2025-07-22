// Game logic socket logic
export function setupGameLogicHandlers(socket, io, games, disconnectTimers) {
  socket.on('joinGame', ({ gameId, playerName }) => {
    socket.join(gameId);
    if (!games[gameId]) {
      games[gameId] = { players: [], chat: [] };
    }
    if (disconnectTimers[socket.id]) {
      clearTimeout(disconnectTimers[socket.id]);
      delete disconnectTimers[socket.id];
    }
    if (!games[gameId].players.some(p => p.id === socket.id)) {
      games[gameId].players.push({ id: socket.id, name: playerName });
    }
    io.to(gameId).emit('playerList', games[gameId].players);
  });

  // TODO: Add move event handler here

  socket.on('disconnect', () => {
    disconnectTimers[socket.id] = setTimeout(() => {
      for (const gameId in games) {
        const idx = games[gameId].players.findIndex(p => p.id === socket.id);
        if (idx !== -1) {
          games[gameId].players.splice(idx, 1);
          io.to(gameId).emit('playerList', games[gameId].players);
        }
      }
      delete disconnectTimers[socket.id];
    }, 10000);
  });
} 