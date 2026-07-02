// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GameScreen from './GameScreen';
import * as core from '../../core';
import type { Grid } from '../../core';

// Детерминированная головоломка: одна пустая клетка [0][0], остальное решено.
// Позволяет проверить ввод и детект победы без случайной генерации.
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

function puzzleWithOneHole(): Grid {
  const puzzle = solved.map((row) => [...row]);
  puzzle[0][0] = 0; // единственная пустая клетка
  return puzzle;
}

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({
    puzzle: puzzleWithOneHole(),
    solution: solved,
  });
});

describe('GameScreen', () => {
  it('рендерит сетку и панель', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('board')).toBeTruthy();
    expect(screen.getByTestId('numberpad')).toBeTruthy();
  });

  it('given-клетка отображает своё значение', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('cell-0-1').textContent).toBe('3');
  });

  it('ввод цифры в выбранную клетку заполняет её', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5'));
    expect(screen.getByTestId('cell-0-0').textContent).toBe('5');
  });

  it('правильная последняя цифра завершает партию — показывает оверлей победы', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByTestId('digit-5')); // верное значение [0][0] = 5
    expect(screen.getByTestId('win-overlay')).toBeTruthy();
  });

  it('до победы оверлей не показан', () => {
    render(<GameScreen />);
    expect(screen.queryByTestId('win-overlay')).toBeNull();
  });
});
