// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import { GameProvider } from '../../state/GameContext';
import * as core from '../../core';
import type { Grid } from '../../core';

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
function puzzleOneHole(): Grid {
  const puzzle = solved.map((r) => [...r]);
  puzzle[0][0] = 0;
  return puzzle;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle: puzzleOneHole(), solution: solved });
});
afterEach(cleanup);

function renderHeader(onNewGame = () => {}) {
  return render(
    <GameProvider>
      <Header onNewGame={onNewGame} />
    </GameProvider>,
  );
}

describe('Header', () => {
  it('показывает стартовый таймер 00:00', () => {
    renderHeader();
    expect(screen.getByTestId('timer').textContent).toBe('00:00');
  });
  it('показывает индикатор жизней', () => {
    renderHeader();
    expect(screen.getByTestId('lives')).toBeTruthy();
  });
  it('Undo задизейблен на пустой истории', () => {
    renderHeader();
    expect(screen.getByTestId('undo').hasAttribute('disabled')).toBe(true);
  });
  it('клик по «Новая» вызывает onNewGame', () => {
    const onNewGame = vi.fn();
    renderHeader(onNewGame);
    fireEvent.click(screen.getByTestId('new-game'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
  it('toggle заметок переключает aria-pressed', () => {
    renderHeader();
    const toggle = screen.getByTestId('notes-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
