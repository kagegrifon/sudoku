import { describe, it, expect } from 'vitest';
import { countRemainingDigits } from './remainingDigits';
import type { Grid } from '../core';

const solution: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

describe('countRemainingDigits', () => {
  it('пустое поле: каждая цифра — 0 размещено, 9 осталось', () => {
    const result = countRemainingDigits({ currentGrid: emptyGrid(), solution });
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(result[digit]).toEqual({ placed: 0, remaining: 9 });
    }
  });

  it('полностью решённое поле: каждая цифра размещена 9 раз, 0 осталось', () => {
    const result = countRemainingDigits({ currentGrid: solution, solution });
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(result[digit]).toEqual({ placed: 9, remaining: 0 });
    }
  });

  it('верно вписанная цифра уменьшает остаток, ошибочная — нет', () => {
    const grid = emptyGrid();
    grid[0][0] = 5; // верно (solution 5)
    grid[0][1] = 9; // ошибка (solution 3)
    const result = countRemainingDigits({ currentGrid: grid, solution });
    expect(result[5]).toEqual({ placed: 1, remaining: 8 });
    // 9 вписана ошибочно (не на своё место) — не считается размещённой.
    expect(result[9]).toEqual({ placed: 0, remaining: 9 });
    // 3 (правильное значение клетки) осталась нетронутой.
    expect(result[3]).toEqual({ placed: 0, remaining: 9 });
  });
});
