import { useEffect, useState } from 'react'
import Button from './Button'
import './Modal.css'

/**
 * Modal Component
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when modal should close
 * @param {string} title - Modal title (optional)
 * @param {ReactNode} children - Modal content
 * @param {string} className - Additional CSS classes
 */
function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '' 
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure DOM is ready before animation
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      // Wait for animation to complete before removing from DOM
      setTimeout(() => setShouldRender(false), 200)
    }
  }, [isOpen])

  // esc
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // scroll shit
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!shouldRender) return null

  return (
    <div 
      className={`modal-overlay ${isAnimating ? 'modal-overlay-open' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`modal-content ${isAnimating ? 'modal-content-open' : ''} ${className}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          <Button 
            variant="icon" 
            borderStyle="solid"
            onClick={onClose}
            className="modal-close"
            title="Close modal"
          >
            ✕
          </Button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal 