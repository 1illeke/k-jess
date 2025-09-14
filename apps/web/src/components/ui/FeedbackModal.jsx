import { useState } from 'react'
import { Modal, Button } from './index'
import './FeedbackModal.css'

const FeedbackModal = ({ isOpen, onClose, playerName }) => {
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!feedback.trim()) return

    setIsSubmitting(true)

    try {
      // Get browser info
      const browserInfo = `${navigator.userAgent}`
      const currentDate = new Date().toLocaleString()
      
      // Discord webhook payload
      const webhookPayload = {
        embeds: [{
          title: "New Feedback Received",
          color: 0x5865F2, // Discord blue
          fields: [
            {
              name: "Player Name",
              value: playerName || "Anonymous",
              inline: true
            },
            {
              name: "Date & Time",
              value: currentDate,
              inline: true
            },
            {
              name: "Browser",
              value: browserInfo,
              inline: false
            },
            {
              name: "Feedback",
              value: feedback,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }]
      }

      // TODO: Replace with your actual Discord webhook URL
      const webhookUrl = "https://discord.com/api/webhooks/1416775797724811494/k4u7BsunkXkdhKn-U1tM4iN4BIbk4puXC-19AGmKj-cA5C5g7dYvC35EMWMk9GuQqvDa"
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          onClose()
          setFeedback('')
          setIsSubmitted(false)
        }, 2000)
      } else {
        console.error('Failed to send feedback')
        alert('Failed to send feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error sending feedback:', error)
      alert('Failed to send feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setFeedback('')
      setIsSubmitted(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="feedback-modal">
        <h2 className="feedback-title">Leave Feedback</h2>
        
        {isSubmitted ? (
          <div className="feedback-success">
            <p>✅ Thank you for your feedback!</p>
            <p>Your message has been sent successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-info">
              <p><strong>Name:</strong> {playerName || "Anonymous"}</p>
              <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
            </div>
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Please leave a detailed description of the issue or suggestion..."
              className="feedback-textarea"
              rows={6}
              maxLength={1000}
              required
            />
            
            <div className="feedback-char-count">
              {feedback.length}/1000 characters
            </div>
            
            <div className="feedback-buttons">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                [ Cancel ]
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !feedback.trim()}
              >
                {isSubmitting ? '[ Sending... ]' : '[ Send ]'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default FeedbackModal
