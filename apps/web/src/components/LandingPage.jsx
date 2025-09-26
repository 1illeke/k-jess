import { useState, useEffect } from 'react'
import { Button, FeedbackModal, Modal } from './ui'
import './LandingPage.css'
import socket from '../sockets/socket'

function LandingPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [selectedInfoSection, setSelectedInfoSection] = useState('General')
  const [isWipModalOpen, setIsWipModalOpen] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // Listen for online count updates
  useEffect(() => {
    const handleOnlineCountUpdate = ({ onlineCount }) => {
      setOnlineCount(onlineCount)
    }

    socket.on('online-count-update', handleOnlineCountUpdate)

    // Fetch initial count
    // In development, use proxy (same origin). In production, use environment variable
    const apiUrl = import.meta.env.DEV
      ? '/api/online-count'  // Uses vite proxy in development
      : `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'}/api/online-count`

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => setOnlineCount(data.onlineCount))
      .catch(() => { }) // Fail silently

    return () => {
      socket.off('online-count-update', handleOnlineCountUpdate)
    }
  }, [])

  // Check if user has seen the WIP modal before
  useEffect(() => {
    const hasSeenWipModal = localStorage.getItem('kjess-wip-modal-seen')
    if (!hasSeenWipModal) {
      // Small delay to ensure page is loaded before showing modal
      setTimeout(() => {
        setIsWipModalOpen(true)
      }, 500)
    }
  }, [])

  const handleInfoClick = () => {
    setIsInfoModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsInfoModalOpen(false)
    setSelectedInfoSection('General') // Reset to General when closing
  }

  const handleCloseWipModal = () => {
    setIsWipModalOpen(false)
    // Mark as seen so it won't show again
    localStorage.setItem('kjess-wip-modal-seen', 'true')
  }

  const handleSectionChange = (section) => {
    setSelectedInfoSection(section)
  }

  const renderInfoContent = () => {
    switch (selectedInfoSection) {
      case 'General':
        return (
          <div>
            <p>This is a Multiplayer Real Time Strategy Chess game where speed and strategy combine in an entirely new way.</p>
            <p>Unlike traditional turn-based chess, K/Jess allows all players to move simultaneously, creating intense real-time battles where quick thinking and fast execution determine the winner.</p>
            <p>Join 2-4 players in chaotic chess battles that will test your strategic mind and reflexes like never before.</p>
          </div>
        )
      case 'Concept':
        return (
          <div>
            <p>As a MP-RTS chess game you can move the pieces simultaneously. They have a cooldown to stop instant movement. All pieces move as normal chess but just at the same time. Faster mover and thinker wins.</p>
            <p>The real-time nature means you must think on your feet, adapt quickly to your opponents' moves, and execute your strategy while they're executing theirs.</p>
            <p>Master the balance between speed and precision to dominate the battlefield.</p>
          </div>
        )
      case '2 Player':
        return (
          <div>
            <p>Using a normal two player chess board with the MP-RTS concept you battle to the last one standing. Normal chess movements.</p>
            <p>The classic chess experience reimagined with real-time gameplay. All traditional chess rules apply, but both players move simultaneously within the cooldown system.</p>
            <p>Perfect for intense 1v1 duels where every second counts.</p>
          </div>
        )
      case '3 Player':
        return (
          <div>
            <p>A 3 player chess board with our twist. Pawns can only move straight in line. That means half of your pawns attack one player and the other half attacks the other opponent. Movement stays same as normal chess as all the squares are like in normal chess.</p>
            <p>Strategic positioning becomes crucial as you must manage threats from two different directions while coordinating your own attacks.</p>
            <p>The triangular battlefield creates unique tactical opportunities and challenges.</p>
          </div>
        )
      case '4 Player':
        return (
          <div>
            <p>This is a cross shaped board with 4 players. Technically you are attacking one player but have another battle also in the middle. You can attack all other 3 players but since pawns can only move forward your pawns can only go straight. If a pawn encounters a wall it cannot go further.</p>
            <p>The ultimate chaos mode where alliances form and break in real-time. The cross-shaped battlefield creates a dynamic center where all players can clash.</p>
            <p>Master the art of multi-front warfare in this intense 4-way battle.</p>
          </div>
        )
      case 'Changelog':
        return (
          <div>
            <h4>Version 0.1.28</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added scoring system</li>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added improved promotion</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* fixed the colour name shuffle</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* colour issue fix</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* black can promote again on 2 player</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* gameover actually ends the game now, fixed winner/loser logic for 2 player</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* fixed timer issues</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Various fixes</li>
            </ul>
            <h4>Version 0.1.25</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added SFX for movment</li>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added 3 player mode</li>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added 4 player mode</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Fixed black screen issues</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Fixed black not promoting</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Some 4 player issues remain</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Various fixes</li>
            </ul>
            <h4>Version 0.1.20</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ color: '#51cf66', marginBottom: '8px' }}>+ Added SFX for movment</li>
              <li style={{ color: '#666666', marginBottom: '8px' }}>* Various fixes</li>
            </ul>
          </div>
        )
      default:
        return <p>Select a section to learn more about K/Jess.</p>
    }
  }

  return (
    <div className="landing-page">
      <Button
        variant="secondary"
        borderStyle="solid"
        onClick={() => setShowFeedbackModal(true)}
        className="feedback-btn"
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}
      >
        [ Feedback ]
      </Button>

      <div className="container">
        <header className="header">
          <h1 className="title">K/Jess</h1>
          <p className="tagline">The chaotic chess game that you never needed</p>
        </header>

        <main className="main">
          <div className="button-group">
            <Button to="/lobby" variant="primary" borderStyle="solid">
              [ Play ]
            </Button>
            <Button variant="secondary" borderStyle="dashed" onClick={handleInfoClick}>
              [ Info ]
            </Button>
          </div>
        </main>

        <footer className="footer">
          <div className="wireframe-box">
            <span>Current online players: {onlineCount}</span>
          </div>
        </footer>
      </div>

      <Modal
        isOpen={isInfoModalOpen}
        onClose={handleCloseModal}
        title="K/jess Info"
        className="info-modal"
      >
        <div className="info-modal-content">
          {/* Left Navigation */}
          <div className="info-navigation">
            {['General', 'Concept', '2 Player', '3 Player', '4 Player', 'Changelog'].map((section) => (
              <Button
                key={section}
                variant={selectedInfoSection === section ? "primary" : "secondary"}
                borderStyle="solid"
                onClick={() => handleSectionChange(section)}
                className="info-nav-btn"
              >
                [ {section} ]
              </Button>
            ))}
          </div>

          {/* Right Content */}
          <div className="info-content">
            <h3 className="info-section-title">{selectedInfoSection}</h3>
            {renderInfoContent()}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isWipModalOpen}
        onClose={handleCloseWipModal}
        title="Work in Progress"
        className="wip-modal"
      >
        <div className="wip-modal-content">
          <p>This is a Work In Progress project.</p>
          <p>Currently features may be broken or not added yet.</p>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        playerName="Guest"
      />
    </div>
  )
}

export default LandingPage 