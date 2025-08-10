import socket from './socket.js'

// Emitters
export function startGame({ code, settings }, { onStarted, onError } = {}) {
  const handleStarted = (payload) => onStarted?.(payload)
  const handleError = (payload) => onError?.(payload)

  socket.emit('startGame', { code, settings })
  socket.once('gameStarted', handleStarted)
  socket.once('gameError', handleError)
}

export function joinGame({ code }, { onJoined, onError } = {}) {
  const handleJoined = (payload) => onJoined?.(payload)
  const handleError = (payload) => onError?.(payload)

  socket.emit('joinGame', { code })
  socket.once('gameJoined', handleJoined)
  socket.once('gameError', handleError)
}

export function pauseGame({ code, playerName }, { onPaused } = {}) {
  const handlePaused = (payload) => onPaused?.(payload)
  socket.emit('pauseGame', { code, playerName })
  socket.once('gamePaused', handlePaused)
}

export function resumeGame({ code, playerName }, { onResumed } = {}) {
  const handleResumed = (payload) => onResumed?.(payload)
  socket.emit('resumeGame', { code, playerName })
  socket.once('gameResumed', handleResumed)
}

export function quitGame({ code, playerName }, { onEnded, onNavigate } = {}) {
  const handleEnded = (payload) => onEnded?.(payload)
  const handleNavigate = (payload) => onNavigate?.(payload)
  socket.emit('quitGame', { code, playerName })
  socket.once('gameEnded', handleEnded)
  socket.once('navigateAway', handleNavigate)
}

// Listeners
export function listenGame({ onStarted, onPaused, onResumed, onEnded } = {}) {
  if (onStarted) socket.on('gameStarted', onStarted)
  if (onPaused) socket.on('gamePaused', onPaused)
  if (onResumed) socket.on('gameResumed', onResumed)
  if (onEnded) socket.on('gameEnded', onEnded)
  return () => {
    if (onStarted) socket.off('gameStarted', onStarted)
    if (onPaused) socket.off('gamePaused', onPaused)
    if (onResumed) socket.off('gameResumed', onResumed)
    if (onEnded) socket.off('gameEnded', onEnded)
  }
}

