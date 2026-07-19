// @vitest-environment jsdom
import { useEffect, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { GameProvider, useGame, type GameApi } from './GameContext';
import { SettingsProvider } from './SettingsContext';
import { RecordsProvider } from './RecordsContext';
import { GAME_STORAGE_KEY } from './storage/localGame';
import { GAME_SCHEMA_VERSION } from './gameTypes';
import * as core from '../core';
import type { Grid, Difficulty } from '../core';
import * as historyDb from './storage/historyDb';

/** GameProvider читает настройки и рекорды из соответствующих провайдеров. */
function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <RecordsProvider>
        <GameProvider>{children}</GameProvider>
      </RecordsProvider>
    </SettingsProvider>
  );
}

vi.mock('./storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
}));

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
      <button
        data-testid="place"
        type="button"
        onClick={() => game.inputDigit({ row: 0, col: 0, value: 7 })}
      >
        place
      </button>
      <button data-testid="toggle" type="button" onClick={game.toggleNotesMode}>
        toggle
      </button>
      <button data-testid="start" type="button" onClick={() => game.newGame('easy')}>
        start
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
      <Providers>
        <Probe />
      </Providers>,
    );
    fireEvent.click(screen.getByTestId('start'));
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('cell00').textContent).toBe('7');
  });
  it('inputDigit в режиме заметок ставит кандидата', () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    fireEvent.click(screen.getByTestId('start'));
    fireEvent.click(screen.getByTestId('toggle'));
    fireEvent.click(screen.getByTestId('place'));
    expect(screen.getByTestId('notes00').textContent).toBe('7');
    expect(screen.getByTestId('cell00').textContent).toBe('0');
  });
  it('при первом входе (нет сохранёнки) партия не стартует — статус idle', () => {
    const apiRef = renderGameApi();
    expect(apiRef.current!.state.status).toBe('idle');
  });

  it('при первом входе таймер не тикает', async () => {
    vi.useFakeTimers();
    try {
      const apiRef = renderGameApi();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(apiRef.current!.state.elapsedSeconds).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
      <Providers>
        <Probe />
      </Providers>,
    );
    // Восстановлено значение 4, а не сгенерированная пустая клетка.
    expect(screen.getByTestId('cell00').textContent).toBe('4');
  });
});

/** Кладёт живой GameApi в ref, чтобы тест мог управлять игрой императивно. */
function ApiProbe({ apiRef }: { apiRef: { current: GameApi | null } }) {
  const game = useGame();
  useEffect(() => {
    apiRef.current = game;
  });
  return null;
}

/** Рендерит GameProvider и возвращает ref, хранящий актуальный GameApi. */
function renderGameApi(): { current: GameApi | null } {
  const apiRef: { current: GameApi | null } = { current: null };
  render(
    <Providers>
      <ApiProbe apiRef={apiRef} />
    </Providers>,
  );
  return apiRef;
}

/** Явно стартует партию: из idle переводит в in_progress с сгенерированным пазлом. */
function startGame(apiRef: { current: GameApi | null }, difficulty: Difficulty = 'easy'): void {
  act(() => {
    apiRef.current!.newGame(difficulty);
  });
}

/** Дозаписывает все пустые клетки решением — партия переходит в won. */
function fillFromSolution(apiRef: { current: GameApi | null }): void {
  const { initialGrid, solution } = apiRef.current!.state;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (initialGrid[row][col] !== 0) continue;
      act(() => {
        apiRef.current!.inputDigit({ row, col, value: solution[row][col] });
      });
    }
  }
}

/** Трижды вписывает заведомо неверную цифру в пустую клетку — партия переходит в lost. */
function loseAllLives(apiRef: { current: GameApi | null }): void {
  const { initialGrid, solution } = apiRef.current!.state;
  let row = 0;
  let col = 0;
  outer: for (row = 0; row < 9; row += 1) {
    for (col = 0; col < 9; col += 1) {
      if (initialGrid[row][col] === 0) break outer;
    }
  }
  const wrongValue = solution[row][col] === 1 ? 2 : 1;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    act(() => {
      apiRef.current!.inputDigit({ row, col, value: wrongValue });
    });
  }
}

/**
 * Делает один ход, чтобы партия считалась «начатой», но НЕ завершал её:
 * вписывает заведомо неверную цифру (в тестовой сетке — один «пробел» —
 * верное значение сразу означало бы победу).
 */
function makeOneMove(apiRef: { current: GameApi | null }): void {
  const { initialGrid, solution } = apiRef.current!.state;
  let row = 0;
  let col = 0;
  outer: for (row = 0; row < 9; row += 1) {
    for (col = 0; col < 9; col += 1) {
      if (initialGrid[row][col] === 0) break outer;
    }
  }
  const wrongValue = solution[row][col] === 1 ? 2 : 1;
  act(() => {
    apiRef.current!.inputDigit({ row, col, value: wrongValue });
  });
}

describe('GameProvider — запись CompletedGame', () => {
  beforeEach(() => {
    vi.mocked(historyDb.recordCompletedGame).mockClear();
  });

  it('победа пишет outcome=won ровно один раз', async () => {
    const api = renderGameApi();
    startGame(api);
    fillFromSolution(api);
    await waitFor(() => {
      expect(vi.mocked(historyDb.recordCompletedGame)).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(historyDb.recordCompletedGame).mock.calls[0][0]).toMatchObject({
      outcome: 'won',
    });
  });

  it('поражение (0 жизней) пишет outcome=lost', async () => {
    const api = renderGameApi();
    startGame(api);
    loseAllLives(api);
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'lost')).toBe(true);
    });
  });

  it('новая игра поверх начатой in_progress пишет outcome=abandoned', async () => {
    const api = renderGameApi();
    startGame(api);
    makeOneMove(api);
    act(() => {
      api.current!.newGame('easy');
    });
    await waitFor(() => {
      const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
      expect(calls.some((call) => call[0].outcome === 'abandoned')).toBe(true);
    });
  });

  it('новая игра поверх нетронутой партии не пишет abandoned', async () => {
    const api = renderGameApi();
    act(() => {
      api.current!.newGame('easy');
    });
    await waitFor(() => {}, { timeout: 50 }).catch(() => {});
    const calls = vi.mocked(historyDb.recordCompletedGame).mock.calls;
    expect(calls.some((call) => call[0].outcome === 'abandoned')).toBe(false);
  });
});
