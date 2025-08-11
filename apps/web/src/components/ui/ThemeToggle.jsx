import { useState, useEffect } from 'react'
import Button from './Button'
import './ThemeToggle.css'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true) // Default to dark mode

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className="theme-toggle">
      <Button 
        variant="icon" 
        onClick={toggleTheme}
        className="theme-button"
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? '☀️' : '🌙'}
      </Button>
    </div>
  )
}

export default ThemeToggle 