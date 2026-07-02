import { type Grid, GRID_SIZE, EMPTY_CELL } from './types';

export function findConflicts(grid: Grid): boolean[][] {
  const conflicts: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false),
  );

  const markDuplicates = (cells: Array<{ row: number; col: number }>): void => {
    const seen = new Map<number, Array<{ row: number; col: number }>>();
    for (const cell of cells) {
      const value = grid[cell.row][cell.col];
      if (value === EMPTY_CELL) continue;
      const group = seen.get(value) ?? [];
      group.push(cell);
      seen.set(value, group);
    }
    for (const group of seen.values()) {
      if (group.length > 1) {
        for (const cell of group) conflicts[cell.row][cell.col] = true;
      }
    }
  };

  for (let i = 0; i < GRID_SIZE; i++) {
    const rowCells = Array.from({ length: GRID_SIZE }, (_, col) => ({ row: i, col }));
    const colCells = Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col: i }));
    markDuplicates(rowCells);
    markDuplicates(colCells);
  }

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += 3) {
      const boxCells: Array<{ row: number; col: number }> = [];
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          boxCells.push({ row: r, col: c });
        }
      }
      markDuplicates(boxCells);
    }
  }

  return conflicts;
}

export function isSolved(grid: Grid): boolean {
  const isFull = grid.every((row) => row.every((value) => value !== EMPTY_CELL));
  if (!isFull) return false;
  return !findConflicts(grid).flat().some(Boolean);
}
