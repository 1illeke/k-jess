import { io } from 'socket.io-client'
import { LOBBY_EVENTS, CONNECTION_EVENTS } from '../../constants/socket-events.js'

const DEFAULT_URL = 'http://localhost:3001' // need to change for prod
const SOCKET_URL = import.meta?.env?.VITE_SOCKET_URL ?? DEFAULT_URL

const LAST_ROOM_KEY = 'kjess:lastRoom'

export function saveLastRoom(room) {
  try {
    localStorage.setItem(LAST_ROOM_KEY, JSON.stringify(room))
  } catch {}
}

export function getLastRoom() {
  try {
    const raw = localStorage.getItem(LAST_ROOM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearLastRoom() {
  try { localStorage.removeItem(LAST_ROOM_KEY) } catch {}
}

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  transports: ['websocket']
})

// Auto-rejoin with error handling
socket.on('connect', () => {
  const last = getLastRoom()
  if (last?.code && last?.playerName) {
    // Get stable player ID for rejoin
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('playerId', playerId);
    }
    
    // Use acknowledgement to handle rejoin errors gracefully
    socket.emit(LOBBY_EVENTS.JOIN, { 
      code: last.code, 
      playerId, 
      name: last.playerName 
    }, (response) => {
      if (!response?.success) {
        // Lobby doesn't exist anymore, clear the last room
        console.log('Failed to rejoin lobby, clearing last room:', response?.error);
        clearLastRoom();
      }
    });
    
    // Also listen for errors and clear last room on failure
    const errorHandler = (error) => {
      if (error?.reason === 'NOT_FOUND' || error?.details?.includes('not found')) {
        console.log('Lobby not found during rejoin, clearing last room');
        clearLastRoom();
        socket.off(LOBBY_EVENTS.ERROR, errorHandler);
      }
    };
    
    socket.once(LOBBY_EVENTS.ERROR, errorHandler);
    
    // Clean up error handler after a timeout
    setTimeout(() => {
      socket.off(LOBBY_EVENTS.ERROR, errorHandler);
    }, 5000);
  }
})

export function once(event, handler) {
  socket.once(event, handler)
}

export default socket

