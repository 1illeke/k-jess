import socket from './socket.js'

// Emitters
export function sendMessage({ code, playerId, playerName, text }) {
  socket.emit('sendMessage', { code, playerId, playerName, text })
}

// Listeners
export function listenChat({ onMessage } = {}) {
  const handleMessage = (message) => onMessage?.(message)
  socket.on('messageReceived', handleMessage)
  return () => {
    socket.off('messageReceived', handleMessage)
  }
}

