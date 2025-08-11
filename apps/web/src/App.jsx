import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LandingPage, LobbyPage, GamePage, InvitationPage, AdminPage } from './components'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
                <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/invite/:inviteCode" element={<InvitationPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/lobby/:gameId" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
