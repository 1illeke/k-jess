import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { Button, FeedbackModal, TwoPlayerBoard, ThreePlayerBoard, FourPlayerBoard } from './ui'
import './GamePage.css'
import { gameSocket, chatSocket, timerSocket } from '../sockets'
import socket from '../sockets/socket.js'
import { LOBBY_EVENTS } from '../../constants/socket-events.js'
import { useSound } from '../contexts/SoundContext'

function GamePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { gameId } = useParams()
  const gameMode = location.state?.gameMode ?? '1v1'
  const playerName = location.state?.playerName || localStorage.getItem('playerName') || 'Player1'
  const lobbyPublic = location.state?.lobbyPublic || location.state?.lobbyPlayers || []
  const gameSettings = location.state?.gameSettings || {}
  const { isMuted, actions: soundActions } = useSound()


  const [gameTime, setGameTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [pausedBy, setPausedBy] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [gameOverData, setGameOverData] = useState(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [chatMessages, setChatMessages] = useState(() => [])
  const [newMessage, setNewMessage] = useState('')
  const [materialCount, setMaterialCount] = useState({})
  const [gamePlayers, setGamePlayers] = useState(() => {
    return lobbyPublic.map(player => ({
      id: player.id || player.playerId,
      name: player.name,
      connected: player.connected !== false,
      color: player.color || 'White' // Use server-assigned color or default
    }));
  })
  const [playerOrientation, setPlayerOrientation] = useState(null) // Store server-provided orientation
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
        if (currentCode === code) {
          setGameTime(elapsed)
        }
      }
    })
    
    // Test timer start immediately when component mounts
    if (gameId) {
      setTimeout(() => {
        timerSocket.startTimer({ code: gameId });
      }, 1000);
    }
    
    return () => stopTimer && stopTimer()
  }, [gameId])

  // Countdown effect - start timer after 3 seconds
  useEffect(() => {
    if (countdown && countdown > 0) {
      console.log(`Countdown: ${countdown}`);
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      console.log('Countdown finished, timer should already be running on server');
      setCountdown(null)
      // Timer is already running on server, no need to start it
    }
  }, [countdown, gameId])

  // Listen to lobby start
  useEffect(() => {
    if (!gameId) return;

    const handleLobbyStarted = ({ settings }) => {
      // This is a new game start, always start countdown
      console.log('Lobby started event received, starting countdown');
      setIsPaused(false)
      setCountdown(3)
    }

    socket.on(LOBBY_EVENTS.STARTED, handleLobbyStarted);

    return () => {
      socket.off(LOBBY_EVENTS.STARTED, handleLobbyStarted);
    }
  }, [gameId])

  // Debug countdown state
  useEffect(() => {
    console.log('Countdown state changed:', countdown);
  }, [countdown])

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
      },
      onGameOver: (gameOverData) => {
        console.log('Game over event received:', gameOverData);
        
        // Determine if current player won
        const currentPlayerOrientation = getPlayerOrientation();
        const playerWon = gameOverData.winner && gameOverData.winner.includes(currentPlayerOrientation);
        
        console.log('Current player orientation:', currentPlayerOrientation);
        console.log('Winner orientations:', gameOverData.winner);
        console.log('Player won:', playerWon);
        
        handleGameOver({
          type: 'game_over',
          winner: playerWon,
          reason: gameOverData.reason
        });
      },
      onGameState: (gameState) => {
        const currentCode = gameId ? gameId : 'default'
        if (gameState && gameState.status && gameState.status.materialCount) {
          setMaterialCount(gameState.status.materialCount)
        }
        // Store server-provided player orientation
        if (gameState && gameState.playerOrientation !== undefined) {
          setPlayerOrientation(gameState.playerOrientation)
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
          // If the game/lobby no longer exists, show ended modal instead of hard navigating
          setGameOverData({ reason: 'ended' });
          setModalType('game_over');
          setShowModal(true);
        }
      });

      gameSocket.joinGame({ code: gameId }, {
        onJoined: () => { },
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

        // If lobby phase is ended, present ended modal
        if (lobbyPublic?.phase === 'ended') {
          setGameOverData({ reason: 'ended' });
          setModalType('game_over');
          setShowModal(true);
        }

        // Don't automatically start countdown here - let the lobby start event handle it
        // This prevents countdown from starting when rejoining existing games
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
      gameSocket.pauseGame({ code: gameId || 'default', playerName }, { onPaused: () => { } })
    }
  }

  const handleResume = () => {
    gameSocket.resumeGame({ code: gameId || 'default', playerName }, { onResumed: () => { } })
  }

  const handleQuit = () => {
    setModalType('quit')
    setShowModal(true)
  }

  const handleConfirmQuit = () => {
    gameSocket.quitGame(
      { code: gameId || 'default', playerName },
      {
        onEnded: () => { },
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


  const handleGameOver = (gameOverInfo) => {
    setGameOverData(gameOverInfo)
    setModalType('game_over')
    setShowModal(true)
  }

  const handleBackHome = () => {
    navigate('/')
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

  // Get color hex for display
  const getPlayerColorHex = (colorName) => {
    switch (colorName) {
      case 'White': return '#ffffff'
      case 'Black': return '#1a1a1a'
      case 'Red': return '#dc2626'
      case 'Blue': return '#2563eb'
      default: return '#6b7280'
    }
  }

  // Get team name from orientation
  const getTeamName = (orientation) => {
    switch (orientation) {
      case 0: return 'Black'  // TOP
      case 1: return 'Red'    // RIGHT
      case 2: return 'White'   // BOTTOM
      case 3: return 'Blue'    // LEFT
      default: return 'Unknown'
    }
  }

  // Get piece symbol for display
  const getPieceSymbol = (pieceType) => {
    switch (pieceType) {
      case 0: return '♔' // KING
      case 1: return '♕' // QUEEN
      case 2: return '♖' // ROOK
      case 3: return '♗' // BISHOP
      case 4: return '♘' // KNIGHT
      case 5: return '♙' // PAWN
      default: return '?'
    }
  }

  // Get piece value for scoring
  const getPieceValue = (pieceType) => {
    switch (pieceType) {
      case 0: return 0   // KING (infinite value, but 0 for material count)
      case 1: return 9   // QUEEN
      case 2: return 5   // ROOK
      case 3: return 3   // BISHOP
      case 4: return 3   // KNIGHT
      case 5: return 1   // PAWN
      default: return 0
    }
  }

  // Calculate total material score
  const calculateMaterialScore = (pieces) => {
    let total = 0
    for (const [pieceType, count] of Object.entries(pieces)) {
      const value = getPieceValue(parseInt(pieceType))
      total += value * count
    }
    return total
  }

  // Get player orientation - use server-provided orientation when available
  const getPlayerOrientation = () => {
    // Use server-provided orientation if available
    if (playerOrientation !== null) {
      return playerOrientation
    }
    
    // Fallback to local calculation (should not be needed in normal operation)
    const playerId = getPlayerId()
    const myPlayer = gamePlayers.find(p => p.id === playerId)
    
    // Sort players by join time to match server logic
    const sortedPlayers = [...gamePlayers].sort((a, b) => {
      // Use a consistent sorting method - by player ID for now since we don't have join time
      return a.id.localeCompare(b.id)
    })
    
    const playerIndex = sortedPlayers.findIndex(p => p.id === playerId)
    
    // Map player index to orientation based on game mode
    if (gameMode === '1v1' || sortedPlayers.length === 2) {
      return playerIndex === 0 ? 2 : 0; // BOTTOM : TOP
    } else if (gameMode === '1v1v1' || sortedPlayers.length === 3) {
      const orientations = [2, 0, 1]; // BOTTOM, TOP, RIGHT
      return orientations[playerIndex] || 2;
    } else if (gameMode === '1v1v1v1' || sortedPlayers.length === 4) {
      const orientations = [2, 0, 1, 3]; // BOTTOM, TOP, RIGHT, LEFT
      return orientations[playerIndex] || 2;
    }
    
    return 2; // Default BOTTOM
  }

  const renderBoard = () => {
    switch (gameMode) {
      case '1v1':
        return <TwoPlayerBoard
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          boardSize={gameSettings.boardSize || 8}
          onGameOver={handleGameOver}
        />
      case '1v1v1':
        return <ThreePlayerBoard 
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          onGameOver={handleGameOver}
        />
      case '1v1v1v1':
        return <FourPlayerBoard 
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          onGameOver={handleGameOver}
        />
      default:
        return <TwoPlayerBoard
          gameCode={gameId}
          playerOrientation={getPlayerOrientation()}
          boardSize={gameSettings.boardSize || 8}
          onGameOver={handleGameOver}
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
      <div className="game-container">
        {/* Left Column - Players and Chat */}
        <aside className="players-chat-section">
          <div className="players-section">
            <h3 className="players-title">Players ({gamePlayers.length})</h3>
            <div className="players-list">
              {gamePlayers.map((player) => (
                <div key={player.id} className={`game-player ${!player.connected ? 'offline' : ''}`}>
                  <span className="player-name">
                    <span 
                      className="player-color-circle" 
                      style={{ 
                        backgroundColor: getPlayerColorHex(player.color),
                        border: player.color === 'White' ? '1px solid #ccc' : 'none'
                      }}
                    ></span>
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
          
          {/* Material Count Display */}
          {Object.keys(materialCount).length > 0 && (
            <div className="material-count-section">
              <h4 className="material-title">Material Score</h4>
              <div className="material-counts">
                {Object.entries(materialCount).map(([team, count]) => {
                  const teamName = getTeamName(parseInt(team))
                  const materialScore = calculateMaterialScore(count.pieces)
                  return (
                    <div key={team} className="material-team">
                      <div className="team-score">
                        {teamName}: {materialScore} points
                      </div>
                      <div className="piece-breakdown">
                        {Object.entries(count.pieces).map(([pieceType, pieceCount]) => {
                          if (pieceCount > 0) {
                            const pieceValue = getPieceValue(parseInt(pieceType))
                            const totalValue = pieceValue * pieceCount
                            return (
                              <span key={pieceType} className="piece-count">
                                {getPieceSymbol(parseInt(pieceType))}×{pieceCount} ({totalValue})
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
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
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={() => setShowFeedbackModal(true)}
              className="control-btn"
            >
              [ Feedback ]
            </Button>
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={soundActions.toggleMute}
              className="control-btn"
            >
              [ {isMuted ? 'Unmute' : 'Mute'} Sound ]
            </Button>
          </div>
        </aside>
      </div>
      {/* Game Modal - For Pause, Quit, and Game Over */}
      {showModal && modalType !== 'countdown' && (
        <div className="pause-overlay">
          <div className="pause-modal-content">
            <h2 className="pause-title">
              {modalType === 'pause' && `${pausedBy} paused the game`}
              {modalType === 'quit' && 'Do you want to quit?'}
              {modalType === 'game_over' && (
                (() => {
                  console.log('Game over modal - winner value:', gameOverData?.winner, 'type:', typeof gameOverData?.winner);
                  if (gameOverData?.winner === true) return 'You Won!';
                  if (gameOverData?.winner === false) return 'You Lost!';
                  return 'Draw!';
                })()
              )}
            </h2>

            {modalType === 'game_over' && (
              <div className="game-over-info">
                <p>
                  {gameOverData?.reason === 'checkmate' && 'by Checkmate'}
                  {gameOverData?.reason === 'stalemate' && 'by Stalemate'}
                  {gameOverData?.reason === 'insufficient_material' && 'by Insufficient Material'}
                  {gameOverData?.reason === 'only_one_team_remaining' && 'Last Player Standing'}
                  {gameOverData?.reason === 'ended' && 'This game has ended'}
                </p>
              </div>
            )}


            <div className="pause-buttons">
              {modalType === 'pause' && (
                <>
                  <Button
                    variant="primary"
                    borderStyle="solid"
                    onClick={handleResume}
                    className="pause-btn"
                  >
                    [ Resume ]
                  </Button>
                  <Button
                    variant="secondary"
                    borderStyle="solid"
                    onClick={handleQuit}
                    className="pause-btn"
                  >
                    [ Quit ]
                  </Button>
                </>
              )}

              {modalType === 'quit' && (
                <>
                  <Button
                    variant="primary"
                    borderStyle="solid"
                    onClick={handleCloseModal}
                    className="pause-btn"
                  >
                    [ Cancel ]
                  </Button>
                  <Button
                    variant="secondary"
                    borderStyle="solid"
                    onClick={handleConfirmQuit}
                    className="pause-btn"
                  >
                    [ Quit ]
                  </Button>
                </>
              )}

              {modalType === 'game_over' && (
                <Button
                  variant="primary"
                  borderStyle="solid"
                  onClick={handleBackHome}
                  className="pause-btn"
                >
                  [ Back Home ]
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        playerName={playerName}
      />
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
