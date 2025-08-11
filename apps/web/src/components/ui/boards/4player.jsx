import './4player.css'

function FourPlayerBoard() {
  const createFourPlayerBoard = () => {
    const board = []
    const centerSize = 8 
    const extensionLength = 3 
    const totalSize = centerSize + (extensionLength * 2)
    
    for (let row = 0; row < totalSize; row++) {
      for (let col = 0; col < totalSize; col++) {
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