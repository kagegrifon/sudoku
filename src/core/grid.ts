import { type Grid, GRID_SIZE, BOX_SIZE, EMPTY_CELL } from './types';

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function getBoxStart(index: number): number {
  return Math.floor(index / BOX_SIZE) * BOX_SIZE;
}

export function findEmptyCell(grid: Grid): { row: number; col: number } | null {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === EMPTY_CELL) return { row, col };
    }
  }
  return null;
}

interface PlacementArgs {
  grid: Grid;
  row: number;
  col: number;
  value: number;
}

export function isPlacementValid({ grid, row, col, value }: PlacementArgs): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (i !== col && grid[row][i] === value) return false;
    if (i !== row && grid[i][col] === value) return false;
  }
  const boxRow = getBoxStart(row);
  const boxCol = getBoxStart(col);
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if ((r !== row || c !== col) && grid[r][c] === value) return false;
    }
  }
  return true;
}
