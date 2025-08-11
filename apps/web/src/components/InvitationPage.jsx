import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, ThemeToggle } from './ui'
import './InvitationPage.css'

function InvitationPage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')

  const handleJoinLobby = () => {
    if (!playerName.trim()) {
      alert('Please enter your name!')
      return
    }
    navigate(`/lobby/${inviteCode}`, { 
      state: { 
        playerName: playerName.trim(),
        inviteCode
      } 
    })
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJoinLobby()
    }
  }

  return (
    <div className="invitation-page">
      <ThemeToggle />
      <div className="invitation-container">
        <header className="invitation-header">
          <h1 className="invitation-title">K/Jess</h1>
          <div className="invitation-details">
            <p className="inviter-info">
              Join lobby <span className="inviter-name">[{inviteCode}]</span>
            </p>
          </div>
        </header>

        <main className="invitation-main">
          <div className="name-section">
            <div className="name-input-group">
              <label htmlFor="playerName" className="name-label">Name:</label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                className="name-input"
                placeholder="Your name"
                maxLength={20}
                autoFocus
              />
            </div>
          </div>

          <div className="action-buttons">
            <Button 
              variant="primary" 
              borderStyle="solid"
              onClick={handleJoinLobby}
              className="join-button"
            >
              [ Join Lobby ]
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default InvitationPage 