import { io } from 'socket.io-client'

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

// Auto-rejoin
socket.on('connect', () => {
  const last = getLastRoom()
  if (last?.code && last?.playerName) {
    // We use joinLobby for both lobby and in-game rooms since backend rooms use the lobby code
    socket.emit('joinLobby', { code: last.code, playerName: last.playerName })
  }
})

export function once(event, handler) {
  socket.once(event, handler)
}

export default socket

