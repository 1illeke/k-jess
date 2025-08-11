import socket from './socket.js'
import { GAME_EVENTS } from '../../constants/socket-events.js'

// Emitters
export function startGame({ code, settings }, { onStarted, onError } = {}) {
  const handleStarted = (payload) => onStarted?.(payload)
  const handleError = (payload) => onError?.(payload)

  // Use acknowledgement for immediate feedback
  socket.emit(GAME_EVENTS.START, { code, settings }, (response) => {
    if (response?.success) {
      onStarted?.(response);
    } else {
      onError?.({ reason: 'START_GAME_FAILED', details: response?.error || 'Failed to start game' });
    }
  })
  
  socket.once(GAME_EVENTS.STARTED, handleStarted)
  socket.once(GAME_EVENTS.ERROR, handleError)
}

export function joinGame({ code }, { onJoined, onError } = {}) {
  const handleJoined = (payload) => onJoined?.(payload)
  const handleError = (payload) => onError?.(payload)

  // Use acknowledgement for immediate feedback
  socket.emit(GAME_EVENTS.JOIN, { code }, (response) => {
    if (response?.success) {
      onJoined?.(response);
    } else {
      onError?.({ reason: 'JOIN_GAME_FAILED', details: response?.error || 'Failed to join game' });
    }
  })
  
  socket.once(GAME_EVENTS.JOINED, handleJoined)
  socket.once(GAME_EVENTS.ERROR, handleError)
}

export function pauseGame({ code, playerName }, { onPaused } = {}) {
  const handlePaused = (payload) => onPaused?.(payload)
  socket.emit(GAME_EVENTS.PAUSE, { code, playerName })
  socket.once(GAME_EVENTS.PAUSED, handlePaused)
}

export function resumeGame({ code, playerName }, { onResumed } = {}) {
  const handleResumed = (payload) => onResumed?.(payload)
  socket.emit(GAME_EVENTS.RESUME, { code, playerName })
  socket.once(GAME_EVENTS.RESUMED, handleResumed)
}

export function quitGame({ code, playerName }, { onEnded, onNavigate } = {}) {
  const handleEnded = (payload) => onEnded?.(payload)
  const handleNavigate = (payload) => onNavigate?.(payload)
  socket.emit(GAME_EVENTS.QUIT, { code, playerName })
  socket.once(GAME_EVENTS.ENDED, handleEnded)
  socket.once(GAME_EVENTS.NAVIGATE_AWAY, handleNavigate)
}

// Listeners
export function listenGame({ onStarted, onPaused, onResumed, onEnded } = {}) {
  if (onStarted) socket.on(GAME_EVENTS.STARTED, onStarted)
  if (onPaused) socket.on(GAME_EVENTS.PAUSED, onPaused)
  if (onResumed) socket.on(GAME_EVENTS.RESUMED, onResumed)
  if (onEnded) socket.on(GAME_EVENTS.ENDED, onEnded)
  return () => {
    if (onStarted) socket.off(GAME_EVENTS.STARTED, onStarted)
    if (onPaused) socket.off(GAME_EVENTS.PAUSED, onPaused)
    if (onResumed) socket.off(GAME_EVENTS.RESUMED, onResumed)
    if (onEnded) socket.off(GAME_EVENTS.ENDED, onEnded)
  }
}

