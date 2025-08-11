import { startTimer, pauseTimer, resetTimer, getElapsedSeconds, clearTimer } from '../services/timer.service.js';
import { TIMER_EVENTS } from '../constants/socket-events.js';

export function registerTimerSocket(io) {
  io.on('connection', (socket) => {
    socket.on(TIMER_EVENTS.START, ({ code } = {}) => {
      if (!code) return;
      startTimer(code, (elapsed) => {
        io.to(code).emit(TIMER_EVENTS.UPDATE, { code, elapsed });
      });
    });

    socket.on(TIMER_EVENTS.PAUSE, ({ code } = {}) => {
      if (!code) return;
      pauseTimer(code);
      io.to(code).emit(TIMER_EVENTS.UPDATE, { code, elapsed: getElapsedSeconds(code) });
    });

    socket.on(TIMER_EVENTS.RESET, ({ code } = {}) => {
      if (!code) return;
      resetTimer(code);
      io.to(code).emit(TIMER_EVENTS.UPDATE, { code, elapsed: 0 });
    });

    socket.on(TIMER_EVENTS.CLEAR, ({ code } = {}) => {
      if (!code) return;
      clearTimer(code);
    });
  });
}