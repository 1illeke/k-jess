/**
 * KISS Engine - Keep It Simple Stupid
 * Simplified chess engine for 3/4 player games without board rotation
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

export class KISSEngine {
  constructor(gameCode, settings = {}) {
    this.gameCode = gameCode
    this.settings = settings
    this.playerCount = settings.maxPlayers || 4
    
    // Board setup - cross shape
    this.boardSize = 14 // Always 14x14 for cross layout
    
    // Game state
    this.pieces = []
    this.activePlayers = this.playerCount === 3 ? [Orientation.TOP, Orientation.RIGHT, Orientation.BOTTOM] 
                                                : [Orientation.TOP, Orientation.RIGHT, Orientation.BOTTOM, Orientation.LEFT]
    this.gameState = 'active' // active, paused, ended
    this.moveHistory = []
    
    // Initialize the board
    this.initializeBoard()
  }


  initializeBoard() {
    this.pieces = []
    
    // Spawn pieces for each active player
    for (const orientation of this.activePlayers) {
      this.pieces.push(...this.spawnPieces(orientation))
    }
  }

  spawnPieces(orientation) {
    const pieces = []
    
    // Define starting positions for each orientation
    const positions = this.getStartingPositions(orientation)
    
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 2; y++) {
        const [boardX, boardY] = positions.pieces[y][x]
        
        // Skip if position is outside valid cross area
        if (!this.isValidSquare(boardX, boardY)) continue
        
        const piece = {
          id: `${orientation}-${x}-${y}`,
          team: orientation,
          type: this.getStartingPieceType(y, x),
          square: this.coordsToSquare(boardX, boardY),
          hasMoved: false,
          dead: false
        }
        pieces.push(piece)
      }
    }
    return pieces
  }

  getStartingPositions(orientation) {
    // Define where pieces start for each orientation
    switch (orientation) {
      case Orientation.TOP:
        return {
          pieces: [
            // Back rank (y=0)
            [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0]],
            // Pawn rank (y=1)  
            [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1]]
          ]
        }
      case Orientation.RIGHT:
        return {
          pieces: [
            // Back rank
            [[13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [13, 10]],
            // Pawn rank
            [[12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [12, 10]]
          ]
        }
      case Orientation.BOTTOM:
        return {
          pieces: [
            // Back rank
            [[10, 13], [9, 13], [8, 13], [7, 13], [6, 13], [5, 13], [4, 13], [3, 13]],
            // Pawn rank
            [[10, 12], [9, 12], [8, 12], [7, 12], [6, 12], [5, 12], [4, 12], [3, 12]]
          ]
        }
      case Orientation.LEFT:
        return {
          pieces: [
            // Back rank
            [[0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5], [0, 4], [0, 3]],
            // Pawn rank
            [[1, 10], [1, 9], [1, 8], [1, 7], [1, 6], [1, 5], [1, 4], [1, 3]]
          ]
        }
      default:
        return { pieces: [[], []] }
    }
  }

  getStartingPieceType(y, x) {
    const start = [
      [Piece.ROOK, Piece.KNIGHT, Piece.BISHOP, Piece.QUEEN, Piece.KING, Piece.BISHOP, Piece.KNIGHT, Piece.ROOK],
      [Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN, Piece.PAWN],
    ]
    return start[y][x]
  }

  coordsToSquare(x, y) {
    const files = "abcdefghijklmn"
    const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
    return `${files[x]}${ranks[13-y]}` // 13-y to flip rank numbering
  }

  squareToCoords(square) {
    const files = "abcdefghijklmn"
    const file = files.indexOf(square[0])
    const rank = parseInt(square.slice(1)) - 1
    return [file, 13 - rank] // 13-rank to flip back
  }

  isValidSquare(x, y) {
    // Check if coordinates are within the cross shape
    if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return false
    
    const inVerticalArm = x >= 3 && x <= 10
    const inHorizontalArm = y >= 3 && y <= 10
    
    return inVerticalArm || inHorizontalArm
  }

  getPieceAt(square) {
    return this.pieces.find(piece => !piece.dead && piece.square === square)
  }

  isValidMove(fromSquare, toSquare, playerOrientation) {
    
    const piece = this.getPieceAt(fromSquare)
    if (!piece || piece.team !== playerOrientation) {
      return { valid: false, reason: 'No piece at source or not your piece' }
    }


    const [toX, toY] = this.squareToCoords(toSquare)
    if (!this.isValidSquare(toX, toY)) {
      return { valid: false, reason: 'Target square is outside playable area' }
    }

    const targetPiece = this.getPieceAt(toSquare)
    if (targetPiece && targetPiece.team === playerOrientation) {
      return { valid: false, reason: 'Cannot capture your own piece' }
    }

    // Check if trying to capture a king (which is not allowed)
    if (targetPiece && targetPiece.type === Piece.KING) {
      return { valid: false, reason: 'Cannot capture a king' }
    }

    // Check if the move is within the piece's valid moves
    const validMoves = this.getValidMovesForPiece(piece)
    if (!validMoves.includes(toSquare)) {
      return { valid: false, reason: 'Invalid move for this piece' }
    }

    // Check if the move would leave the king in check
    if (this.wouldLeaveKingInCheck(fromSquare, toSquare, playerOrientation)) {
      console.log('❌ KISS validation failed: Move would leave king in check')
      const currentCheck = this.isInCheck(playerOrientation)
      const piece = this.getPieceAt(fromSquare)
      console.log('🔍 Check validation details:', {
        fromSquare,
        toSquare,
        playerOrientation,
        pieceType: piece?.type,
        currentlyInCheck: currentCheck.inCheck,
        activeAttackers: currentCheck.activeAttackers?.length || 0,
        cooldownAttackers: currentCheck.cooldownAttackers?.length || 0
      })
      return { valid: false, reason: 'Move would leave king in check' }
    }

    return { valid: true }
  }

  getValidMovesForPiece(piece) {
    const moves = []
    const [x, y] = this.squareToCoords(piece.square)
    
    const addMoveIfValid = (targetX, targetY, canCapture = true, canMoveToEmpty = true) => {
      if (!this.isValidSquare(targetX, targetY)) {
        return false
      }
      
      const targetSquare = this.coordsToSquare(targetX, targetY)
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

    // Get movement direction based on piece team
    const directions = this.getMovementDirections(piece.team)

    switch (piece.type) {
      case Piece.PAWN: {
        const forward = directions.forward
        addMoveIfValid(x + forward[0], y + forward[1], false, true)
        if (!piece.hasMoved) {
          addMoveIfValid(x + forward[0] * 2, y + forward[1] * 2, false, true)
        }
        // Diagonal captures
        const diagonals = directions.diagonals
        for (const [dx, dy] of diagonals) {
          addMoveIfValid(x + dx, y + dy, true, false)
        }
        break
      }

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

  getMovementDirections(orientation) {
    // Define movement directions for each orientation
    switch (orientation) {
      case Orientation.TOP:
        return {
          forward: [0, 1], // Move down
          diagonals: [[-1, 1], [1, 1]] // Diagonal down
        }
      case Orientation.RIGHT:
        return {
          forward: [-1, 0], // Move left
          diagonals: [[-1, -1], [-1, 1]] // Diagonal left
        }
      case Orientation.BOTTOM:
        return {
          forward: [0, -1], // Move up
          diagonals: [[-1, -1], [1, -1]] // Diagonal up
        }
      case Orientation.LEFT:
        return {
          forward: [1, 0], // Move right
          diagonals: [[1, -1], [1, 1]] // Diagonal right
        }
      default:
        return { forward: [0, 1], diagonals: [[-1, 1], [1, 1]] }
    }
  }

  makeMove(fromSquare, toSquare, playerOrientation) {
    
    const validation = this.isValidMove(fromSquare, toSquare, playerOrientation)
    
    if (!validation.valid) {
      console.log('KISS move validation failed:', validation.reason)
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

    // Check for pawn promotion (when pawn reaches opposite end)
    if (piece.type === Piece.PAWN) {
      const [x, y] = this.squareToCoords(toSquare)
      if (this.isPawnPromotionSquare(x, y, piece.team)) {
        piece.type = Piece.QUEEN
        piece.cooldown = Date.now() + cooldownTimes[Piece.QUEEN]
      }
    }

    this.moveHistory.push(move)

    // Get updated game status after the move
    const gameStatus = this.getGameStatus()
    
    // Update engine game state if game is over
    if (gameStatus.gameOver) {
      this.gameState = 'ended'
    }

    return { 
      success: true, 
      move,
      gameState: this.getGameState(),
      gameStatus: gameStatus
    }
  }

  isPawnPromotionSquare(x, y, team) {
    // Check if pawn has reached the opposite end based on team
    switch (team) {
      case Orientation.TOP:
        return y >= 13 // Reached bottom back rank
      case Orientation.RIGHT:
        // In 4-player mode: reach LEFT's back rank (x=0)
        // In 3-player mode: reach left edge of cross (x=3, since no LEFT player)
        if (this.activePlayers.includes(Orientation.LEFT)) {
          return x <= 0 // 4-player: reach LEFT's back rank
        } else {
          return x <= 3 // 3-player: reach left edge of cross
        }
      case Orientation.BOTTOM:
        return y <= 0 // Reached top back rank
      case Orientation.LEFT:
        return x >= 13 // Reached right back rank
      default:
        return false
    }
  }


  findKing(team) {
    return this.pieces.find(piece => 
      !piece.dead && 
      piece.type === Piece.KING && 
      piece.team === team
    )
  }

  getAttackSquaresForPiece(piece) {
    const attacks = []
    const [x, y] = this.squareToCoords(piece.square)
    
    const addAttackIfValid = (targetX, targetY) => {
      if (!this.isValidSquare(targetX, targetY)) {
        return false
      }
      
      const targetSquare = this.coordsToSquare(targetX, targetY)
      attacks.push(targetSquare)
      
      const targetPiece = this.getPieceAt(targetSquare)
      return !targetPiece // Can continue if no piece blocking
    }

    const directions = this.getMovementDirections(piece.team)

    switch (piece.type) {
      case Piece.PAWN: {
        // Pawns only attack diagonally
        const diagonals = directions.diagonals
        for (const [dx, dy] of diagonals) {
          addAttackIfValid(x + dx, y + dy)
        }
        break
      }

      case Piece.ROOK:
        // Horizontal and vertical attacks
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          let range = 1
          while (addAttackIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.BISHOP:
        // Diagonal attacks
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1]]) {
          let range = 1
          while (addAttackIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.QUEEN:
        // All directions
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
          let range = 1
          while (addAttackIfValid(x + dx * range, y + dy * range)) {
            range++
          }
        }
        break

      case Piece.KING:
        // One square in all directions
        for (const [dx, dy] of [[-1, 1], [1, -1], [-1, -1], [1, 1], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
          addAttackIfValid(x + dx, y + dy)
        }
        break

      case Piece.KNIGHT:
        // L-shaped attacks
        for (const [dx, dy] of [[1, 2], [1, -2], [2, 1], [2, -1]]) {
          addAttackIfValid(x + dx, y + dy)
          addAttackIfValid(x - dx, y - dy)
        }
        break
    }

    return attacks
  }

  getAttackersOfSquare(square, byTeams = null, ignoreCooldown = false) {
    const attackers = []
    
    // If no teams specified, check all enemy teams
    if (!byTeams) {
      byTeams = this.getEnemyTeams(-1) // Get all active teams
    }
    
    for (const team of byTeams) {
      const teamPieces = this.pieces.filter(piece => 
        !piece.dead && 
        piece.team === team
      )

      for (const piece of teamPieces) {
        const attacks = this.getAttackSquaresForPiece(piece)
        if (attacks.includes(square)) {
          const isOnCooldown = piece.cooldown && piece.cooldown > Date.now()
          
          // Skip cooldown pieces unless explicitly including them
          if (!ignoreCooldown && isOnCooldown) {
            continue
          }
          
          attackers.push({
            piece: piece,
            isOnCooldown: isOnCooldown,
            cooldownExpiry: piece.cooldown || 0,
            attackingSquare: square
          })
        }
      }
    }
    
    return attackers
  }

  isInCheck(team, treatCooldownAsActive = false) {
    const king = this.findKing(team)
    if (!king) {
      return { 
        inCheck: false, 
        activeAttackers: [], 
        cooldownAttackers: [],
        kingSquare: null
      }
    }

    const enemyTeams = this.getEnemyTeams(team)
    
    // Get all attackers (including those on cooldown)
    const allAttackers = this.getAttackersOfSquare(king.square, enemyTeams, true)
    
    // Split attackers into active and cooldown groups
    const activeAttackers = allAttackers.filter(attacker => !attacker.isOnCooldown)
    const cooldownAttackers = allAttackers.filter(attacker => attacker.isOnCooldown)
    
    // Determine if in check based on treatCooldownAsActive flag
    const inCheck = treatCooldownAsActive
      ? allAttackers.length > 0
      : activeAttackers.length > 0
    
    return {
      inCheck,
      activeAttackers: activeAttackers,
      cooldownAttackers: cooldownAttackers,
      kingSquare: king.square,
      // Legacy compatibility
      attackingPiece: activeAttackers.length > 0 ? activeAttackers[0].piece : null
    }
  }

  getEnemyTeams(team) {
    // Only check teams that actually have pieces in the game
    const activePieces = this.pieces.filter(p => !p.dead)
    const activeTeams = [...new Set(activePieces.map(p => p.team))]
    return activeTeams.filter(t => t !== team)
  }

  wouldLeaveKingInCheck(fromSquare, toSquare, team, countCooldown = false) {
    // Make a temporary move to test
    const piece = this.getPieceAt(fromSquare)
    const capturedPiece = this.getPieceAt(toSquare)
    
    if (!piece || piece.team !== team) return true
    
    // Temporarily execute the move
    const originalSquare = piece.square
    piece.square = toSquare
    
    if (capturedPiece) {
      capturedPiece.dead = true
    }
    
    // Check if king would be in check after this move
    const checkResult = this.isInCheck(team, countCooldown)
    
    // Restore the board state
    piece.square = originalSquare
    if (capturedPiece) {
      capturedPiece.dead = false
    }
    
    return checkResult.inCheck
  }

  getLegalMovesForPiece(piece, { countCooldown = false } = {}) {
    const possibleMoves = this.getValidMovesForPiece(piece)
    const legalMoves = []
    
    for (const move of possibleMoves) {
      if (!this.wouldLeaveKingInCheck(piece.square, move, piece.team, countCooldown)) {
        legalMoves.push(move)
      }
    }
    
    return legalMoves
  }

  isInCheckmate(team) {
    const checkResult = this.isInCheck(team, true)
    
    // Must be threatened by someone (active or cooldown)
    const allAttackers = [...checkResult.activeAttackers, ...checkResult.cooldownAttackers]
    if (allAttackers.length === 0) {
      return { inCheckmate: false }
    }
    
    // Search for ANY escape with cooldown counted as active threats
    const teamPieces = this.pieces.filter(piece => 
      !piece.dead && 
      piece.team === team
    )
    
    for (const piece of teamPieces) {
      if (this.getLegalMovesForPiece(piece, { countCooldown: true }).length > 0) {
        return { 
          inCheckmate: false,
          reason: 'has_legal_moves',
          allAttackers: allAttackers
        }
      }
    }
    
    // No legal moves available - this is checkmate
    return {
      inCheckmate: true,
      allAttackers: allAttackers,
      kingSquare: checkResult.kingSquare,
      // Legacy compatibility fields
      activeAttackers: checkResult.activeAttackers,
      cooldownAttackers: checkResult.cooldownAttackers
    }
  }

  isInStalemate(team) {
    const checkResult = this.isInCheck(team)
    
    // Must NOT be in check to be stalemate
    if (checkResult.inCheck) {
      return { inStalemate: false }
    }
    
    // Check if any piece of this team can make a legal move
    const teamPieces = this.pieces.filter(piece => 
      !piece.dead && 
      piece.team === team
    )
    
    for (const piece of teamPieces) {
      const legalMoves = this.getLegalMovesForPiece(piece)
      if (legalMoves.length > 0) {
        return { inStalemate: false }
      }
    }
    
    return { inStalemate: true }
  }

  hasInsufficientMaterial() {
    const activePieces = this.pieces.filter(p => !p.dead)
    
    // Count pieces by team
    const teamCounts = {}
    const teamPieces = {}
    
    for (const piece of activePieces) {
      if (!teamCounts[piece.team]) {
        teamCounts[piece.team] = 0
        teamPieces[piece.team] = []
      }
      teamCounts[piece.team]++
      teamPieces[piece.team].push(piece.type)
    }
    
    const teams = Object.keys(teamCounts).map(Number)
    
    // If only one team left, game is over
    if (teams.length <= 1) {
      return { insufficient: true, reason: 'only_one_team_remaining' }
    }
    
    // Check for insufficient material patterns
    for (const team of teams) {
      const pieces = teamPieces[team]
      const count = teamCounts[team]
      
      // King vs King
      if (count === 1 && pieces.includes(Piece.KING)) {
        continue
      }
      
      // King + Bishop vs King or King + Knight vs King
      if (count === 2 && pieces.includes(Piece.KING) && 
          (pieces.includes(Piece.BISHOP) || pieces.includes(Piece.KNIGHT))) {
        continue
      }
      
      // If any team has sufficient material, continue the game
      return { insufficient: false }
    }
    
    return { insufficient: true, reason: 'insufficient_material' }
  }

  getGameStatus() {
    const status = {
      gameState: this.gameState,
      inCheck: {},
      inCheckmate: {},
      inStalemate: {},
      winner: null,
      loser: null,
      gameOver: false,
      gameOverReason: null
    }
    
    // Check insufficient material first
    const materialCheck = this.hasInsufficientMaterial()
    if (materialCheck.insufficient) {
      status.gameOver = true
      status.gameOverReason = materialCheck.reason
      return status
    }
    
    // Check each team's status
    for (const team of this.activePlayers) {
      status.inCheck[team] = this.isInCheck(team)
      status.inCheckmate[team] = this.isInCheckmate(team)
      status.inStalemate[team] = this.isInStalemate(team)
      
      // If a team is checkmated, game is over
      if (status.inCheckmate[team].inCheckmate) {
        status.gameOver = true
        status.gameOverReason = 'checkmate'
        // Winner is the remaining team(s)
        status.winner = this.activePlayers.filter(t => t !== team)
        status.loser = team
        break
      }
      
      // If a team is stalemated, it's a draw
      if (status.inStalemate[team].inStalemate) {
        status.gameOver = true
        status.gameOverReason = 'stalemate'
        break
      }
    }
    
    return status
  }

  getGameState() {
    const gameStatus = this.getGameStatus()
    
    return {
      pieces: this.pieces.filter(p => !p.dead),
      gameState: this.gameState,
      moveHistory: this.moveHistory,
      boardSize: this.boardSize,
      status: gameStatus
    }
  }

  getGameStateForPlayer(playerOrientation) {
    const baseState = this.getGameState()

    return {
      ...baseState,
      pieces: baseState.pieces,
      playerOrientation
    }
  }

  setGameState(state) {
    this.gameState = state
  }
}
