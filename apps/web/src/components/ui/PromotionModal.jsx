import { useState } from 'react'
import './PromotionModal.css'
import * as chess from '../../chess.js'

export default function PromotionModal({ isOpen, onClose, onSelect, playerTeam }) {
  const [selectedPiece, setSelectedPiece] = useState(null)

  if (!isOpen) return null

  const handlePieceSelect = (pieceType) => {
    console.log('PromotionModal: Piece selected:', pieceType)
    console.log('PromotionModal: Piece constants:', chess.Piece)
    setSelectedPiece(pieceType)
    onSelect(pieceType)
  }

  const promotionPieces = [
    { type: chess.Piece.QUEEN, name: 'Queen', symbol: '♕' },
    { type: chess.Piece.ROOK, name: 'Rook', symbol: '♖' },
    { type: chess.Piece.BISHOP, name: 'Bishop', symbol: '♗' },
    { type: chess.Piece.KNIGHT, name: 'Knight', symbol: '♘' }
  ]

  return (
    <div className="promotion-modal-overlay">
      <div className="promotion-modal">
        <div className="promotion-modal-header">
          <h3>Choose Promotion Piece</h3>
          <p>Select the piece you want to promote your pawn to:</p>
        </div>
        
        <div className="promotion-pieces">
          {promotionPieces.map((piece) => (
            <button
              key={piece.type}
              className={`promotion-piece ${selectedPiece === piece.type ? 'selected' : ''}`}
              onClick={() => handlePieceSelect(piece.type)}
            >
              <img
                src={chess.filenames[playerTeam][piece.type]}
                alt={piece.name}
                className="promotion-piece-image"
              />
              <span className="promotion-piece-name">{piece.name}</span>
              <span className="promotion-piece-symbol">{piece.symbol}</span>
            </button>
          ))}
        </div>
        
        <div className="promotion-modal-actions">
          <button 
            className="promotion-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
