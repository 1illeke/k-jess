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

export function makeMove({ code, from, to, playerOrientation }, { onMoveMade, onError, onPromotionRequired } = {}) {
  const handleMoveMade = (payload) => onMoveMade?.(payload)
  const handleError = (payload) => onError?.(payload)
  const handlePromotionRequired = (payload) => onPromotionRequired?.(payload)

  // Use acknowledgement for immediate feedback
  socket.emit(GAME_EVENTS.MAKE_MOVE, { code, from, to, playerOrientation }, (response) => {
    if (response?.success) {
      onMoveMade?.(response);
    } else if (response?.requiresPromotion) {
      onPromotionRequired?.({ from, to });
    } else {
      onError?.({ reason: 'MOVE_FAILED', details: response?.error || 'Failed to make move' });
    }
  })
  
  socket.once(GAME_EVENTS.MOVE_MADE, handleMoveMade)
  socket.once(GAME_EVENTS.ERROR, handleError)
}

export function makePromotionMove({ code, from, to, promotionPiece, playerOrientation }, { onMoveMade, onError } = {}) {
  console.log('makePromotionMove called with:', { code, from, to, promotionPiece, playerOrientation })
  const handleMoveMade = (payload) => onMoveMade?.(payload)
  const handleError = (payload) => onError?.(payload)

  // Use acknowledgement for immediate feedback
  socket.emit(GAME_EVENTS.PAWN_PROMOTION, { code, from, to, promotionPiece, playerOrientation }, (response) => {
    console.log('makePromotionMove response:', response)
    if (response?.success) {
      onMoveMade?.(response);
    } else {
      onError?.({ reason: 'PROMOTION_FAILED', details: response?.error || 'Failed to make promotion move' });
    }
  })
  
  socket.once(GAME_EVENTS.MOVE_MADE, handleMoveMade)
  socket.once(GAME_EVENTS.ERROR, handleError)
}

// Listeners
export function listenGame({ 
  onStarted, 
  onPaused, 
  onResumed, 
  onEnded, 
  onMoveMade, 
  onGameState,
  onCheck,
  onCheckmate,
  onStalemate,
  onGameOver
} = {}) {
  if (onStarted) socket.on(GAME_EVENTS.STARTED, onStarted)
  if (onPaused) socket.on(GAME_EVENTS.PAUSED, onPaused)
  if (onResumed) socket.on(GAME_EVENTS.RESUMED, onResumed)
  if (onEnded) socket.on(GAME_EVENTS.ENDED, onEnded)
  if (onMoveMade) socket.on(GAME_EVENTS.MOVE_MADE, onMoveMade)
  if (onGameState) socket.on(GAME_EVENTS.GAME_STATE, onGameState)
  if (onCheck) socket.on(GAME_EVENTS.CHECK, onCheck)
  if (onCheckmate) socket.on(GAME_EVENTS.CHECKMATE, onCheckmate)
  if (onStalemate) socket.on(GAME_EVENTS.STALEMATE, onStalemate)
  if (onGameOver) socket.on(GAME_EVENTS.GAME_OVER, onGameOver)
  
  return () => {
    if (onStarted) socket.off(GAME_EVENTS.STARTED, onStarted)
    if (onPaused) socket.off(GAME_EVENTS.PAUSED, onPaused)
    if (onResumed) socket.off(GAME_EVENTS.RESUMED, onResumed)
    if (onEnded) socket.off(GAME_EVENTS.ENDED, onEnded)
    if (onMoveMade) socket.off(GAME_EVENTS.MOVE_MADE, onMoveMade)
    if (onGameState) socket.off(GAME_EVENTS.GAME_STATE, onGameState)
    if (onCheck) socket.off(GAME_EVENTS.CHECK, onCheck)
    if (onCheckmate) socket.off(GAME_EVENTS.CHECKMATE, onCheckmate)
    if (onStalemate) socket.off(GAME_EVENTS.STALEMATE, onStalemate)
    if (onGameOver) socket.off(GAME_EVENTS.GAME_OVER, onGameOver)
  }
}

