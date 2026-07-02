import { type Grid, GRID_SIZE, EMPTY_CELL } from './types';
import { findEmptyCell, isPlacementValid } from './grid';

function shuffled(values: number[]): number[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fillRandomly(grid: Grid): boolean {
  const empty = findEmptyCell(grid);
  if (!empty) return true;
  const { row, col } = empty;
  for (const value of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isPlacementValid({ grid, row, col, value })) {
      grid[row][col] = value;
      if (fillRandomly(grid)) return true;
      grid[row][col] = EMPTY_CELL;
    }
  }
  return false;
}

export function generateFullGrid(): Grid {
  const grid: Grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY_CELL));
  fillRandomly(grid);
  return grid;
}
