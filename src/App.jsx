import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LandingPage, GamePage } from './components'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
