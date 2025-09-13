/**
 * Backend Chess Game Engine
 * Handles game state, move validation, and move mirroring for multiplayer chess
 */

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

export class ChessEngine {
  constructor(gameCode, settings = {}) {
    this.gameCode = gameCode
    this.settings = settings
    this.boardSize = settings.boardSize || 8
    this.largeBoard = this.boardSize === 14
    
    // Game state
    this.pieces = []
    this.currentPlayer = Orientation.BOTTOM // Start with bottom player
    this.gameState = 'active' // active, paused, ended
    this.moveHistory = []
    
    // Initialize the board
    this.initializeBoard()
  }

  initializeBoard() {
    this.pieces = [
      ...this.spawnPieces(Orientation.TOP),
      ...this.spawnPieces(Orientation.BOTTOM),
    ]
  }

  spawnPieces(orientation) {
    let pieces = []
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 2; y++) {
        let piece = {
          id: `${orientation}-${x}-${y}`,
          team: orientation,
          type: this.getStartingPieceType(y, x),
          square: this.getSquare(orientation, [x, this.largeBoard ? 13-y : 7-y]),
          hasMoved: false,
          dead: false
        }
        pieces.push(piece)
      }
    }
    return pieces
  }

  getStartingPieceType(y, x) {
    const start = [
      [Piece.ROOK, Piece.KNIGHT, Piece.BISHOP, Piece.QUEEN, Piece.KING, Piece.BISHOP, Piece.KNIGHT, Piece.ROOK],
      [Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN],
    ]
    return start[y][x]
  }

  getSquare(orientation, [x, y]) {
    if (this.largeBoard) {
      const files = "abcdefghijklmn"
      const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
      switch (orientation) {
        case Orientation.TOP:
          return `${files[files.length-x-1]}${ranks[y]}`
        case Orientation.RIGHT:
          return `${files[files.length-y-1]}${ranks[ranks.length-x-1]}`
        case Orientation.BOTTOM:
          return `${files[x]}${ranks[ranks.length-y-1]}`
        case Orientation.LEFT:
          return `${files[y]}${ranks[x]}`
      }
    } else {
      const files = "abcdefgh"
      const ranks = [1,2,3,4,5,6,7,8]
      switch (orientation) {
        case Orientation.TOP:
          return `${files[files.length-x-1]}${ranks[y]}`
        case Orientation.BOTTOM:
          return `${files[x]}${ranks[ranks.length-y-1]}`
        default:
          throw new Error("Invalid orientation for 8x8 board")
      }
    }
    return null
  }

  getSquarePosition(square, orientation = Orientation.BOTTOM) {
    if (this.largeBoard) {
      const files = "abcdefghijklmn"
      const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
      const file = files.indexOf(square[0])
      const rank = parseInt(square.slice(1)) - 1
      
      // Convert back to internal coordinates based on orientation
      switch (orientation) {
        case Orientation.TOP:
          return [files.length - file - 1, rank]
        case Orientation.RIGHT:
          return [ranks.length - rank - 1, files.length - file - 1]
        case Orientation.BOTTOM:
          return [file, ranks.length - rank - 1]
        case Orientation.LEFT:
          return [rank, file]
        default:
          return [file, rank]
      }
    } else {
      const files = "abcdefgh"
      const ranks = [1,2,3,4,5,6,7,8]
      const file = files.indexOf(square[0])
      const rank = parseInt(square.slice(1)) - 1
      
      // Convert back to internal coordinates based on orientation
      switch (orientation) {
        case Orientation.TOP:
          return [files.length - file - 1, rank]
        case Orientation.BOTTOM:
          return [file, ranks.length - rank - 1]
        default:
          return [file, rank]
      }
    }
  }

  // Mirror a move for the opponent's perspective
  mirrorMove(fromSquare, toSquare, fromOrientation, toOrientation) {
    const fromPos = this.getSquarePosition(fromSquare, fromOrientation)
    const toPos = this.getSquarePosition(toSquare, fromOrientation)
    
    // Convert to opponent's coordinate system
    const mirroredFrom = this.getSquare(toOrientation, fromPos)
    const mirroredTo = this.getSquare(toOrientation, toPos)
    
    return { from: mirroredFrom, to: mirroredTo }
  }

  // Get piece at a specific square
  getPieceAt(square) {
    return this.pieces.find(piece => !piece.dead && piece.square === square)
  }

  // Validate if a move is legal
  isValidMove(fromSquare, toSquare, playerOrientation) {
    const piece = this.getPieceAt(fromSquare)
    if (!piece || piece.team !== playerOrientation) {
      return { valid: false, reason: 'No piece at source or not your piece' }
    }

    if (this.currentPlayer !== playerOrientation) {
      return { valid: false, reason: 'Not your turn' }
    }

    const targetPiece = this.getPieceAt(toSquare)
    if (targetPiece && targetPiece.team === playerOrientation) {
      return { valid: false, reason: 'Cannot capture your own piece' }
    }

    // Check if move is valid for the piece type
    const validMoves = this.getValidMovesForPiece(piece)
    if (!validMoves.some(move => move === toSquare)) {
      return { valid: false, reason: 'Invalid move for this piece' }
    }

    return { valid: true }
  }

  // Get all valid moves for a piece
  getValidMovesForPiece(piece) {
    const moves = []
    const [x, y] = this.getSquarePosition(piece.square)
    
    const addMoveIfValid = (targetX, targetY, canCapture = true, canMoveToEmpty = true) => {
      if (targetX < 0 || targetX >= this.boardSize || targetY < 0 || targetY >= this.boardSize) {
        return false
      }
      
      const targetSquare = this.getSquare(piece.team, [targetX, targetY])
      const targetPiece = this.getPieceAt(targetSquare)
      
      if (targetPiece) {
        if (canCapture && targetPiece.team !== piece.team) {
          moves.push(targetSquare)
        }
        return false // Blocked
      } else if (canMoveToEmpty) {
        moves.push(targetSquare)
        return true // Can continue
      }
      return false
    }

    switch (piece.type) {
      case Piece.PAWN:
        // Pawn moves (assuming bottom orientation moves up)
        const direction = piece.team === Orientation.BOTTOM ? -1 : 1
        addMoveIfValid(x, y + direction, false, true)
        if (!piece.hasMoved) {
          addMoveIfValid(x, y + 2 * direction, false, true)
        }
        // Diagonal captures
        addMoveIfValid(x - 1, y + direction, true, false)
        addMoveIfValid(x + 1, y + direction, true, false)
        break

      case Piece.ROOK:
        // Horizontal and vertical moves
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          let range = 1
          while (addMoveIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.BISHOP:
        // Diagonal moves
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1]]) {
          let range = 1
          while (addMoveIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.QUEEN:
        // All directions
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
          let range = 1
          while (addMoveIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.KING:
        // One square in all directions
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
          addMoveIfValid(x + dx, y + dy)
        }
        break

      case Piece.KNIGHT:
        // L-shaped moves
        for (const [dx, dy] of [[1, 2], [1, -2], [2, 1], [2, -1]]) {
          addMoveIfValid(x + dx, y + dy)
          addMoveIfValid(x - dx, y - dy)
        }
        break
    }

    return moves
  }

  // Execute a move
  makeMove(fromSquare, toSquare, playerOrientation) {
    const validation = this.isValidMove(fromSquare, toSquare, playerOrientation)
    if (!validation.valid) {
      return { success: false, error: validation.reason }
    }

    const piece = this.getPieceAt(fromSquare)
    const capturedPiece = this.getPieceAt(toSquare)

    // Check if piece is on cooldown
    if (piece.cooldown && piece.cooldown > Date.now()) {
      return { success: false, error: 'Piece is on cooldown' }
    }

    // Record the move
    const move = {
      from: fromSquare,
      to: toSquare,
      piece: {
        type: piece.type,
        team: piece.team
      },
      captured: capturedPiece ? {
        type: capturedPiece.type,
        team: capturedPiece.team
      } : null,
      timestamp: Date.now()
    }

    // Execute the move
    piece.square = toSquare
    piece.hasMoved = true

    // Set cooldown based on piece type (in milliseconds)
    const cooldownTimes = {
      [Piece.PAWN]: 1000,      // 1 second
      [Piece.KNIGHT]: 2000,    // 2 seconds
      [Piece.BISHOP]: 2000,    // 2 seconds
      [Piece.ROOK]: 3000,      // 3 seconds
      [Piece.QUEEN]: 4000,     // 4 seconds
      [Piece.KING]: 5000       // 5 seconds
    }
    
    piece.cooldown = Date.now() + cooldownTimes[piece.type]

    if (capturedPiece) {
      capturedPiece.dead = true
      capturedPiece.square = null
    }

    // Check for pawn promotion
    if (piece.type === Piece.PAWN) {
      const [x, y] = this.getSquarePosition(toSquare)
      if (y <= this.boardSize - 8) {
        piece.type = Piece.QUEEN
        // Update cooldown for promoted piece
        piece.cooldown = Date.now() + cooldownTimes[Piece.QUEEN]
      }
    }

    this.moveHistory.push(move)

    return { 
      success: true, 
      move,
      gameState: this.getGameState()
    }
  }

  // Get current game state
  getGameState() {
    return {
      pieces: this.pieces.filter(p => !p.dead),
      gameState: this.gameState,
      moveHistory: this.moveHistory,
      boardSize: this.boardSize
    }
  }

  // Get game state for a specific player (with mirrored moves)
  getGameStateForPlayer(playerOrientation) {
    const baseState = this.getGameState()
    
    // Mirror the pieces for the player's perspective
    const mirroredPieces = baseState.pieces.map(piece => ({
      ...piece,
      square: this.getSquare(playerOrientation, this.getSquarePosition(piece.square))
    }))

    return {
      ...baseState,
      pieces: mirroredPieces,
      playerOrientation
    }
  }

  // Pause/resume game
  setGameState(state) {
    this.gameState = state
  }
}
