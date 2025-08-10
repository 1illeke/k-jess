import { Server } from 'socket.io';
import http from 'http';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('K/Jess Socket.IO server running');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const games = {}; 
const disconnectTimers = {}; // { socketId: timeoutId }

io.on('connection', (socket) => {
  socket.on('joinGame', ({ gameId, playerName }) => {
    socket.join(gameId);
    if (!games[gameId]) {
      games[gameId] = { players: [], chat: [] };
    }
    // Remove any pending disconnect timer for this socket
    if (disconnectTimers[socket.id]) {
      clearTimeout(disconnectTimers[socket.id]);
      delete disconnectTimers[socket.id];
    }
    // Only add if not already present
    if (!games[gameId].players.some(p => p.id === socket.id)) {
      games[gameId].players.push({ id: socket.id, name: playerName });
    }
    io.to(gameId).emit('playerList', games[gameId].players);
  });


 // socket.on('move', ({ gameId, move }) => (movement of the pieces to be added)

  socket.on('chat', ({ gameId, message, player }) => {
    if (games[gameId]) {
      const chatMsg = { id: Date.now(), player, message };
      games[gameId].chat.push(chatMsg);
      io.to(gameId).emit('chat', chatMsg);
    }
  });

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
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 