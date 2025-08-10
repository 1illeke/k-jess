import socket from './socket.js'

// emitters
export function startTimer({ code }) {
  socket.emit('startTimer', { code })
}

export function pauseTimer({ code }) {
  socket.emit('pauseTimer', { code })
}

export function resetTimer({ code }) {
  socket.emit('resetTimer', { code })
}

// Listeners
export function listenTimer({ onUpdate } = {}) {
  const handle = (payload) => onUpdate?.(payload)
  socket.on('timerUpdate', handle)
  return () => socket.off('timerUpdate', handle)
}

