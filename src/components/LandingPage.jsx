import { useState } from 'react'
import { Button, ThemeToggle, Modal } from './ui'
import './LandingPage.css'

function LandingPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  const handleInfoClick = () => {
    setIsInfoModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsInfoModalOpen(false)
  }

  return (
    <div className="landing-page">
      <ThemeToggle />
      
      <div className="container">
        <header className="header">
          <h1 className="title">K/Jess</h1>
          <p className="tagline">The chaotic chess game that you never needed</p>
        </header>
        
        <main className="main">
          <div className="button-group">
            <Button to="/game" variant="primary" borderStyle="solid">
              [ Play ]
            </Button>
            <Button variant="secondary" borderStyle="dashed" onClick={handleInfoClick}>
              [ Info ]
            </Button>
          </div>
        </main>
        
        <footer className="footer">
          <div className="wireframe-box">
            <span>Current online players: 0</span>
          </div>
        </footer>
      </div>

      <Modal 
        isOpen={isInfoModalOpen}
        onClose={handleCloseModal}
        title="K/jess Info"
      >
        <p>
          male bla bla kaos bla bla
        </p>
      </Modal>
    </div>
  )
}

export default LandingPage 