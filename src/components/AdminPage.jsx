import { useState, useEffect } from 'react'
import { Button, ThemeToggle } from './ui'
import './AdminPage.css'

function AdminPage() {
  const [lobbies, setLobbies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchLobbies = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/lobbies')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setLobbies(data.lobbies || [])
      setLastUpdate(new Date(data.serverNow))
    } catch (err) {
      setError(err.message)
      console.error('Error fetching lobbies:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteLobby = async (code) => {
    if (!confirm(`Are you sure you want to terminate lobby ${code}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/lobbies/${code}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      alert(data.message || `Lobby ${code} terminated successfully`)
      
      // Refresh the lobbies list
      fetchLobbies()
    } catch (err) {
      alert(`Error terminating lobby: ${err.message}`)
      console.error('Error deleting lobby:', err)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (startTime, endTime = null) => {
    if (!startTime) return 'N/A'
    const end = endTime ? new Date(endTime) : new Date()
    const start = new Date(startTime)
    const duration = Math.floor((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const getPhaseDisplay = (lobby) => {
    switch (lobby.phase) {
      case 'lobby':
        return { text: 'Lobby', class: 'phase-lobby' }
      case 'in_game':
        return { text: 'In Game', class: 'phase-game' }
      case 'ended':
        return { text: 'Ended', class: 'phase-ended' }
      default:
        return { text: lobby.phase, class: 'phase-unknown' }
    }
  }

  useEffect(() => {
    fetchLobbies()
    
    // Auto-refresh every 5 sec
    const interval = setInterval(fetchLobbies, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="admin-page">
      <ThemeToggle />
      <div className="admin-container">
        <header className="admin-header">
          <h1 className="admin-title">Admin</h1>
          <div className="admin-controls">
            <Button
              variant="secondary"
              borderStyle="solid"
              onClick={fetchLobbies}
              className="refresh-btn"
              disabled={loading}
            >
              [ Refresh ]
            </Button>
            <Button
              to="/"
              variant="secondary"
              borderStyle="solid"
              className="back-btn"
            >
              ← Back to Home
            </Button>
          </div>
        </header>

        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">Total Lobbies:</span>
            <span className="stat-value">{lobbies.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Lobbies:</span>
            <span className="stat-value">{lobbies.filter(l => l.phase === 'lobby').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">In Game:</span>
            <span className="stat-value">{lobbies.filter(l => l.phase === 'in_game').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Update:</span>
            <span className="stat-value">{lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        <main className="lobbies-section">
          {lobbies.length === 0 ? (
            <div className="no-lobbies">
              {loading ? 'Loading lobbies...' : 'No active lobbies found'}
            </div>
          ) : (
            <div className="lobbies-list">
              {lobbies.map((lobby) => {
                const phase = getPhaseDisplay(lobby)
                const connectedPlayers = lobby.players.filter(p => p.connected)
                const disconnectedPlayers = lobby.players.filter(p => !p.connected)
                
                return (
                  <div key={lobby.code} className="lobby-card">
                    <div className="lobby-header">
                      <div className="lobby-title">
                        <h3>Lobby {lobby.code}</h3>
                        <span className={`phase-badge ${phase.class}`}>
                          {phase.text}
                        </span>
                      </div>
                      <Button
                        variant="danger"
                        borderStyle="solid"
                        onClick={() => deleteLobby(lobby.code)}
                        className="delete-btn"
                        disabled={lobby.phase === 'ended'}
                      >
                        [ Terminate ]
                      </Button>
                    </div>

                    <div className="lobby-info">
                      <div className="info-section">
                        <h4>Settings</h4>
                        <div className="settings-grid">
                          <div>Mode: {lobby.settings.maxPlayers} player</div>
                          <div>Random Colors: {lobby.settings.randomColors ? 'Yes' : 'No'}</div>
                        </div>
                      </div>

                      <div className="info-section">
                        <h4>Timing</h4>
                        <div className="timing-grid">
                          <div>Created: {formatTimestamp(lobby.createdAt)}</div>
                          <div>Started: {formatTimestamp(lobby.startedAt)}</div>
                          <div>Ended: {formatTimestamp(lobby.endedAt)}</div>
                          <div>Duration: {formatDuration(lobby.createdAt, lobby.endedAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="players-section">
                      <h4>Players ({lobby.players.length})</h4>
                      
                      {connectedPlayers.length > 0 && (
                        <div className="players-group">
                          <h5 className="players-group-title connected">Connected ({connectedPlayers.length})</h5>
                          <div className="players-grid">
                            {connectedPlayers.map((player) => (
                              <div key={player.playerId} className="player-card connected">
                                <div className="player-info">
                                  <span className="player-name">{player.name}</span>
                                  {player.playerId === lobby.hostPlayerId && (
                                    <span className="host-badge">HOST</span>
                                  )}
                                </div>
                                <div className="player-details">
                                  <small>ID: {player.playerId.slice(0, 8)}...</small>
                                  <small>Joined: {formatTimestamp(player.joinedAt)}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {disconnectedPlayers.length > 0 && (
                        <div className="players-group">
                          <h5 className="players-group-title disconnected">Disconnected ({disconnectedPlayers.length})</h5>
                          <div className="players-grid">
                            {disconnectedPlayers.map((player) => (
                              <div key={player.playerId} className="player-card disconnected">
                                <div className="player-info">
                                  <span className="player-name">{player.name}</span>
                                  {player.playerId === lobby.hostPlayerId && (
                                    <span className="host-badge">HOST</span>
                                  )}
                                </div>
                                <div className="player-details">
                                  <small>ID: {player.playerId.slice(0, 8)}...</small>
                                  <small>Disconnected: {formatTimestamp(player.disconnectedAt)}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminPage