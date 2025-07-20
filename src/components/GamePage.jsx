import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ThemeToggle } from './ui'
import './GamePage.css'

function GamePage() {
  const [playerName, setPlayerName] = useState('Player1')
  const [isPrivateGame, setIsPrivateGame] = useState(false)
  const [gameMode, setGameMode] = useState('1v1')
  const [fillWithBots, setFillWithBots] = useState(false)
  const [inviteCode, setInviteCode] = useState(null)
  
  // Fake players just like my CS games
  const [lobbyPlayers] = useState([
    { id: 1, name: 'Player1', isHost: true },
    { id: 2, name: 'ChessM4ster', isHost: false },
    { id: 3, name: 'Bot_Alice', isBot: true }
  ])

  const handleStartGame = () => {
    alert('Starting game...')
  }

  const handleInviteFriends = async () => {
    if (!inviteCode) {
      // Static inv code for now
      const code = 'KJ001'
      setInviteCode(code)
      
      // fake link aga ma teen selle ilmselt actual lingiks, peame lih ära tegema selle
      const inviteLink = `www.kjess.lilleke.eu/invite/${code}`
      
      try {
        // Copy to clipboard
        await navigator.clipboard.writeText(inviteLink)
        alert(`Invite link copied to clipboard!\n${inviteLink}`)
      } catch (err) {
        // Fallback since "ThEy HaVe A sPeCiAl BrOwSeR"
        console.error('Failed to copy to clipboard:', err)
        alert(`Invite code generated: ${code}\nLink: ${inviteLink}`)
      }
    } else {
      // If code already exists, copy the link again
      const inviteLink = `www.kjess.lilleke.eu/invite/${inviteCode}`
      try {
        await navigator.clipboard.writeText(inviteLink)
        alert(`Invite link copied to clipboard!\n${inviteLink}`)
      } catch (err) {
        alert(`Invite link: ${inviteLink}`)
      }
    }
  }

  return (
    <div className="game-page">
      <ThemeToggle />
      
      <div className="game-container">
        {/* Header */}
        <header className="game-header">
          <div className="player-name-section">
            <label htmlFor="playerName" className="name-label">Your Name:</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
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
        <main className="game-main">
          {/* Left side - Buttons */}
          <section className="game-actions">
            <h3 className="section-title">Game</h3>
            <div className="action-buttons">
              <Button 
                variant="primary" 
                borderStyle="solid"
                onClick={handleStartGame}
                className="action-btn"
              >
                [ Start Game ]
              </Button>
              <Button 
                variant="secondary" 
                borderStyle="dashed"
                onClick={handleInviteFriends}
                className="action-btn"
                title={inviteCode ? "Click to copy invite link again" : "Generate invite code"}
              >
                {inviteCode ? `[ ${inviteCode} ]` : '[ Invite Friends ]'}
              </Button>
            </div>
          </section>

          {/* Right side - Game settings */}
          <section className="game-settings">
            <h3 className="section-title">Settings</h3>
            <div className="settings-content">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={isPrivateGame}
                    onChange={(e) => setIsPrivateGame(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Private Game
                </label>
              </div>

              <div className="setting-item">
                <label className="setting-label">Game Mode:</label>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value)}
                  className="setting-select"
                >
                  <option value="1v1">2 players</option>
                  <option value="1v1v1">3 players</option>
                  <option value="1v1v1v1">4 players</option>
                </select>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={fillWithBots}
                    onChange={(e) => setFillWithBots(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Fill with Bots
                </label>
              </div>
            </div>
          </section>
        </main>

        {/* Lobby display */}
        <section className="lobby-section">
          <h3 className="section-title">Lobby ({lobbyPlayers.length}/4)</h3>
          <div className="lobby-content">
            <div className="lobby-players">
              {lobbyPlayers.map((player) => (
                <div key={player.id} className="lobby-player">
                  <span className="player-name">
                    {player.name}
                    {player.isHost && <span className="host-badge">[HOST]</span>}
                    {player.isBot && <span className="bot-badge">[BOT]</span>}
                  </span>
                  <div className="player-status">Ready</div>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 4 - lobbyPlayers.length }).map((_, index) => (
                <div key={`empty-${index}`} className="lobby-player empty">
                  <span className="player-name">Waiting for player...</span>
                  <div className="player-status">Empty</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default GamePage 