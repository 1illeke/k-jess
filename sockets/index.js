export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('disconnect', (reason) => {
    });
  });
}