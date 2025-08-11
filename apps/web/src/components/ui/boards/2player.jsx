import { useMemo, useState, useCallback, useEffect } from 'react'
import './2player.css'

const FILES = 'abcdefgh'
const SQUARES = (() => {
  const out = []
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) out.push(`${FILES[f]}${r}`)
  }
  return out
})()

/** Convert "e4" -> {leftPct, topPct} (0..100) for absolute positioning */
function squareToPct(square, orientation = 'white') {
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1]) - 1
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 7 - rank : rank
  const step = 12.5 // 100 / 8
  return { leftPct: col * step, topPct: row * step }
}

/**
 * Game‑ready DOM chess board.
 * Props:
 *  - pieces: Array<{ id, type, color: 'white'|'black'|'teamA'|'teamB', square: 'a1'..'h8', svg?: ReactNode, cooldownEndsAt?: number, cooldownMs?: number }>
 *  - onMove: ({ pieceId, from, to }) => void
 *  - orientation: 'white' | 'black'
 *  - highlights: Set<string> of squares (e.g., possible moves)
 *  - lastMove: { from: string, to: string } | null
 *  - disabled: boolean (disable interactions)
 *  - cooldownMs: number (default for pieces)
 *  - renderPiece?: (piece) => ReactNode (override piece rendering)
 */
export default function TwoPlayerBoard({
  pieces = [],
  onMove,
  orientation = 'white',
  highlights = new Set(),
  lastMove = null,
  disabled = false,
  cooldownMs = 3000,
  renderPiece,
}) {
  const [selected, setSelected] = useState(null) // {pieceId, square}

  // Drive lightweight cooldown animations without canvas
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100) // ~10fps UI refresh
    return () => clearInterval(id)
  }, [])

  const boardSquares = useMemo(() => SQUARES, [])

  const onSquareClick = useCallback((square) => {
    if (disabled) return
    if (selected) {
      if (selected.square !== square) {
        onMove?.({ pieceId: selected.pieceId, from: selected.square, to: square })
      }
      setSelected(null)
    }
  }, [selected, onMove, disabled])

  const onPieceClick = useCallback((piece) => {
    if (disabled) return
    // prevent selecting a piece that is cooling down (optional UI guard; server still authoritative)
    const cdMs = piece.cooldownMs ?? cooldownMs
    const remaining = piece.cooldownEndsAt ? Math.max(0, piece.cooldownEndsAt - now) : 0
    if (remaining > 0) return

    if (selected?.pieceId === piece.id) setSelected(null)
    else setSelected({ pieceId: piece.id, square: piece.square })
  }, [selected, cooldownMs, now, disabled])

  return (
    <div
      className="chess-board"
      role="grid"
      aria-label="Chess board"
      data-orientation={orientation}
      data-disabled={disabled || undefined}
    >
      {/* Squares layer (stable grid) */}
      <div className="board-grid">
        {boardSquares.map((sq) => {
          const file = FILES.indexOf(sq[0])
          const rank = Number(sq[1]) - 1
          const isLight = (file + rank) % 2 === 0
          const sel = selected && selected.square === sq
          const isFrom = lastMove?.from === sq
          const isTo = lastMove?.to === sq
          const highlighted = highlights?.has?.(sq)
          return (
            <div
              key={sq}
              role="gridcell"
              tabIndex={0}
              className={[
                'chess-square',
                isLight ? 'light' : 'dark',
                sel ? 'selected' : '',
                isFrom ? 'last-from' : '',
                isTo ? 'last-to' : '',
                highlighted ? 'highlight' : '',
              ].filter(Boolean).join(' ')}
              data-square={sq}
              onClick={() => onSquareClick(sq)}
            />
          )
        })}
      </div>

      {/* Pieces layer (absolute, animates with top/left %) */}
      <div className="pieces-layer" aria-hidden={false}>
        {pieces.map((p) => {
          const { leftPct, topPct } = squareToPct(p.square, orientation)
          // cooldown progress 0..1 (1 = ready)
          const cdMs = p.cooldownMs ?? cooldownMs
          const remaining = p.cooldownEndsAt ? Math.max(0, p.cooldownEndsAt - now) : 0
          const progress = 1 - Math.min(1, remaining / Math.max(1, cdMs))
          const isSelected = selected?.pieceId === p.id

          return (
            <button
              key={p.id}
              className={['chess-piece', p.color, isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
              style={{ left: `${leftPct}%`, top: `${topPct}%`, ['--cdw']: `${(progress * 100).toFixed(1)}%` }}
              onClick={() => onPieceClick(p)}
              aria-label={`${p.color} ${p.type} on ${p.square}`}
              data-square={p.square}
              data-piece-id={p.id}
              disabled={disabled}
            >
              {renderPiece ? renderPiece(p) : (p.svg ?? <span className="fallback-glyph">♟</span>)}
              {/* Cooldown bar (width via --cdw) */}
              <div className="cd" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}