import { describe, it, expect } from 'vitest';
import { collectCompletedDigits, countRemainingDigits } from './remainingDigits';
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

/** Поле, на котором верно расставлены все девять вхождений указанной цифры. */
function gridWithDigitFullyPlaced(digit: number): Grid {
  const grid = emptyGrid();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (solution[row][col] === digit) grid[row][col] = digit;
    }
  }
  return grid;
}

describe('collectCompletedDigits', () => {
  it('пустое поле: ни одна цифра не завершена', () => {
    const remainingByDigit = countRemainingDigits({ currentGrid: emptyGrid(), solution });
    expect(collectCompletedDigits(remainingByDigit)).toEqual(new Set());
  });

  it('цифра попадает в набор, когда расставлены все девять её вхождений', () => {
    const remainingByDigit = countRemainingDigits({
      currentGrid: gridWithDigitFullyPlaced(7),
      solution,
    });
    expect(collectCompletedDigits(remainingByDigit)).toEqual(new Set([7]));
  });

  it('восьми вхождений недостаточно', () => {
    const grid = gridWithDigitFullyPlaced(7);
    grid[0][4] = 0; // убираем одну из девяти семёрок
    const remainingByDigit = countRemainingDigits({ currentGrid: grid, solution });
    expect(collectCompletedDigits(remainingByDigit)).toEqual(new Set());
  });

  it('ошибочно вписанная девятая цифра не завершает набор', () => {
    const grid = gridWithDigitFullyPlaced(7);
    grid[0][4] = 0; // solution[0][4] === 7 — освобождаем клетку
    grid[0][0] = 7; // вписываем семёрку не на своё место (solution 5)
    const remainingByDigit = countRemainingDigits({ currentGrid: grid, solution });
    expect(collectCompletedDigits(remainingByDigit)).toEqual(new Set());
  });

  it('решённое поле: завершены все девять цифр', () => {
    const remainingByDigit = countRemainingDigits({ currentGrid: solution, solution });
    expect(collectCompletedDigits(remainingByDigit)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });
});
