import { GRID_SIZE, type Grid } from '../../core';
import Cell from './Cell';
import { computeHighlight, type CellPosition } from './cellHighlight';
import styles from './Board.module.css';

export interface BoardProps {
  grid: Grid;
  conflicts: boolean[][];
  selected: CellPosition | null;
  cellIsGiven(row: number, col: number): boolean;
  onSelectCell(args: { row: number; col: number }): void;
  notes?: number[][][];
  mistakes?: boolean[][];
  highlightSameDigits?: boolean;
  highlightPeers?: boolean;
}

const ROW_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);
const COL_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);

export default function Board({
  grid,
  conflicts,
  selected,
  cellIsGiven,
  onSelectCell,
  notes,
  mistakes,
  highlightSameDigits,
  highlightPeers,
}: BoardProps) {
  return (
    <div className={styles.board} data-testid="board" role="grid">
      {ROW_INDICES.map((row) =>
        COL_INDICES.map((col) => {
          const pos = { row, col };
          const highlight = computeHighlight({
            pos,
            selected,
            grid,
            conflicts,
            mistakes,
            highlightSameDigits,
            highlightPeers,
          });
          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              value={grid[row][col]}
              given={cellIsGiven(row, col)}
              highlight={highlight}
              notes={notes?.[row]?.[col]}
              onSelect={onSelectCell}
            />
          );
        }),
      )}
    </div>
  );
}
