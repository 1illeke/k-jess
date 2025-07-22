import { Server } from 'socket.io';
import http from 'http';
import { setupGameHandlers } from './gameHandlers.js';

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

setupGameHandlers(io);

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 