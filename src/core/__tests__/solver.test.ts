import { describe, it, expect } from 'vitest';
import { solve, countSolutions, hasUniqueSolution } from '../solver';
import type { Grid } from '../types';

// Валидная головоломка с единственным решением (known-answer).
const uniquePuzzle: Grid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

describe('solve', () => {
  it('решает валидную головоломку', () => {
    const solution = solve(uniquePuzzle);
    expect(solution).not.toBeNull();
    // все клетки заполнены 1..9
    expect(solution!.every((row) => row.every((v) => v >= 1 && v <= 9))).toBe(true);
  });

  it('возвращает null для нерешаемого поля', () => {
    const bad = emptyGrid();
    bad[0][0] = 5;
    bad[0][1] = 5; // конфликт в строке — нерешаемо
    expect(solve(bad)).toBeNull();
  });
});

describe('countSolutions', () => {
  it('единственное решение = 1', () => {
    expect(countSolutions(uniquePuzzle, 2)).toBe(1);
  });
  it('пустое поле имеет более одного решения (стоп на limit)', () => {
    expect(countSolutions(emptyGrid(), 2)).toBe(2);
  });
});

describe('hasUniqueSolution', () => {
  it('true для единственно решаемой', () => {
    expect(hasUniqueSolution(uniquePuzzle)).toBe(true);
  });
  it('false для пустого поля', () => {
    expect(hasUniqueSolution(emptyGrid())).toBe(false);
  });
});
