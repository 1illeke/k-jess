import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { registerSocketHandlers } from './sockets/index.js';
import { registerLobbySocket } from './sockets/lobby.socket.js';
import { registerGameSocket } from './sockets/game.socket.js';
import { registerChatSocket } from './sockets/chat.socket.js';
import { registerTimerSocket } from './sockets/timer.socket.js';
import lobbyRoutes from './routes/lobby.routes.js';

const app = express();

// Middleware
app.use(express.json({ limit: '2mb' })); // JSON body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// CORS handling for REST endpoints
app.use((req, res, next) => {
  const allowedOrigins = env.corsOrigins;
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Basic health endpoint
app.get('/', (_req, res) => {
  res.status(200).send('K/Jess server running');
});

// API routes
app.use('/api', lobbyRoutes);

// Global error handler for REST endpoints
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: 'An internal server error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: 'NOT_FOUND',
    message: 'Endpoint not found'
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Socket.IO configuration
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Wire socket handlers
registerSocketHandlers(io);
registerLobbySocket(io);
registerGameSocket(io);
registerChatSocket(io);
registerTimerSocket(io);

// Global socket error handler
io.engine.on('connection_error', (err) => {
  console.error('Socket connection error:', err);
});

server.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  console.log(`CORS origins: ${env.corsOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

export { io };