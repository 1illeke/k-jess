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

export let filenames = []
filenames[Orientation.TOP] = [
	"/pieces/top_king.png",
	"/pieces/top_queen.png",
	"/pieces/top_rook.png",
	"/pieces/top_bishop.png",
	"/pieces/top_knight.png",
	"/pieces/top_pawn.png",
]

filenames[Orientation.RIGHT] = [
	"/pieces/right_king.png",
	"/pieces/right_queen.png",
	"/pieces/right_rook.png",
	"/pieces/right_bishop.png",
	"/pieces/right_knight.png",
	"/pieces/right_pawn.png",
]

filenames[Orientation.BOTTOM] = [
	"/pieces/bottom_king.png",
	"/pieces/bottom_queen.png",
	"/pieces/bottom_rook.png",
	"/pieces/bottom_bishop.png",
	"/pieces/bottom_knight.png",
	"/pieces/bottom_pawn.png",
]

filenames[Orientation.LEFT] = [
	"/pieces/left_king.png",
	"/pieces/left_queen.png",
	"/pieces/left_rook.png",
	"/pieces/left_bishop.png",
	"/pieces/left_knight.png",
	"/pieces/left_pawn.png",
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
