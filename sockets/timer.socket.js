import { startTimer, pauseTimer, resetTimer, getElapsedSeconds, clearTimer } from '../services/timer.service.js';

export function registerTimerSocket(io) {
  io.on('connection', (socket) => {
    socket.on('startTimer', ({ code } = {}) => {
      if (!code) return;
      startTimer(code, (elapsed) => {
        io.to(code).emit('timerUpdate', { code, elapsed });
      });
    });

    socket.on('pauseTimer', ({ code } = {}) => {
      if (!code) return;
      pauseTimer(code);
      io.to(code).emit('timerUpdate', { code, elapsed: getElapsedSeconds(code) });
    });

    socket.on('resetTimer', ({ code } = {}) => {
      if (!code) return;
      resetTimer(code);
      io.to(code).emit('timerUpdate', { code, elapsed: 0 });
    });

    socket.on('clearTimer', ({ code } = {}) => {
      if (!code) return;
      clearTimer(code);
    });
  });
}