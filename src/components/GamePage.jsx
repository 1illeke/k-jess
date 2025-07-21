import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Button, ThemeToggle, TwoPlayerBoard, ThreePlayerBoard, FourPlayerBoard } from './ui'
import './GamePage.css'

function GamePage() {
  const location = useLocation()
  const { gameId } = useParams() // Game ids tulevad siia
  const { gameMode = '1v1', playerName = 'Player1' } = location.state || {}
  
  const [gameTime, setGameTime] = useState(0) // hetkel visual lihtsalt
  const [isPaused, setIsPaused] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [pausedBy, setPausedBy] = useState('')
  const [chatMessages, setChatMessages] = useState([ // Fake chat moment
    { id: 1, player: 'Player1', message: 'Good luck!' },
    { id: 2, player: 'Player2', message: 'You too!' }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [chatMessagesRef, setChatMessagesRef] = useState(null)
  
  // Get that game mode
  const getPlayerCount = () => {
    switch(gameMode) {
      case '1v1': return 2
      case '1v1v1': return 3
      case '1v1v1v1': return 4
      default: return 2
    }
  }

  const [players] = useState(() => {
    const playerCount = getPlayerCount()
    return Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? playerName : `Player${i + 1}`,
      score: 1
    }))
  })

  // Show that game mode
  const renderBoard = () => {
    switch(gameMode) {
      case '1v1':
        return <TwoPlayerBoard />
      case '1v1v1':
        return <ThreePlayerBoard />
      case '1v1v1v1':
        return <FourPlayerBoard />
      default:
        return <TwoPlayerBoard />
    }
  }

  // Timer 
  useEffect(() => {
    let interval = null
    if (!isPaused) {
      interval = setInterval(() => {
        setGameTime(time => time + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPaused])

    // Timer shit
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }

  // Auto-scroll
  useEffect(() => {
    if (chatMessagesRef) {
      chatMessagesRef.scrollTop = chatMessagesRef.scrollHeight
    }
  }, [chatMessages, chatMessagesRef])

  const handlePause = () => {
    if (!isPaused) {
      // Pause the game and show modal
      setIsPaused(true)
      setPausedBy(playerName) // Who paused
      setModalType('pause')
      setShowModal(true)
      
      // Add pause message to chat
      const pauseMessage = {
        id: Date.now(),
        player: 'System',
        message: `${playerName} paused the game`
      }
      setChatMessages(prev => [...prev, pauseMessage])
    }
  }

  const handleResume = () => {
    setIsPaused(false)
    setShowModal(false)
    setModalType('')
    
    // Add resume message to chat
    const resumeMessage = {
      id: Date.now(),
      player: 'System',
      message: `Game resumed`
    }
    setChatMessages(prev => [...prev, resumeMessage])
  }

  const handleQuit = () => {
    setModalType('quit')
    setShowModal(true)
  }

  const handleConfirmQuit = () => {
    // Add quit message to chat
    const quitMessage = {
      id: Date.now(),
      player: 'System',
      message: `${playerName} left the game`
    }
    setChatMessages(prev => [...prev, quitMessage])
    
    setTimeout(() => {
      window.history.back()
    }, 500)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalType('')
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        player: 'Player1',
        message: newMessage.trim()
      }
      setChatMessages([...chatMessages, message])
      setNewMessage('')
    }
  }



  return (
    <div className="game-page">
      <ThemeToggle />
      
      <div className="game-container">
        {/* Left Column - Players and Chat */}
        <aside className="players-chat-section">
          {/* Players */}
          <div className="players-section">
            {players.map((player) => (
              <div key={player.id} className="player-info">
                <div className="player-name">{player.name}</div>
                <div className="player-score">Score: {player.score.toString().padStart(4, '0')}</div>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div className="chat-section">
            <div 
              className="chat-messages"
              ref={(el) => setChatMessagesRef(el)}
            >
              {chatMessages.map((msg) => (
                <div key={msg.id} className="chat-message">
                  <span className="chat-player">{msg.player}:</span>
                  <span className="chat-text">{msg.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type message..."
                className="chat-input"
                maxLength={100}
              />
            </form>
          </div>
        </aside>

        {/* Center Column - Game Board */}
        <main className="chess-section">
          {renderBoard()}
        </main>

        {/* Right Column - Timer and Controls */}
        <aside className="controls-section">
          <div className="timer-section">
            <div className="timer-display">{formatTime(gameTime)}</div>
          </div>
          
          <div className="game-controls">
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={handlePause}
              className="control-btn"
              disabled={isPaused}
            >
              [ {isPaused ? 'Game Paused' : 'Pause'} ]
            </Button>
            
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={handleQuit}
              className="control-btn"
            >
              [ Quit ]
            </Button>
          </div>
                  </aside>
        </div>

        {/* Game Modal */}
        {showModal && (
          <div className="pause-overlay">
            <div className="pause-modal-content">
              <h2 className="pause-title">
                {modalType === 'pause' 
                  ? `${pausedBy} paused the game`
                  : 'Do you want to quit?'
                }
              </h2>
              <div className="pause-buttons">
                <Button
                  variant="primary"
                  borderStyle="solid"
                  onClick={modalType === 'pause' ? handleResume : handleCloseModal}
                  className="pause-btn"
                >
                  [ Resume ]
                </Button>
                <Button
                  variant="secondary"
                  borderStyle="solid"
                  onClick={modalType === 'pause' ? handleQuit : handleConfirmQuit}
                  className="pause-btn"
                >
                  [ Quit ]
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

export default GamePage 