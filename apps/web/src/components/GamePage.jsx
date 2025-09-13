import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { Button, ThemeToggle, TwoPlayerBoard, ThreePlayerBoard, FourPlayerBoard } from './ui'
import './GamePage.css'
import { gameSocket, chatSocket, timerSocket } from '../sockets'
import socket from '../sockets/socket.js'
import { LOBBY_EVENTS } from '../../constants/socket-events.js'

function GamePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { gameId } = useParams()
  const gameMode = location.state?.gameMode ?? '1v1'
  const playerName = location.state?.playerName || localStorage.getItem('playerName') || 'Player1'
  const lobbyPublic = location.state?.lobbyPublic || location.state?.lobbyPlayers || []
  const gameSettings = location.state?.gameSettings || {}


  const [gameTime, setGameTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [pausedBy, setPausedBy] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [chatMessages, setChatMessages] = useState(() => [])
  const [newMessage, setNewMessage] = useState('')
  const [gamePlayers, setGamePlayers] = useState(() => {
    return lobbyPublic.map(player => ({
      id: player.id || player.playerId,
      name: player.name,
      connected: player.connected !== false,
      color: player.color || 'White' // Use server-assigned color or default
    }));
  })
  const chatMessagesRef = useRef(null)

  // Get stable player ID (unique per tab)
  const getPlayerId = () => {
    // Use sessionStorage instead of localStorage to make it unique per tab
    let playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('playerId', playerId);
    }
    return playerId;
  }

  // Load timer updates from backend
  useEffect(() => {
    const stopTimer = timerSocket.listenTimer({
      onUpdate: ({ code, elapsed }) => {
        const currentCode = gameId ? gameId : 'default'
        if (currentCode === code) setGameTime(elapsed)
      }
    })
    return () => stopTimer && stopTimer()
  }, [gameId])

  // Countdown effect - start timer after 3 seconds
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCountdown(null)
      // Start the actual timer
      timerSocket.startTimer({ code: gameId || 'default' })
    }
  }, [countdown, gameId])

  // Listen to lobby start
  useEffect(() => {
    if (!gameId) return;

    const handleLobbyStarted = ({ settings }) => {
      // countdown
      setIsPaused(false)
      setCountdown(3)
    }

    socket.on(LOBBY_EVENTS.STARTED, handleLobbyStarted);
    
    return () => {
      socket.off(LOBBY_EVENTS.STARTED, handleLobbyStarted);
    }
  }, [gameId])

  // Listen to game lifecycle
  useEffect(() => {
    const stopGame = gameSocket.listenGame({
      onStarted: ({ code }) => {
        const currentCode = gameId ? gameId : 'default'
        if (currentCode === code) {
          setIsPaused(false)
          setCountdown(3)
        }
      },
      onPaused: ({ code, pausedBy }) => {
        const currentCode = gameId ? gameId : 'default'
        if (currentCode === code) {
          setIsPaused(true)
          setPausedBy(pausedBy || 'Unknown Player')
          setModalType('pause')
          setShowModal(true)
          timerSocket.pauseTimer({ code })
        }
      },
      onResumed: ({ code, resumedBy }) => {
        const currentCode = gameId ? gameId : 'default'
        if (currentCode === code) {
          setIsPaused(false)
          setShowModal(false)
          setModalType('')
          timerSocket.startTimer({ code })
        }
      },
      onEnded: ({ code }) => {
        const currentCode = gameId ? gameId : 'default'
        if (currentCode === code) {
          // end logic needs to be updated
        }
      }
    })
    return () => stopGame && stopGame()
  }, [gameId, playerName])

  useEffect(() => {
    if (gameId) {
      socket.emit(LOBBY_EVENTS.JOIN, { 
        code: gameId, 
        playerId: getPlayerId(), 
        name: playerName 
      }, (response) => {
        if (!response?.success) {
          console.error('Failed to join lobby:', response?.error);
          // Navigate back to home if lobby doesn't exist
          navigate('/', { 
            state: { 
              error: 'Lobby not found or expired',
              playerName 
            } 
          });
        }
      });
      
      gameSocket.joinGame({ code: gameId }, {
        onJoined: () => {},
        onError: (err) => {
          console.error('Failed to join game:', err);
          // Navigate back to home if game doesn't exist
          navigate('/', { 
            state: { 
              error: 'Game not found or expired',
              playerName 
            } 
          });
        }
      });
      const handleLobbyState = (data) => {
        const { lobbyPublic } = data || {};
        if (lobbyPublic?.players) {
          const players = lobbyPublic.players.map(player => ({
            id: player.playerId,
            name: player.name,
            connected: player.connected,
            color: player.color || 'White' // Use server-assigned color
          }));
          setGamePlayers(players);
        }
        
        // Check if lobby is already in game phase and start countdown if needed
        if (lobbyPublic?.phase === 'in_game' && countdown === null && !isPaused) {
          setCountdown(3);
        }
      };

      socket.on('lobby:state', handleLobbyState);

      return () => {
        socket.off('lobby:state', handleLobbyState);
      };
    }
  }, [gameId, playerName]);

  // Chat
  useEffect(() => {
    const stopChat = chatSocket.listenChat({
      onMessage: (msg) => {
        setChatMessages((prev) => [...prev, msg])
      }
    })
    return () => stopChat && stopChat()
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  const handlePause = () => {
    if (!isPaused) {
      gameSocket.pauseGame({ code: gameId || 'default', playerName }, { onPaused: () => {} })
    }
  }

  const handleResume = () => {
    gameSocket.resumeGame({ code: gameId || 'default', playerName }, { onResumed: () => {} })
  }

  const handleQuit = () => {
    setModalType('quit')
    setShowModal(true)
  }

  const handleConfirmQuit = () => {
    gameSocket.quitGame(
      { code: gameId || 'default', playerName },
      {
        onEnded: () => {},
        onNavigate: () => {
          setTimeout(() => {
            if (gameId) {
              // Navigate to the lobby page for this game
              navigate(`/lobby/${gameId}`, { 
                state: { 
                  playerName,
                  inviteCode: gameId 
                } 
              });
            } else {
              // Fallback to home if no gameId
              navigate('/');
            }
          }, 300)
        }
      }
    )
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalType('')
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      chatSocket.sendMessage({ 
        code: gameId || 'default', 
        playerId: getPlayerId(),
        playerName, 
        text: newMessage.trim() 
      })
      setNewMessage('')
    }
  }

  // Get player orientation based on their position in the lobby
  const getPlayerOrientation = () => {
    const playerId = getPlayerId()
    const playerIndex = gamePlayers.findIndex(p => p.id === playerId)
    
    // For 2-player games: first player is BOTTOM, second is TOP
    if (gamePlayers.length === 2) {
      return playerIndex === 0 ? 2 : 0 // BOTTOM : TOP
    }
    
    // For 4-player games: assign orientations in order
    if (gamePlayers.length === 4) {
      return playerIndex // 0: TOP, 1: RIGHT, 2: BOTTOM, 3: LEFT
    }
    
    return 2 // Default to BOTTOM
  }

  const renderBoard = () => {
    switch(gameMode) {
      case '1v1':
        return <TwoPlayerBoard 
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          boardSize={gameSettings.boardSize || 8}
        />
      case '1v1v1':
        return <ThreePlayerBoard />
      case '1v1v1v1':
        return <FourPlayerBoard />
      default:
        return <TwoPlayerBoard 
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          boardSize={gameSettings.boardSize || 8}
        />
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

	//function loop() {
	//	console.log("frame")
	//	requestAnimationFrame(loop)
	//}
	//useEffect(() => {
	//	loop()
	//}, [])

  return (
    <div className="game-page">
      <ThemeToggle />
      <div className="game-container">
        {/* Left Column - Players and Chat */}
        <aside className="players-chat-section">
          <div className="players-section">
            <h3 className="players-title">Players ({gamePlayers.length})</h3>
            <div className="players-list">
              {gamePlayers.map((player) => (
                <div key={player.id} className={`game-player ${!player.connected ? 'offline' : ''}`}>
                  <span className="player-name">
                    {player.name}
                    {player.id === getPlayerId() && (
                      <span className="you-tag">(You)</span>
                    )}
                  </span>
                  <div className="player-status">
                    {player.connected ? 'Online' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Chat */}
          <div className="chat-section">
            <div 
              className="chat-messages"
              ref={chatMessagesRef}
            >
              {chatMessages.map((msg, idx) => (
                <div key={`${msg.timestamp}-${idx}`} className="chat-message">
                  <span className="chat-player">{msg.playerName}:</span>
                  <span className="chat-text">{msg.text}</span>
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
            {countdown ? (
              <div className="countdown-display">Starting in {countdown}...</div>
            ) : (
              <div className="timer-display">{formatTime(gameTime)}</div>
            )}
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
      {/* Game Modal - Only for Pause and Quit */}
      {showModal && modalType !== 'countdown' && (
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
/*
                                                                            @@                                      
                                                                            @@                                      
                  This code is Pissing me off...                          @@::@@                                    
                  I'm the original    Starwalker                          @@::@@                                    
                                                                        @@==::==@@                                  
                                                                        @@::::::@@                                  
                                                                      @@**::::::**@@                                
                                                                    @@##::::::::::##@@                              
                                                              @@@@@@@@========::::::%%@@                            
                                                              @@@@@@@@@@@@@@@@::::::::@@                            
                                                        @@@@@@::::@@    @@@@@@@@@@@@@@@@@@@@                        
                                                    @@@@::::::::::::@@        @@  @@@@  @@@@@@@@                    
                                                        @@@@::::::::::@@@@@@@@::@@        @@::::@@@@                
                                                            @@@@@@::::::::::::::::@@@@@@@@::::::::::@@@@@@          
                                                                  @@::::::::::::::::::::::::::::::::::::::@@@@@@@@@@
                                                                  @@::::::::::::::::::::::::::::::::@@@@@@          
                                                                  @@::::::::::::::::::::::::::::@@@@                
                                                                  @@::::::::::%%%%::::::::::::%%@@@@                
                                                                  @@::::::::::@@@@::::::::::::@@                    
                                                                @@**::::::::**@@@@::::::::::**@@                    
                                                                @@::::::::::@@  @@::::::::++@@                      
                                                                @@::::::::==@@  @@::::::::@@                        
                                                                @@::::::::@@    @@::::::::@@                        
                                                                @@::::::::@@    @@::::::@@                          
                                                              @@::::::::@@    @@::::::::@@                          
                                                              @@::::::::@@    @@::::::::@@                          
                                                              @@::::::@@      @@::::::@@                            
                                                            @@::::::::@@      @@::::::@@                            
                                                            @@::::::@@      @@::::::::@@                            
                                                          @@--::::::@@      @@::::::@@                              
                                                          @@::::::::@@      @@::::::@@                              
                                                        @@++::::::##@@    @@++::::::@@                              
                                              @@@@@@@@@@@@::::::::@@      @@::::::::@@                              
                                            @@############::::::++@@      @@::::::++@@                              
                                          @@%%::::::::::::::::::@@      @@%%::::::@@@@@@@@@@                        
                                          @@::::::::::::::::::::@@      @@::::::::@@@@@@@@@@                        
                                          @@@@@@@@@@@@@@@@@@@@@@        @@::::::::::::::::::@@                      
                                                                      @@::::::::::::::::::::@@                      
                                                                      @@@@@@@@@@@@@@@@@@@@@@  
                                          
*/
