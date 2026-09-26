import { describe, it, expect } from 'vitest';
import type { Grid } from '../core';
import {
  SCORE_RULES,
  NO_CLOSED_UNITS,
  cellPoints,
  closedUnitsAt,
  completedUnitsMultiplier,
  scoreCorrectEntry,
  mistakePenalty,
} from './scoring';

const solved: Grid = [
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

function gridWith(changes: Array<{ row: number; col: number; value: number }>): Grid {
  const grid = solved.map((rowValues) => [...rowValues]);
  for (const change of changes) grid[change.row][change.col] = change.value;
  return grid;
}

describe('SCORE_RULES', () => {
  it('шаг и минимум равны base / 10', () => {
    for (const rule of Object.values(SCORE_RULES)) {
      expect(rule.step).toBe(rule.base / 10);
      expect(rule.min).toBe(rule.base / 10);
    }
  });
});

describe('cellPoints', () => {
  it.each([
    { difficulty: 'easy', seconds: 0, expected: 50 },
    { difficulty: 'medium', seconds: 0, expected: 150 },
    { difficulty: 'hard', seconds: 0, expected: 210 },
  ] as const)('база $difficulty = $expected', ({ difficulty, seconds, expected }) => {
    expect(cellPoints({ difficulty, secondsSinceLastCorrect: seconds })).toBe(expected);
  });

  it.each([
    { seconds: 4, expected: 150 },
    { seconds: 5, expected: 135 },
    { seconds: 44, expected: 30 },
    { seconds: 45, expected: 15 },
    { seconds: 200, expected: 15 },
  ])('medium: убывание на границе $seconds с → $expected', ({ seconds, expected }) => {
    expect(cellPoints({ difficulty: 'medium', secondsSinceLastCorrect: seconds })).toBe(expected);
  });

  it('не опускается ниже минимума на easy и hard', () => {
    expect(cellPoints({ difficulty: 'easy', secondsSinceLastCorrect: 1000 })).toBe(5);
    expect(cellPoints({ difficulty: 'hard', secondsSinceLastCorrect: 1000 })).toBe(21);
  });

  it('отрицательный интервал считается нулевым (не даёт больше базы)', () => {
    expect(cellPoints({ difficulty: 'easy', secondsSinceLastCorrect: -7 })).toBe(50);
  });
});

describe('closedUnitsAt', () => {
  it('полностью решённая сетка: строка, столбец и квадрат закрыты', () => {
    expect(closedUnitsAt({ grid: solved, solution: solved, row: 4, col: 4 })).toEqual({
      row: true,
      col: true,
      box: true,
    });
  });

  it('пустая клетка в строке не даёт закрыть строку', () => {
    const grid = gridWith([{ row: 0, col: 8, value: 0 }]);
    const closed = closedUnitsAt({ grid, solution: solved, row: 0, col: 0 });
    expect(closed).toEqual({ row: false, col: true, box: true });
  });

  it('ошибочная цифра линию не закрывает', () => {
    // (8,0) должна быть 3, стоит 9 — столбец 0 заполнен, но не закрыт.
    const grid = gridWith([{ row: 8, col: 0, value: 9 }]);
    const closed = closedUnitsAt({ grid, solution: solved, row: 0, col: 0 });
    expect(closed.col).toBe(false);
  });

  it('квадрат считается по блоку 3×3 клетки', () => {
    const grid = gridWith([{ row: 5, col: 5, value: 0 }]);
    expect(closedUnitsAt({ grid, solution: solved, row: 3, col: 3 }).box).toBe(false);
    expect(closedUnitsAt({ grid, solution: solved, row: 0, col: 0 }).box).toBe(true);
  });
});

describe('completedUnitsMultiplier', () => {
  it.each([
    { closed: NO_CLOSED_UNITS, expected: 1 },
    { closed: { row: true, col: false, box: false }, expected: 5 },
    { closed: { row: true, col: true, box: false }, expected: 10 },
    { closed: { row: true, col: true, box: true }, expected: 15 },
  ])('×$expected', ({ closed, expected }) => {
    expect(completedUnitsMultiplier(closed)).toBe(expected);
  });
});

describe('scoreCorrectEntry', () => {
  it('умножает стоимость клетки на множитель', () => {
    const entry = scoreCorrectEntry({
      difficulty: 'medium',
      secondsSinceLastCorrect: 5,
      closedUnits: { row: true, col: false, box: false },
    });
    expect(entry).toEqual({ multiplier: 5, gained: 675 });
  });
});

describe('mistakePenalty', () => {
  it('снимает base', () => {
    expect(mistakePenalty({ difficulty: 'medium', score: 400 })).toEqual({ score: 250, delta: -150 });
  });

  it('пол 0: фактический штраф меньше базы', () => {
    expect(mistakePenalty({ difficulty: 'medium', score: 100 })).toEqual({ score: 0, delta: -100 });
  });

  it('при нулевом счёте штраф 0', () => {
    expect(mistakePenalty({ difficulty: 'hard', score: 0 })).toEqual({ score: 0, delta: 0 });
  });
});
