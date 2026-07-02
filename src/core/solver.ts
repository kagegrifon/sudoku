import { type Grid, GRID_SIZE, EMPTY_CELL } from './types';
import { cloneGrid, findEmptyCell, isPlacementValid } from './grid';

/**
 * Backtracking only ever fills empty cells, so it can never detect a conflict
 * that already exists among the given (pre-filled) cells — it would instead
 * exhaustively search the remaining empty cells forever looking for a fix
 * that can't exist. Reject such grids up front before searching.
 */
function isGridConsistent(grid: Grid): boolean {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const value = grid[row][col];
      if (value === EMPTY_CELL) continue;
      grid[row][col] = EMPTY_CELL;
      const valid = isPlacementValid({ grid, row, col, value });
      grid[row][col] = value;
      if (!valid) return false;
    }
  }
  return true;
}

export function solve(grid: Grid): Grid | null {
  if (!isGridConsistent(grid)) return null;
  const working = cloneGrid(grid);
  const solved = fillFrom(working);
  return solved ? working : null;
}

function fillFrom(grid: Grid): boolean {
  const empty = findEmptyCell(grid);
  if (!empty) return true;
  const { row, col } = empty;
  for (let value = 1; value <= GRID_SIZE; value++) {
    if (isPlacementValid({ grid, row, col, value })) {
      grid[row][col] = value;
      if (fillFrom(grid)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

export function countSolutions(grid: Grid, limit = 2): number {
  if (!isGridConsistent(grid)) return 0;
  const working = cloneGrid(grid);
  let found = 0;

  const search = (): void => {
    if (found >= limit) return;
    const empty = findEmptyCell(working);
    if (!empty) {
      found++;
      return;
    }
    const { row, col } = empty;
    for (let value = 1; value <= GRID_SIZE; value++) {
      if (found >= limit) return;
      if (isPlacementValid({ grid: working, row, col, value })) {
        working[row][col] = value;
        search();
        working[row][col] = 0;
      }
    }
  };

  search();
  return found;
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}
