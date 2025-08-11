import socket from './socket.js'
import { CHAT_EVENTS } from '../../constants/socket-events.js'

// Emitters
export function sendMessage({ code, playerId, playerName, text }) {
  socket.emit(CHAT_EVENTS.SEND_MESSAGE, { code, playerId, playerName, text })
}

// Listeners
export function listenChat({ onMessage } = {}) {
  const handleMessage = (message) => onMessage?.(message)
  socket.on(CHAT_EVENTS.MESSAGE_RECEIVED, handleMessage)
  return () => {
    socket.off(CHAT_EVENTS.MESSAGE_RECEIVED, handleMessage)
  }
}

