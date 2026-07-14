import { EMPTY_CELL, GRID_SIZE, type Grid } from '../core';

export interface RemainingDigit {
  /** Сколько раз цифра ВЕРНО размещена (совпадает с решением). */
  placed: number;
  /** Сколько ещё осталось разместить: 9 − placed. */
  remaining: number;
}

/**
 * Для каждой цифры 1..9 считает, сколько её верных вхождений уже на поле
 * (клетка непустая И совпадает с решением) и сколько осталось до девяти.
 * Ошибочно вписанные цифры не учитываются как размещённые.
 */
export function countRemainingDigits({
  currentGrid,
  solution,
}: {
  currentGrid: Grid;
  solution: Grid;
}): Record<number, RemainingDigit> {
  const placedByDigit = new Map<number, number>();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = currentGrid[row][col];
      if (value === EMPTY_CELL) continue;
      if (value !== solution[row][col]) continue;
      placedByDigit.set(value, (placedByDigit.get(value) ?? 0) + 1);
    }
  }

  const result: Record<number, RemainingDigit> = {};
  for (let digit = 1; digit <= GRID_SIZE; digit += 1) {
    const placed = placedByDigit.get(digit) ?? 0;
    result[digit] = { placed, remaining: GRID_SIZE - placed };
  }
  return result;
}
