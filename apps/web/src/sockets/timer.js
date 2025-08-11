import socket from './socket.js'
import { TIMER_EVENTS } from '../../constants/socket-events.js'

// emitters
export function startTimer({ code }) {
  socket.emit(TIMER_EVENTS.START, { code })
}

export function pauseTimer({ code }) {
  socket.emit(TIMER_EVENTS.PAUSE, { code })
}

export function resetTimer({ code }) {
  socket.emit(TIMER_EVENTS.RESET, { code })
}

// Listeners
export function listenTimer({ onUpdate } = {}) {
  const handle = (payload) => onUpdate?.(payload)
  socket.on(TIMER_EVENTS.UPDATE, handle)
  return () => socket.off(TIMER_EVENTS.UPDATE, handle)
}

