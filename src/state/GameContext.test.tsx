// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { GAME_STORAGE_KEY } from './storage/localGame';
import { GAME_SCHEMA_VERSION } from './gameTypes';
import * as core from '../core';
import type { Grid } from '../core';

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

function Probe() {
  const game = useGame();
  return (
    <div>
      <span data-testid="cell00">{game.state.currentGrid[0][0]}</span>
      <span data-testid="notes00">{game.state.notes[0][0].join(',')}</span>
      <span data-testid="notesMode">{String(game.notesMode)}</span>
      <button data-testid="place" type="button" onClick={() => game.inputDigit({ row: 0, col: 0, value: 7 })}>
        place
      </button>
      <button data-testid="toggle" type="button" onClick={game.toggleNotesMode}>
        toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle: puzzleOneHole(), solution: solved });
});
afterEach(cleanup);

describe('GameContext', () => {
  it('inputDigit в обычном режиме ставит цифру', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('cell00').textContent).toBe('7');
  });
  it('inputDigit в режиме заметок ставит кандидата', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('notes00').textContent).toBe('7');
    expect(screen.getByTestId('cell00').textContent).toBe('0');
  });
  it('восстанавливает in_progress партию из localStorage', () => {
    const saved = {
      schemaVersion: GAME_SCHEMA_VERSION,
      puzzleId: 'restored',
      difficulty: 'easy',
      initialGrid: puzzleOneHole(),
      currentGrid: (() => {
        const g = puzzleOneHole();
        g[0][0] = 4;
        return g;
      })(),
      solution: solved,
      notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])),
      history: [],
      lives: 2,
      elapsedSeconds: 33,
      startedAt: '2026-07-03T00:00:00.000Z',
      status: 'in_progress',
    };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(saved));
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    // Восстановлено значение 4, а не сгенерированная пустая клетка.
    expect(screen.getByTestId('cell00').textContent).toBe('4');
  });
});
