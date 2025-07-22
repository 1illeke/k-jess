import './2player.css'

function TwoPlayerBoard() {
  const createChessBoard = () => {
    const board = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0
        const squareId = `${String.fromCharCode(97 + col)}${8 - row}` // a8, b8, etc.
        
        board.push(
          <div
            key={squareId}
            className={`chess-square ${isLight ? 'light' : 'dark'}`}
            data-square={squareId}
          >
            {/* Initial pieces can be added here later */}
          </div>
        )
      }
    }
    return board
  }

  return (
    <div className="chess-board">
      {createChessBoard()}
    </div>
  )
}

export default TwoPlayerBoard 