import './4player.css'

function FourPlayerBoard() {
  // Create 4-player chess board in cross shape
  const createFourPlayerBoard = () => {
    const board = []
    const centerSize = 8 // Central 8x8 area
    const extensionLength = 3 // How far each arm extends
    const totalSize = centerSize + (extensionLength * 2) // 14 total
    
    for (let row = 0; row < totalSize; row++) {
      for (let col = 0; col < totalSize; col++) {
        // Define the cross shape boundaries
        const inVerticalArm = col >= extensionLength && col < extensionLength + centerSize
        const inHorizontalArm = row >= extensionLength && row < extensionLength + centerSize
        
        // Only render squares that are part of the cross
        if (!(inVerticalArm || inHorizontalArm)) {
          continue
        }
        
        const isLight = (row + col) % 2 === 0
        const squareId = `${String.fromCharCode(97 + col)}${totalSize - row}`
        
        board.push(
          <div
            key={squareId}
            className={`chess-square-4p ${isLight ? 'light' : 'dark'}`}
            data-square={squareId}
            data-row={row}
            data-col={col}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1
            }}
          >
          </div>
        )
      }
    }
    return board
  }



  return (
    <div className="chess-board-4p">
      {createFourPlayerBoard()}
    </div>
  )
}

export default FourPlayerBoard 