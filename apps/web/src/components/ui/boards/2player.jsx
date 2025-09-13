import { useMemo, useState, useCallback, useEffect } from 'react'
import './2player.css'
import * as chess from '../../../chess.js'
import { makeMove, listenGame } from '../../../sockets/game.js'
import { GAME_EVENTS } from '../../../../constants/socket-events.js'


const DURATION = 3000.0
const clamp = (n, min, max) => Math.min(Math.max(n, min),max)
const lerp = (x, y, a) => x * (1 - a) + y * a;

export default function TwoPlayerBoard({
	paused = false,
	boardSize = 8,
	orientation/* or team or whatever */= chess.Orientation.BOTTOM,
	gameCode = null,
	playerOrientation = chess.Orientation.BOTTOM
}) {
	const largeBoard = boardSize === 14
	const squareWidth = 1.0/boardSize*100

  const [selected, setSelected] = useState(null)

	let square_lookup = {}
	const squares = []
	{
		for (let r = 0; r < boardSize; r++) {
			let rank = []
			for (let f = 0; f < boardSize; f++) {
				let name = chess.getSquare(orientation, [f,r], largeBoard)
				square_lookup[name] = [f,r]
				rank.push({
					position: [f,r],
					name, 
					white: (r+f)%2==0
				})
			}
			squares.push(rank)
		}
	}

	const [pieces, setPieces] = useState([])
	const [gameState, setGameState] = useState(null)

	const piece_lookup = {}
	for (const piece of pieces) {
		if (!piece.dead && piece.square) {
			piece_lookup[piece.square] = piece
		} else if (piece.animation && piece.team === playerOrientation) {
			piece_lookup[piece.animation.to] = piece // block moving to the same square
			// TODO may need some tweaking
		}
	}

	const piece_on_square = sq => piece_lookup[sq]
	const in_corner = ([x,y]) => (x < 3 && y < 3) || (x < 3 && y > 10) || (x > 10 && y < 3) || (x > 10 && y > 10)
	const in_bounds = v => Boolean(squares[v[1]] && squares[v[1]][v[0]] && (!largeBoard || !in_corner(v))) 
	const square_is_free = v => Boolean(in_bounds(v) && !piece_on_square(squares[v[1]][v[0]].name))
	const square_is_enemy = v => Boolean(in_bounds(v) && piece_on_square(squares[v[1]][v[0]].name)?.team !== playerOrientation)

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

		switch (selected.type) {
			case chess.Piece.PAWN:
				add_move_if_valid([0,-1], true, false) &&
					!selected.hasMoved && add_move_if_valid([0,-2], true, false) // 1st move can be 2 squares
				add_move_if_valid([1,-1], false, true)
				add_move_if_valid([-1,-1], false, true)
				break
			case chess.Piece.ROOK:
				for (let dir of [[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					while (add_move_if_valid(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.BISHOP:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1]]) {
					let range = 1
					while (add_move_if_valid(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.QUEEN:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1],[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					while (add_move_if_valid(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.KING:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1],[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					add_move_if_valid(chess.mul(dir, range))
				}
				break
			case chess.Piece.KNIGHT:
				for (let point of [[1,2],[1,-2],[2,1],[2,-1]]) {
					add_move_if_valid(point)
					add_move_if_valid(chess.neg(point))
				}
				break
		}
	}

	// strict mode loop guard
	const [looping, setLooping] = useState(false)
	async function frame() {
		// https://x.com/its_bvisness/status/1960370065284460550
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

					// collisions
					for (let j = 0; j < pieces.length; j += 1) {
						if (i == j) continue
						let other = pieces[j]
						if (other.dead) continue
						if (other.team === playerOrientation) continue
						else {
							const other_is_moving = other.animation
							let other_position
							if (!other_is_moving) {
								other_position = square_lookup[other.square]
							} else {
								other_position = other.position
							}
							let diff = chess.abs(chess.sub(piece.position, other_position))
							const length = ([x,y]) => Math.sqrt(x*x+y*y)
							const distance = length(diff)
							// TODO tweak distance and check for king?
							if (distance < 0.5) {
								if (!other_is_moving) {
									other.dead = true
								} else {
									// TODO test moving kill code when multiplayer works
									// TODO should this just be time based or should the strongest piece survive
									// I think kfchess.com does this
									if (other.animation.time < piece.animation.time) {
										other.dead = true
									} else {
										piece.dead = true
									}
								}
							}
						}
					}

					piece.animation.time += delta
					const elapsed = clamp(
						piece.animation.time/DURATION,
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

						// promotion
						if (piece.type === chess.Piece.PAWN && y <= boardSize-8) {
							piece.type = chess.Piece.QUEEN
						}
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
				setGameState(state)
				setPieces(state.pieces || [])
			},
			onMoveMade: (data) => {
				// Handle move animation or updates
				console.log('Move made:', data)
			}
		})

		return cleanup
	}, [gameCode])

	useEffect(()=>{
		if (looping) return
		setLooping(true)
		frame()
	}, [])

	// Real-time cooldown updates
	useEffect(() => {
		const interval = setInterval(() => {
			// Force re-render to update cooldown display
			setPieces(prev => [...prev])
		}, 100) // Update every 100ms for smooth cooldown animation

		return () => clearInterval(interval)
	}, [])


  return <div className="chess-board">
			<div className="chess-squares" style={{'--grid-size': boardSize}}>
			{squares.flat().map((square, i) => {
				let classes = ['chess-square']
				// don't color corners
				if (!largeBoard || in_bounds(square.position)) {
					classes.push(square.white ? 'light' : 'dark')
				}
				return <div
				key={i}
				className={classes.filter(Boolean).join(' ')}>
				</div>
			})}
			</div>

			{pieces.map((piece, i) => {
				if (piece.dead) return
				const click = () => {
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
				
				// Calculate cooldown percentage for visual feedback
				let cooldownPercent = 0
				if (isOnCooldown && myPiece) {
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
						left: `${x*squareWidth}%`, 
						top: `${y*squareWidth}%`,
						width: `${squareWidth}%`,
						height: `${squareWidth}%`,
					}}>
						<img
							draggable="false"
							onClick={canClick ? click : null}
							src={chess.filenames[piece.team][piece.type]}
							className={`chess-piece ${selected?.square === piece.square? 'selected':''} ${!canClick ? 'disabled' : ''}`}
							style={{ 
								width: '100%',
								height: '100%',
							}}
						/>
						{isOnCooldown && myPiece && (
							<div 
								className="cooldown-overlay"
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									height: '100%',
									background: `conic-gradient(from 0deg, rgba(255,0,0,0.3) ${cooldownPercent}%, transparent ${cooldownPercent}%)`,
									pointerEvents: 'none',
									borderRadius: '50%'
								}}
							/>
						)}
					</div>
				)
			})}

			{moves.map((m,i) => {
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
							},
							onError: (error) => {
								console.error('Move failed:', error)
								// Could show error message to user
							}
						})
					} else {
						// Fallback to local move for offline play
						setPieces(prev => {
							const piece = piece_on_square(from)
							if (piece.square) {
								piece.position = square_lookup[piece.square]
								piece.hasMoved = true
								piece.animation = {
									from: piece.square,
									to: to,
									time: 0
								}
								delete piece.square
							}
							return prev
						})
					}
				}
				return <div
					onClick={click}
					key={i}
					className="move"
					style={{ left: `${x*squareWidth}%`, top: `${y*squareWidth}%`,
							width: `${squareWidth}%`,
							height: `${squareWidth}%`,
					}}
					/>
			})}
		</div>
}
