export const Orientation = {
	TOP: 0,
	RIGHT: 1,
	BOTTOM: 2,
	LEFT: 3
}

export const Piece = {
	KING: 0,
	QUEEN: 1,
	ROOK: 2,
	BISHOP: 3,
	KNIGHT: 4,
	PAWN: 5,
}

// Import all piece images using Vite's asset system
import topKing from '/pieces/top_king.png'
import topQueen from '/pieces/top_queen.png'
import topRook from '/pieces/top_rook.png'
import topBishop from '/pieces/top_bishop.png'
import topKnight from '/pieces/top_knight.png'
import topPawn from '/pieces/top_pawn.png'

import rightKing from '/pieces/right_king.png'
import rightQueen from '/pieces/right_queen.png'
import rightRook from '/pieces/right_rook.png'
import rightBishop from '/pieces/right_bishop.png'
import rightKnight from '/pieces/right_knight.png'
import rightPawn from '/pieces/right_pawn.png'

import bottomKing from '/pieces/bottom_king.png'
import bottomQueen from '/pieces/bottom_queen.png'
import bottomRook from '/pieces/bottom_rook.png'
import bottomBishop from '/pieces/bottom_bishop.png'
import bottomKnight from '/pieces/bottom_knight.png'
import bottomPawn from '/pieces/bottom_pawn.png'

import leftKing from '/pieces/left_king.png'
import leftQueen from '/pieces/left_queen.png'
import leftRook from '/pieces/left_rook.png'
import leftBishop from '/pieces/left_bishop.png'
import leftKnight from '/pieces/left_knight.png'
import leftPawn from '/pieces/left_pawn.png'

export let filenames = []
filenames[Orientation.TOP] = [
	topKing,
	topQueen,
	topRook,
	topBishop,
	topKnight,
	topPawn,
]

filenames[Orientation.RIGHT] = [
	rightKing,
	rightQueen,
	rightRook,
	rightBishop,
	rightKnight,
	rightPawn,
]

filenames[Orientation.BOTTOM] = [
	bottomKing,
	bottomQueen,
	bottomRook,
	bottomBishop,
	bottomKnight,
	bottomPawn,
]

filenames[Orientation.LEFT] = [
	leftKing,
	leftQueen,
	leftRook,
	leftBishop,
	leftKnight,
	leftPawn,
]
export function getSquare(orientation, [x, y], largeBoard) {
	if (largeBoard) {
		const files = "abcdefghijklmn"
		const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
		switch (orientation) {
			case Orientation.TOP:
				return `${
					files[files.length-x-1]
				}${
					ranks[y]
				}`
			case Orientation.RIGHT:
				return `${
					files[files.length-y-1]
				}${
					ranks[ranks.length-x-1]
				}`
			case Orientation.BOTTOM:
				return `${
					files[x]
				}${
					ranks[ranks.length-y-1]
				}`
			case Orientation.LEFT:
				return `${
					files[y]
				}${
					ranks[x]
				}`
		}
	} else {
		const files = "abcdefgh"
		const ranks = [1,2,3,4,5,6,7,8]
		switch (orientation) {
			case Orientation.TOP:
				return `${
					files[files.length-x-1]
				}${
					ranks[y]
				}`
			case Orientation.BOTTOM:
				return `${
					files[x]
				}${
					ranks[ranks.length-y-1]
				}`
			default:
				console.error("unreachable")
		}
	}
	return null
}

export function spawnPieces(orientation, largeBoard) {
	let pieces = []
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 2; y++) {
			let piece = {}

			const start = [
				[Piece.ROOK, Piece.KNIGHT, Piece.BISHOP, Piece.QUEEN, Piece.KING, Piece.BISHOP, Piece.KNIGHT, Piece.ROOK],
				[Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN],
			]

			piece.team = orientation
			piece.type = start[y][x]

			if (largeBoard) piece.square = getSquare(orientation, [x+3, 13-y], largeBoard)
			else piece.square = getSquare(orientation, [x, 7-y], largeBoard)
			pieces.push(piece)
		}
	}
	return pieces
}

// vectors
export const add = (a,b) => [a[0]+b[0], a[1]+b[1]]
export const abs = (a) => [Math.abs(a[0]), Math.abs(a[1])]
export const sub = (a,b) => [a[0]-b[0], a[1]-b[1]]
export const neg = (a) => [-a[0], -a[1]]
export const mul = (a,n) => [a[0]*n, a[1]*n]
export const eq = (a,b) => a[0] === b[0] && a[1] === b[1]
export const transpose = (a) => [a[1], a[0]]
export const round = (a) => [Math.round(a[0]), Math.round(a[1])]
