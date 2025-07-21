import './3player.css';

export default function ThreePlayerBoard() {
  const SIDE = 5;
  const SIZE = SIDE * 2 - 1;      // 9 rows
  const COLS = SIDE * 3 - 2;      // 13 cols

  const cells = [];
  for (let row = 0; row < SIZE; row++) {
    const rowLen = row < SIDE
      ? SIDE + row
      : SIDE + (SIZE - 1 - row);
    const offset = (COLS - rowLen) >> 1;

    for (let i = 0; i < rowLen; i++) {
      const col = offset + i;
      const isLight = (row + col) % 2 === 0;

      // determine shape type:
      // • center 3×3 block → rhombus  
      // • the “next ring” → kite  
      // • outermost cells → parallelogram
      const distToCenterRow = Math.abs(row - (SIZE-1)/2);
      const distToCenterCol = Math.abs(col - (COLS-1)/2);
      let shapeClass;
      if (distToCenterRow <= 1 && distToCenterCol <= 1) {
        shapeClass = 'shape-rhombus';
      } else if (distToCenterRow <= 2 && distToCenterCol <= 2) {
        shapeClass = 'shape-kite';
      } else {
        shapeClass = 'shape-parallelogram';
      }

      cells.push(
        <div
          key={`${row}-${col}`}
          className={
            `chess-square-3p ${isLight ? 'light' : 'dark'} ${shapeClass}`
          }
          style={{
            gridRow: row + 1,
            gridColumn: col + 1
          }}
          data-row={row}
          data-col={col}
        />
      );
    }
  }

  return (
    <div
      className="chess-board-3p"
      style={{
        gridTemplateRows:   `repeat(${SIZE}, 1fr)`,
        gridTemplateColumns:`repeat(${COLS}, 1fr)`,
        maxWidth:  '90vmin',
        maxHeight: '90vmin',
      }}
    >
      {cells}
    </div>
  );
} 