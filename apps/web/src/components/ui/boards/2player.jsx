import { useMemo, useState, useCallback, useEffect } from 'react'
import './2player.css'
import * as chess from '../../../chess.js'


export default function TwoPlayerBoard({}) {
  const [selected, setSelected] = useState(null)

	let orientation = chess.Orientation.BOTTOM

	let square_lookup = {}
	const squares = []
	{
		for (let r = 0; r < 8; r++) {
			let rank = []
			for (let f = 0; f < 8; f++) {
				let name = chess.getSquare(orientation, [f,r])
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

	const [pieces, setPieces] = useState({
		...chess.spawnPieces(chess.Orientation.BOTTOM),
		...chess.spawnPieces(chess.Orientation.TOP),
		c4:{
			square:"c4",
			team:chess.Orientation.TOP,
			type:chess.Piece.ROOK
		}
	})

	// TODO needs to account for corners on 4v4
	const in_bounds = v => Boolean(squares[v[0]] && squares[v[0]][v[1]])
	const square_is_free = v => Boolean(in_bounds(v) && !pieces[chess.getSquare(orientation, v)])
	const square_is_enemy = v => Boolean(in_bounds(v) && pieces[chess.getSquare(orientation, v)]?.team !== orientation)

	let moves = []
	if (selected) {
		let origin = square_lookup[selected.square]

		function check(v, push_on_empty = true, push_on_enemy = true) {
			const p = chess.add(origin, v)

			if (square_is_free(p)) {
				if (push_on_empty) moves.push(p)
				return true
			}

			if (square_is_enemy(p)) {
				if (push_on_enemy) moves.push(p)
			}
			return false
		}

		switch (selected.type) {
			case chess.Piece.PAWN:
				check([0,-1], true, false) && !selected.hasMoved && check([0,-2], true, false)
				check([1,-1], false, true)
				check([-1,-1], false, true)
				break
			case chess.Piece.ROOK:
				for (let dir of [[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					while (check(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.BISHOP:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1]]) {
					let range = 1
					while (check(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.QUEEN:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1],[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					while (check(chess.mul(dir, range))) {
						range += 1
					}
				}
				break
			case chess.Piece.KING:
				for (let dir of [[-1,1],[1,-1],[-1,-1],[1,1],[0,1],[1,0],[-1,0],[0,-1]]) {
					let range = 1
					check(chess.mul(dir, range))
				}
				break
			case chess.Piece.KNIGHT:
				for (let point of [[1,2],[1,-2],[2,1],[2,-1]]) {
					check(point)
					check(chess.neg(point))
				}
				break
		}
	}
	const clamp = (n, min, max) => Math.min(Math.max(n, min),max)

	async function frame() {
		return
		// https://x.com/its_bvisness/status/1960370065284460550
		while (true) {
			await new Promise(requestAnimationFrame)
			pieces.map(() => {
				if (!piece.target) return piece

				return piece
			})
			setPieces(pieces)
		}
	}
	useEffect(()=>{frame()}, [])

  return <div className="chess-board">
			<div className="chess-squares">
			{squares.flat().map((square, i) => {
				return (<div
				key={i}
				className={[ 'chess-square', square.white ? 'light' : 'dark'
				].filter(Boolean).join(' ')}>
					{square.name}
				</div>)
			})}
			</div>

			{Object.keys(pieces).map(square => {
				const p = pieces[square]
				const click = () => {
					if (selected?.square === square) {
						setSelected(null)
					} else {
						setSelected(p)
					}
				}

				let [x, y] = square_lookup[p.square]
				return (<img
					onClick={click}
					src={chess.filenames[p.team][p.type]}
					key={square}
					className={`chess-piece ${selected?.square === square? 'selected':''}`}
					style={{ left: `${x*12.5}%`, top: `${y*12.5}%`}}
				/>)
			})}

			{moves.map((m,i) => {
				const click = () => {
					setPieces(prev => {
						prev[selected.square].target = m
						prev.start = performance.now()
						prev.end = performance.now() + 3000
						return prev
					})
				}
				const [x, y] = m
				return <div
					onClick={click}
					key={i}
					className="move"
					style={{ left: `${x*12.5}%`, top: `${y*12.5}%` }}
					/>
			})}
		</div>
}
