import { describe, it, expect } from 'vitest';
import { generateFullGrid, generatePuzzle } from '../generator';
import { isSolved } from '../validator';
import { hasUniqueSolution } from '../solver';
import { DIFFICULTY_CLUES } from '../difficulty';

describe('generateFullGrid', () => {
  it('всегда даёт валидное решённое поле (прогон 20 раз)', () => {
    for (let i = 0; i < 20; i++) {
      expect(isSolved(generateFullGrid())).toBe(true);
    }
  });
  it('даёт разные поля (рандомизация)', () => {
    const a = JSON.stringify(generateFullGrid());
    const b = JSON.stringify(generateFullGrid());
    expect(a).not.toBe(b);
  });
});

describe('generatePuzzle', () => {
  it(
    'головоломка единственно решаема (прогон 10 раз, все сложности)',
    () => {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        for (let i = 0; i < 10; i++) {
          const { puzzle } = generatePuzzle(difficulty);
          expect(hasUniqueSolution(puzzle)).toBe(true);
        }
      }
    },
    60000,
  );

  it('solution решает puzzle и полностью заполнено', () => {
    const { puzzle, solution } = generatePuzzle('easy');
    // каждая открытая клетка puzzle совпадает с solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c]);
      }
    }
    expect(solution.every((row) => row.every((v) => v >= 1 && v <= 9))).toBe(true);
  });

  it('число открытых клеток не ниже минимума сложности', () => {
    const { puzzle } = generatePuzzle('hard');
    const clues = puzzle.flat().filter((v) => v !== 0).length;
    expect(clues).toBeGreaterThanOrEqual(DIFFICULTY_CLUES.hard.min);
  });
});
