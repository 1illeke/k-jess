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
	"/pieces/top_king.svg",
	"/pieces/top_queen.svg",
	"/pieces/top_rook.svg",
	"/pieces/top_bishop.svg",
	"/pieces/top_knight.svg",
	"/pieces/top_pawn.svg",
]

filenames[Orientation.RIGHT] = [
	"/pieces/right_king.svg",
	"/pieces/right_queen.svg",
	"/pieces/right_rook.svg",
	"/pieces/right_bishop.svg",
	"/pieces/right_knight.svg",
	"/pieces/right_pawn.svg",
]

filenames[Orientation.BOTTOM] = [
	"/pieces/bottom_king.svg",
	"/pieces/bottom_queen.svg",
	"/pieces/bottom_rook.svg",
	"/pieces/bottom_bishop.svg",
	"/pieces/bottom_knight.svg",
	"/pieces/bottom_pawn.svg",
]

filenames[Orientation.LEFT] = [
	"/pieces/left_king.svg",
	"/pieces/left_queen.svg",
	"/pieces/left_rook.svg",
	"/pieces/left_bishop.svg",
	"/pieces/left_knight.svg",
	"/pieces/left_pawn.svg",
]
export function getSquare(orientation, [x, y]) {
	if (false) { // TODO is four player
		const offset = 3
		x += offset
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

export function spawnPieces(orientation) {
	let pieces = {}
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 2; y++) {
			let piece = {}

			const start = [
				[Piece.ROOK, Piece.KNIGHT, Piece.BISHOP, Piece.QUEEN, Piece.KING, Piece.BISHOP, Piece.KNIGHT, Piece.ROOK],
				[Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN],
			]

			piece.team = orientation
			piece.type = start[y][x]
			if (piece.type == Piece.PAWN) continue
			// TODO TODO TODO this should not be fixed to 7!!!!!!!!!
			piece.square = getSquare(orientation, [x, 7-y])
			pieces[piece.square] = piece
		}
	}
	return pieces
}

// vectors
export const add = (a,b) => [a[0]+b[0], a[1]+b[1]]
export const sub = (a,b) => [a[0]-b[0], a[1]-b[1]]
export const neg = (a) => [-a[0], -a[1]]
export const mul = (a,n) => [a[0]*n, a[1]*n]
export const eq = (a,b) => a[0] === b[0] && a[1] === b[1]
export const transpose = (a) => [a[1], a[0]]
