import { type Grid, type Difficulty, GRID_SIZE, EMPTY_CELL } from './types';
import { findEmptyCell, isPlacementValid, cloneGrid } from './grid';
import { hasUniqueSolution } from './solver';
import { targetCluesFor } from './difficulty';

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

export function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = generateFullGrid();
  const puzzle = cloneGrid(solution);
  const targetClues = targetCluesFor(difficulty);

  const positions = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;

  for (const pos of positions) {
    if (clues <= targetClues) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (puzzle[row][col] === EMPTY_CELL) continue;

    const backup = puzzle[row][col];
    puzzle[row][col] = EMPTY_CELL;

    if (hasUniqueSolution(puzzle)) {
      clues--;
    } else {
      puzzle[row][col] = backup; // откат — удаление ломает единственность
    }
  }

  return { puzzle, solution };
}
