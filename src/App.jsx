import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LandingPage, LobbyPage, GamePage } from './components'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
                <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/lobby/:gameId" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
