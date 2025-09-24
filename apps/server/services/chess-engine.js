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
        // Use consistent internal coordinate system (BOTTOM orientation)
        let internalY = orientation === Orientation.BOTTOM ? 7-y : y
        let piece = {
          id: `${orientation}-${x}-${y}`,
          team: orientation,
          type: this.getStartingPieceType(y, x),
          square: this.getSquare(Orientation.BOTTOM, [x, internalY]),
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
    console.log('=== VALIDATION DEBUG ===');
    console.log('Validating move:', { fromSquare, toSquare, playerOrientation });
    
    const piece = this.getPieceAt(fromSquare)
    console.log('Piece at source:', piece);
    
    if (!piece || piece.team !== playerOrientation) {
      console.log('Validation failed: No piece at source or not your piece');
      return { valid: false, reason: 'No piece at source or not your piece' }
    }

    const targetPiece = this.getPieceAt(toSquare)
    console.log('Target piece:', targetPiece);
    if (targetPiece && targetPiece.team === playerOrientation) {
      console.log('Validation failed: Cannot capture your own piece');
      return { valid: false, reason: 'Cannot capture your own piece' }
    }

    // Check if trying to capture a king (which is not allowed)
    if (targetPiece && targetPiece.type === Piece.KING) {
      console.log('Validation failed: Cannot capture a king');
      return { valid: false, reason: 'Cannot capture a king' }
    }

    // Check if the move is within the piece's valid moves
    const validMoves = this.getValidMovesForPiece(piece)
    if (!validMoves.includes(toSquare)) {
      console.log('Validation failed: Move not in piece\'s valid moves');
      return { valid: false, reason: 'Invalid move for this piece' }
    }

    // Check if the move would leave the king in check
    if (this.wouldLeaveKingInCheck(fromSquare, toSquare, playerOrientation)) {
      console.log('Validation failed: Move would leave king in check');
      return { valid: false, reason: 'Move would leave king in check' }
    }

    console.log('Validation passed!');
    return { valid: true }
  }

  // Get all valid moves for a piece
  getValidMovesForPiece(piece) {
    const moves = []
    const [x, y] = this.getSquarePosition(piece.square, Orientation.BOTTOM)
    
    // Debug: Removed excessive logging for performance
    
    const addMoveIfValid = (targetX, targetY, canCapture = true, canMoveToEmpty = true) => {
      if (targetX < 0 || targetX >= this.boardSize || targetY < 0 || targetY >= this.boardSize) {
        // Move out of bounds
        return false
      }
      
      const targetSquare = this.getSquare(Orientation.BOTTOM, [targetX, targetY])
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
      case Piece.PAWN: {
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

    // Debug: Generated moves for piece
    return moves
  }

  // Execute a move
  makeMove(fromSquare, toSquare, playerOrientation, promotionPiece = null) {
    console.log('=== CHESS ENGINE MOVE DEBUG ===');
    console.log('Move:', { fromSquare, toSquare, playerOrientation });
    
    const validation = this.isValidMove(fromSquare, toSquare, playerOrientation)
    console.log('Validation result:', validation);
    
    if (!validation.valid) {
      console.log('Move validation failed:', validation.reason);
      return { success: false, error: validation.reason }
    }

    const piece = this.getPieceAt(fromSquare)
    const capturedPiece = this.getPieceAt(toSquare)
    console.log('Piece found:', piece);
    console.log('Captured piece:', capturedPiece);

    // Check if piece is on cooldown
    if (piece.cooldown && piece.cooldown > Date.now()) {
      console.log('Piece is on cooldown');
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
      const [, y] = this.getSquarePosition(toSquare)
      if ((piece.team === Orientation.BOTTOM && y === 0) || 
          (piece.team === Orientation.TOP && y === 7)) {
        // Use provided promotion piece or default to Queen
        const promotionType = promotionPiece !== null ? promotionPiece : Piece.QUEEN
        piece.type = promotionType
        // Update cooldown for promoted piece
        piece.cooldown = Date.now() + cooldownTimes[promotionType]
        console.log(`Pawn promoted to ${promotionType} for team ${piece.team} at position (${toSquare})`);
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

  // Find king of a specific team
  findKing(team) {
    return this.pieces.find(piece => 
      !piece.dead && 
      piece.type === Piece.KING && 
      piece.team === team
    )
  }

  // Get attack squares for a piece (without legal move restrictions)
  getAttackSquaresForPiece(piece) {
    const attacks = []
    const [x, y] = this.getSquarePosition(piece.square, Orientation.BOTTOM)
    
    const addAttackIfValid = (targetX, targetY) => {
      if (targetX < 0 || targetX >= this.boardSize || targetY < 0 || targetY >= this.boardSize) {
        return false
      }
      
      const targetSquare = this.getSquare(Orientation.BOTTOM, [targetX, targetY])
      attacks.push(targetSquare)
      
      const targetPiece = this.getPieceAt(targetSquare)
      return !targetPiece // Can continue if no piece blocking
    }

    switch (piece.type) {
      case Piece.PAWN: {
        // Pawns only attack diagonally
        const direction = piece.team === Orientation.BOTTOM ? -1 : 1
        addAttackIfValid(x - 1, y + direction)
        addAttackIfValid(x + 1, y + direction)
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

  // Get all attackers of a specific square
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

  // Removed: isSquareUnderAttack - use getAttackersOfSquare instead

  // Check if a team's king is in check
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

  // Get enemy teams for a given team (supports 2-4 players)
  getEnemyTeams(team) {
    // Only check teams that actually have pieces in the game
    const activePieces = this.pieces.filter(p => !p.dead)
    const activeTeams = [...new Set(activePieces.map(p => p.team))]
    return activeTeams.filter(t => t !== team)
  }

  // Check if a move would leave the king in check (invalid move)
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
    // Pass the countCooldown flag to treat cooldown attackers as active threats
    const checkResult = this.isInCheck(team, countCooldown)
    
    // Restore the board state
    piece.square = originalSquare
    if (capturedPiece) {
      capturedPiece.dead = false
    }
    
    return checkResult.inCheck
  }

  // Get all legal moves for a piece (excluding moves that leave king in check)
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

  // Check if a team is in checkmate
  isInCheckmate(team) {
    // Check with cooldown attackers treated as active threats
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
      // Use cooldown-aware legality checking for mate search
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

  // Check if a team is in stalemate (no legal moves but not in check)
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

  // Check for insufficient material to continue
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

  // Get comprehensive game status
  getGameStatus() {
    const status = {
      gameState: this.gameState,
      inCheck: {},
      inCheckmate: {},
      inStalemate: {},
      winner: null,
      loser: null,
      gameOver: false,
      gameOverReason: null,
      materialCount: this.getMaterialCount()
    }
    
    // Check insufficient material first
    const materialCheck = this.hasInsufficientMaterial()
    if (materialCheck.insufficient) {
      status.gameOver = true
      status.gameOverReason = materialCheck.reason
      return status
    }
    
    // Check each team's status
    const teams = this.getEnemyTeams(-1) // Get all teams with kings
    teams.push(Orientation.TOP, Orientation.BOTTOM) // Ensure we check main teams
    const uniqueTeams = [...new Set(teams.filter(team => this.findKing(team)))]
    
    for (const team of uniqueTeams) {
      status.inCheck[team] = this.isInCheck(team)
      status.inCheckmate[team] = this.isInCheckmate(team)
      status.inStalemate[team] = this.isInStalemate(team)
      
      // If a team is checkmated, game is over
      if (status.inCheckmate[team].inCheckmate) {
        status.gameOver = true
        status.gameOverReason = 'checkmate'
        // Winner is the remaining team(s)
        status.winner = uniqueTeams.filter(t => t !== team)
        status.loser = team
        break
      }
      
      // Pending checkmate logic removed - checkmate now triggers immediately
      
      // If a team is stalemated, it's a draw
      if (status.inStalemate[team].inStalemate) {
        status.gameOver = true
        status.gameOverReason = 'stalemate'
        break
      }
    }
    
    return status
  }

  getMaterialCount() {
    const materialCount = {}
    
    // Initialize material count for both teams
    for (const team of [Orientation.TOP, Orientation.BOTTOM]) {
      materialCount[team] = {
        total: 0,
        pieces: {
          [Piece.KING]: 0,
          [Piece.QUEEN]: 0,
          [Piece.ROOK]: 0,
          [Piece.BISHOP]: 0,
          [Piece.KNIGHT]: 0,
          [Piece.PAWN]: 0
        }
      }
    }
    
    // Count pieces for each team
    for (const piece of this.pieces) {
      if (!piece.dead && (piece.team === Orientation.TOP || piece.team === Orientation.BOTTOM)) {
        materialCount[piece.team].total++
        materialCount[piece.team].pieces[piece.type]++
      }
    }
    
    return materialCount
  }

  // Check if a move requires pawn promotion
  requiresPromotion(fromSquare, toSquare, playerOrientation) {
    const piece = this.getPieceAt(fromSquare)
    if (!piece || piece.type !== Piece.PAWN || piece.team !== playerOrientation) {
      return false
    }
    
    const [, y] = this.getSquarePosition(toSquare)
    return (piece.team === Orientation.BOTTOM && y === 0) || 
           (piece.team === Orientation.TOP && y === 7)
  }

  // Get current game state
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

  // Get game state for a specific player (with mirrored moves)
  getGameStateForPlayer(playerOrientation) {
    const baseState = this.getGameState()
    
    // For now, just return the pieces as they are
    // Note: Mirroring will be implemented when needed for multi-player support
    return {
      ...baseState,
      pieces: baseState.pieces,
      playerOrientation
    }
  }

  // Pause/resume game
  setGameState(state) {
    this.gameState = state
  }
}
