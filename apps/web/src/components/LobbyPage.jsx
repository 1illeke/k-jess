import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Button, ThemeToggle } from './ui'
import './LobbyPage.css'
import { lobbySocket, gameSocket } from '../sockets'
import socket from '../sockets/socket'

function LobbyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { gameId } = useParams()

  const initialName = location.state?.playerName || localStorage.getItem('playerName') || 'Player1'
  const [playerName, setPlayerName] = useState(initialName)
  const [gameMode, setGameMode] = useState('1v1')
  const [inviteCode, setInviteCode] = useState(location.state?.inviteCode || null)
  const [showLobby, setShowLobby] = useState(Boolean(gameId || location.state?.inviteCode))
  const [lobbyPlayers, setLobbyPlayers] = useState([])
  const [hostPlayerId, setHostPlayerId] = useState(null)
  const [currentPlayerId, setCurrentPlayerId] = useState(null)
  const unsubscribeRef = useRef(null)
  const currentLobbyCodeRef = useRef(null)

  // Get stable player ID
  const getPlayerId = () => {
    let playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('playerId', playerId);
    }
    return playerId;
  }

  // convert maxPlayers back to frontend mode
  const getModeFromMaxPlayers = (maxPlayers) => {
    switch (maxPlayers) {
      case 2: return '1v1'
      case 3: return '1v1v1'
      case 4: return '1v1v1v1'
      default: return '1v1v1v1'
    }
  }

  const isHost = currentPlayerId && hostPlayerId && currentPlayerId === hostPlayerId

  useEffect(() => {
    setCurrentPlayerId(getPlayerId())
  }, [])

  // Keep track of current lobby code
  useEffect(() => {
    currentLobbyCodeRef.current = gameId || inviteCode
  }, [gameId, inviteCode])

  useEffect(() => {
    // Persist name 
    localStorage.setItem('playerName', playerName)
  }, [playerName])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (currentLobbyCodeRef.current) {
        lobbySocket.leaveLobby({ code: currentLobbyCodeRef.current })
      }
    }
  }, []) // Empty deps - only run on unmount

  // unload handle
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (currentLobbyCodeRef.current) {
        lobbySocket.leaveLobby({ code: currentLobbyCodeRef.current })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    // Auto-open lobby if there's a code in the URL or state
    if (gameId || inviteCode) setShowLobby(true)
  }, [gameId, inviteCode])

  // Listen for lobby settings and game start events
  useEffect(() => {
    const handleLobbyStarted = ({ settings }) => {
      const code = gameId || inviteCode
      if (code) {
        const gamePath = `/game/${code}`
        navigate(gamePath, { 
          state: { 
            gameMode, 
            playerName, 
            gameId: code,
            lobbyPlayers: lobbyPlayers,
            gameSettings: settings 
          } 
        })
      }
    }

    const stop = lobbySocket.listenLobby({
      onSettings: (settings) => {
        if (!settings) return
        setGameMode(settings.mode || '1v1')
      },
      // dont listen for players here, let the specific join/create handlers manage that
    })

    // Listen for game start events
    socket.on('lobby:started', handleLobbyStarted)
    
    return () => {
      stop && stop()
      socket.off('lobby:started', handleLobbyStarted)
    }
  }, [gameId, inviteCode, gameMode, playerName, lobbyPlayers, navigate])

  useEffect(() => {
    if (!showLobby) return

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    const handlers = {
      onPlayers: (players) => {
        setLobbyPlayers(players)
      },
      onLobbyState: (lobbyPublic) => {
        const players = lobbyPublic.players?.map(player => ({
          id: player.playerId,
          name: player.name,
          connected: player.connected,
          color: player.color // Color is already assigned server-side
        })) || []
        
        setLobbyPlayers(players)
        setHostPlayerId(lobbyPublic.hostPlayerId)
        if (lobbyPublic.settings) {
          const frontendMode = getModeFromMaxPlayers(lobbyPublic.settings.maxPlayers || 4)
          setGameMode(frontendMode)
        }
      },
      onError: (err) => console.error('Lobby error:', err?.message || err),
    }
    if (gameId) {
      unsubscribeRef.current = lobbySocket.joinLobby({ code: gameId, playerName }, handlers)
    } else if (inviteCode) {
      unsubscribeRef.current = lobbySocket.joinLobby({ code: inviteCode, playerName }, handlers)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      // Only leave lobby on actual component unmount, not on state changes
      // We'll handle leaving in the beforeunload effect instead
    }
  }, [showLobby, gameId, inviteCode, playerName])

  const handleStartGame = () => {
    const code = gameId || inviteCode
    if (!code || !isHost) return
    
    // this will trigger lobby:startGame
    lobbySocket.startGame({ code }, {
      onStarted: ({ settings }) => {
        // Navigate to game with lobby players and settings
        const gamePath = `/game/${code}`
        navigate(gamePath, { 
          state: { 
            gameMode, 
            playerName, 
            gameId: code,
            lobbyPlayers: lobbyPlayers,
            gameSettings: settings 
          } 
        })
      },
      onError: (err) => alert(err?.message || 'Failed to start game'),
    })
		
  }

  const handleInviteFriends = async () => {
    if (!inviteCode) {
      // clean up
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      const unsub = lobbySocket.createLobby(
        { playerName },
        {
          onCreated: ({ code }) => {
            setInviteCode(code)
            setShowLobby(true)
            const inviteLink = `${window.location.host}/invite/${code}`
            navigator.clipboard
              .writeText(inviteLink)
              .then(() => alert(`Invite link copied to clipboard!\n${inviteLink}`))
              .catch(() => alert(`Invite code generated: ${code}\nLink: ${inviteLink}`))
            
            // Update URL without navigation to avoid component unmount/remount
            window.history.replaceState({ playerName, inviteCode: code }, '', `/lobby/${code}`)
          },
          onError: (err) => alert(err?.message || 'Failed to create lobby'),
          onPlayers: (players) => {
            setLobbyPlayers(players)
          },
          onLobbyState: (lobbyPublic) => {
            const players = lobbyPublic.players?.map(player => ({
              id: player.playerId,
              name: player.name,
              connected: player.connected,
              color: player.color
            })) || []
            
            setLobbyPlayers(players)
            setHostPlayerId(lobbyPublic.hostPlayerId)
            if (lobbyPublic.settings) {
              const frontendMode = getModeFromMaxPlayers(lobbyPublic.settings.maxPlayers || 4)
              setGameMode(frontendMode)
            }
          }
        }
      )
      unsubscribeRef.current = unsub
    } else {
      const inviteLink = `${window.location.host}/invite/${inviteCode}`
      navigator.clipboard
        .writeText(inviteLink)
        .then(() => alert(`Invite link copied to clipboard!\n${inviteLink}`))
        .catch(() => alert(`Invite link: ${inviteLink}`))
    }
  }

  const handleSettingsChange = (newMode) => {
    const code = gameId || inviteCode
    if (!code || !isHost) return // Only allow host to change settings
    setGameMode(newMode)
    lobbySocket.updateSettings({ code, settings: { mode: newMode } })
  }

  const handleNameBlur = () => {
    const code = gameId || inviteCode
    if (!code) return
    if (playerName && playerName !== localStorage.getItem('playerName')) {
      localStorage.setItem('playerName', playerName)
    }
    lobbySocket.updatePlayerName({ code, name: playerName })
  }

  const getMaxPlayers = () => {
    switch (gameMode) {
      case '1v1': return 2
      case '1v1v1': return 3
      case '1v1v1v1': return 4
      default: return 4
    }
  }

  const totalSlots = getMaxPlayers()
  const emptySlots = Math.max(0, totalSlots - lobbyPlayers.length)
  const emptyKeys = Array.from({ length: emptySlots }, (_, i) => `empty-${i}-${totalSlots}-${lobbyPlayers.length}`)

  return (
    <div className="lobby-page">
      <ThemeToggle />
      <div className="lobby-container">
        {/* Header */}
        <header className="lobby-header">
          <div className="player-name-section">
            <label htmlFor="playerName" className="name-label">
              Your Name:
            </label>
            <input
              id="playerName"
              type="text"
              aria-labelledby="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onBlur={handleNameBlur}
              className="name-input"
              maxLength={20}
            />
          </div>
          <Button
            to="/"
            variant="secondary"
            borderStyle="solid"
            className="back-button"
          >
            ← Back to Home
          </Button>
        </header>
        {/* Main content area */}
        <main className="lobby-main">
          {/* Left side - Buttons */}
          <section className="game-actions">
            <h3 className="section-title">Game</h3>
            <div className="action-buttons">
              <Button
                variant="primary"
                borderStyle="solid"
                onClick={isHost ? handleStartGame : undefined}
                className={`action-btn ${!isHost ? 'disabled' : ''}`}
                disabled={!isHost}
              >
                {showLobby 
                  ? (isHost ? '[ Start Game ]' : '[ Waiting ]')
                  : '[ Queue ]'
                }
              </Button>
              <Button
                variant="secondary"
                borderStyle="dashed"
                onClick={handleInviteFriends}
                className="action-btn"
                title={inviteCode ? 'Click to copy invite link again' : 'Generate invite code'}
              >
                {inviteCode ? `[ ${inviteCode} ]` : '[ Lobby ]'}
              </Button>
            </div>
          </section>
          {/* Right side - Game settings */}
          <section className="game-settings">
            <h3 className="section-title">Settings</h3>
            <div className="settings-content">
              <div className="setting-item">
                <label className="setting-label" htmlFor="gameMode">
                  Game Mode:
                </label>
                {isHost ? (
                  <select
                    id="gameMode"
                    value={gameMode}
                    onChange={(e) => handleSettingsChange(e.target.value)}
                    className="setting-select"
                  >
                    <option value="1v1">2 players</option>
                    <option value="1v1v1">3 players</option>
                    <option value="1v1v1v1">4 players</option>
                  </select>
                ) : (
                  <span className="setting-display">
                    {gameMode === '1v1' ? '2 players' : 
                     gameMode === '1v1v1' ? '3 players' : 
                     '4 players'}
                  </span>
                )}
              </div>
            </div>
          </section>
        </main>
        {/* Lobby display - only show when invite friends is clicked */}
        {showLobby && (
          <section className="lobby-section">
            <h3 className="section-title">Lobby ({lobbyPlayers.length}/{totalSlots})</h3>
            <div className="lobby-content">
              <div className="lobby-players">
                {lobbyPlayers.map((player) => (
                  <div key={player.id} className={`lobby-player ${!player.connected ? 'disconnected' : ''}`}>
                    <span className="player-name">
                      {player.name}
                      {player.id === hostPlayerId && (
                        <span className="host-tag">[HOST]</span>
                      )}
                    </span>
                    <div className="player-status">
                      {player.connected ? 'Ready' : 'Reconnecting...'}
                    </div>
                  </div>
                ))}
                {emptyKeys.map((key) => (
                  <div key={key} className="lobby-player empty">
                    <span className="player-name">Waiting for player...</span>
                    <div className="player-status">Empty</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default LobbyPage 
