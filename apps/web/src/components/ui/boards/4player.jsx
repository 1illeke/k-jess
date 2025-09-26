import { useState, useEffect } from 'react'
import './4player.css'
import * as chess from '../../../chess.js'
import { makeMove, makePromotionMove, listenGame } from '../../../sockets/game.js'
import { useSound } from '../../../contexts/SoundContext'
import PromotionModal from '../PromotionModal.jsx'

const DURATION = 3000.0
const clamp = (n, min, max) => Math.min(Math.max(n, min), max)
const lerp = (x, y, a) => x * (1 - a) + y * a;

export default function FourPlayerBoard({
  paused = false,
  gameCode = null,
  playerOrientation = chess.Orientation.BOTTOM,
  onGameOver = null,
  onCheck = null
}) {
  const { actions: soundActions } = useSound()
  const boardSize = 14
  const squareWidth = 1.0 / boardSize * 100

  const [selected, setSelected] = useState(null)
  const [pieces, setPieces] = useState([])
  const [promotionData, setPromotionData] = useState(null) // { from, to, playerTeam }

  // Create square lookup and grid
  let square_lookup = {}
  const squares = []
  
  for (let r = 0; r < boardSize; r++) {
    let rank = []
    for (let f = 0; f < boardSize; f++) {
      // Check if this square is part of the cross shape
      const inVerticalArm = f >= 3 && f <= 10
      const inHorizontalArm = r >= 3 && r <= 10
      
      if (inVerticalArm || inHorizontalArm) {
        const files = "abcdefghijklmn"
        const name = `${files[f]}${14 - r}`
        square_lookup[name] = [f, r]
        rank.push({
          position: [f, r],
          name,
          white: (r + f) % 2 == 0,
          valid: true
        })
      } else {
        rank.push({
          position: [f, r],
          name: null,
          white: false,
          valid: false
        })
      }
    }
    squares.push(rank)
  }

  const piece_lookup = {}
  for (const piece of pieces) {
    if (!piece.dead && piece.square) {
      piece_lookup[piece.square] = piece
    } else if (piece.animation && piece.team === playerOrientation) {
      piece_lookup[piece.animation.to] = piece
    }
  }

  const piece_on_square = sq => piece_lookup[sq]
  const square_is_valid = ([x, y]) => squares[y] && squares[y][x] && squares[y][x].valid
  const square_is_free = v => Boolean(square_is_valid(v) && !piece_on_square(squares[v[1]][v[0]].name))
  const square_is_enemy = v => Boolean(square_is_valid(v) && piece_on_square(squares[v[1]][v[0]].name)?.team !== playerOrientation)

  let moves = []
  if (selected && !selected.animation) {
    let origin = square_lookup[selected.square]

    function add_move_if_valid(v, push_on_empty = true, push_on_enemy = true) {
      const p = chess.add(origin, v)

      if (square_is_free(p)) {
        if (push_on_empty) moves.push(p)
        return true
      }

      if (square_is_enemy(p) && push_on_enemy) moves.push(p)
      return false
    }

    // Get movement directions based on player orientation
    const getMovementDirections = (orientation) => {
      switch (orientation) {
        case chess.Orientation.TOP:
          return {
            forward: [0, 1], // Move down on screen
            diagonals: [[-1, 1], [1, 1]]
          }
        case chess.Orientation.RIGHT:
          return {
            forward: [-1, 0], // Move left on screen
            diagonals: [[-1, -1], [-1, 1]]
          }
        case chess.Orientation.BOTTOM:
          return {
            forward: [0, -1], // Move up on screen
            diagonals: [[-1, -1], [1, -1]]
          }
        case chess.Orientation.LEFT:
          return {
            forward: [1, 0], // Move right on screen
            diagonals: [[1, -1], [1, 1]]
          }
        default:
          return { forward: [0, -1], diagonals: [[-1, -1], [1, -1]] }
      }
    }

    const directions = getMovementDirections(selected.team)

    switch (selected.type) {
      case chess.Piece.PAWN:
        add_move_if_valid(directions.forward, true, false) &&
          !selected.hasMoved && add_move_if_valid(chess.mul(directions.forward, 2), true, false)
        for (const diagonal of directions.diagonals) {
          add_move_if_valid(diagonal, false, true)
        }
        break
      case chess.Piece.ROOK:
        for (let dir of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          let range = 1
          while (add_move_if_valid(chess.mul(dir, range))) {
            range += 1
          }
        }
        break
      case chess.Piece.BISHOP:
        for (let dir of [[-1, 1], [1, -1], [-1, -1], [1, 1]]) {
          let range = 1
          while (add_move_if_valid(chess.mul(dir, range))) {
            range += 1
          }
        }
        break
      case chess.Piece.QUEEN:
        for (let dir of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) {
          let range = 1
          while (add_move_if_valid(chess.mul(dir, range))) {
            range += 1
          }
        }
        break
      case chess.Piece.KING:
        for (let dir of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) {
          add_move_if_valid(dir)
        }
        break
      case chess.Piece.KNIGHT:
        for (let point of [[1, 2], [1, -2], [2, 1], [2, -1]]) {
          add_move_if_valid(point)
          add_move_if_valid(chess.neg(point))
        }
        break
    }
  }

  // Animation loop
  const [looping, setLooping] = useState(false)
  async function frame() {
    let lastFrame = performance.now()
    while (true) {
      await new Promise(requestAnimationFrame)
      let delta = performance.now() - lastFrame
      lastFrame = performance.now()

      if (window.paused) continue

      setPieces(pieces => {
        let i = -1
        for (const piece of pieces) {
          i += 1
          if (!piece.animation || piece.dead) continue

          piece.animation.time += delta
          const elapsed = clamp(
            piece.animation.time / DURATION,
            0.0, 1.0)

          let [x, y] = square_lookup[piece.animation.from]
          const [tx, ty] = square_lookup[piece.animation.to]
          x = lerp(x, tx, elapsed)
          y = lerp(y, ty, elapsed)

          piece.position = [x, y]

          const animation_finished = elapsed === 1
          if (animation_finished) {
            delete piece.animation
            piece.position = chess.round(piece.position)
            let [x, y] = piece.position
            piece.square = squares[y][x].name
          }
        }
        return [...pieces]
      })
    }
  }

  // Socket listeners for game state
  useEffect(() => {
    if (!gameCode) return

    const cleanup = listenGame({
       onGameState: (state) => {
         setPieces(state.pieces || [])
       },
      onMoveMade: (data) => {
        console.log('Move made:', data)
        soundActions.playMoveSound()
      },
      onCheckmate: (data) => {
        console.log('Checkmate detected:', data)

        if (onGameOver) {
          const isPlayerWin = data.loser !== playerOrientation
          onGameOver({
            type: 'checkmate',
            winner: isPlayerWin,
            reason: 'checkmate'
          })
        }
      },
      onStalemate: (data) => {
        console.log('Stalemate detected:', data)

        if (onGameOver) {
          onGameOver({
            type: 'stalemate',
            winner: false,
            reason: 'stalemate'
          })
        }
      },
      onGameOver: (data) => {
        console.log('Game over:', data)

        if (onGameOver) {
          let winner = false
          if (data.reason === 'checkmate') {
            winner = data.loser !== playerOrientation
          } else if (data.reason === 'only_one_team_remaining') {
            winner = data.winner && data.winner.includes(playerOrientation)
          }

          onGameOver({
            type: 'game_over',
            winner: winner,
            reason: data.reason
          })
        }
      }
    })

    return cleanup
  }, [gameCode])

  useEffect(() => {
    if (looping) return
    setLooping(true)
    frame()
  }, [])

  // Real-time cooldown updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPieces(prev => [...prev])
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return <div className="chess-board-4p" style={{ '--grid-size': boardSize }}>
    <div className="chess-squares-4p">
      {squares.flat().map((square, i) => {
        if (!square.valid) {
          return <div key={i} className="chess-square-invalid"></div>
        }
        
        let classes = ['chess-square-4p']
        classes.push(square.white ? 'light' : 'dark')
        
        return <div
          key={i}
          className={classes.filter(Boolean).join(' ')}>
        </div>
      })}
    </div>

    {pieces.map((piece, i) => {
      if (piece.dead) return null
      
      const click = () => {
        console.log('Piece clicked:', {
          pieceTeam: piece.team,
          playerOrientation: playerOrientation,
          pieceSquare: piece.square,
          pieceType: piece.type
        })
        if (piece.animation) return
        if (selected?.square === piece.square) {
          setSelected(null)
        } else {
          setSelected(piece)
        }
      }

      const myPiece = piece.team === playerOrientation
      const isOnCooldown = piece.cooldown && piece.cooldown > Date.now()
      const canClick = myPiece && !isOnCooldown
      let [x, y] = piece.position || square_lookup[piece.square]
      
      // Debug piece positioning
      if (!piece.position && !square_lookup[piece.square]) {
        console.warn(`Piece at ${piece.square} not found in square_lookup`, piece)
        return null
      }

      // Calculate cooldown percentage for visual feedback
      let cooldownPercent = 0
      if (isOnCooldown) {
        const cooldownTimes = {
          [chess.Piece.PAWN]: 1000,
          [chess.Piece.KNIGHT]: 2000,
          [chess.Piece.BISHOP]: 2000,
          [chess.Piece.ROOK]: 3000,
          [chess.Piece.QUEEN]: 4000,
          [chess.Piece.KING]: 5000
        }
        const totalCooldown = cooldownTimes[piece.type] || 1000
        const remaining = piece.cooldown - Date.now()
        cooldownPercent = Math.max(0, (remaining / totalCooldown) * 100)
      }

      return (
        <div key={i} style={{
          position: 'absolute',
          left: `${x * squareWidth}%`,
          top: `${y * squareWidth}%`,
          width: `${squareWidth}%`,
          height: `${squareWidth}%`,
        }}>
          <img
            draggable="false"
            onClick={canClick ? click : null}
            src={chess.filenames[piece.team][piece.type]}
            className={`chess-piece ${selected?.square === piece.square ? 'selected' : ''} ${!canClick ? 'disabled' : ''}`}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
          {isOnCooldown && (
            <div
              className="cooldown-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `conic-gradient(from 0deg, ${myPiece ? 'rgba(255,0,0,0.4)' : 'rgba(255,165,0,0.3)'} ${cooldownPercent}%, transparent ${cooldownPercent}%)`,
                pointerEvents: 'none',
                borderRadius: '50%'
              }}
            />
          )}
        </div>
      )
    })}

    {moves.map((m, i) => {
      const [x, y] = m
      const click = (e) => {
        if (selected.animation) return

        let from = selected.square
        let to = squares[y][x].name
        setSelected(null)

        // Send move to backend
        if (gameCode) {
          makeMove({
            code: gameCode,
            from: from,
            to: to,
            playerOrientation: playerOrientation
          }, {
            onMoveMade: (response) => {
              console.log('Move successful:', response)
              soundActions.playMoveSound()
            },
            onPromotionRequired: (data) => {
              console.log('Promotion required:', data)
              // Show promotion modal
              setPromotionData({
                from: data.from,
                to: data.to,
                playerTeam: selected.team
              })
            },
            onError: (error) => {
              console.error('Move failed:', error)
            }
          })
        }
      }
      return <div
        onClick={click}
        key={i}
        className="move"
        style={{
          left: `${x * squareWidth}%`, top: `${y * squareWidth}%`,
          width: `${squareWidth}%`,
          height: `${squareWidth}%`,
        }}
      />
    })}

    {/* Promotion Modal */}
    {promotionData && (
      <PromotionModal
        isOpen={!!promotionData}
        onClose={() => setPromotionData(null)}
        onSelect={(promotionPiece) => {
          console.log('Promotion piece selected:', promotionPiece)
          // Send promotion move to backend
          if (gameCode) {
            makePromotionMove({
              code: gameCode,
              from: promotionData.from,
              to: promotionData.to,
              promotionPiece: promotionPiece,
              playerOrientation: playerOrientation
            }, {
              onMoveMade: (response) => {
                console.log('Promotion move successful:', response)
                soundActions.playMoveSound()
                setPromotionData(null)
              },
              onError: (error) => {
                console.error('Promotion move failed:', error)
                setPromotionData(null)
              }
            })
          }
        }}
        playerTeam={promotionData.playerTeam}
      />
    )}
  </div>
} 