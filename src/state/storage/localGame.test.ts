// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, clearGame, withScoreDefaults, GAME_STORAGE_KEY } from './localGame';
import { GAME_SCHEMA_VERSION, INITIAL_LIVES, type GameState } from '../gameTypes';
import { createInitialScoreFields } from '../gameReducer';

function sampleState(overrides: Partial<GameState> = {}): GameState {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]));
  notes[0][0] = [1, 5, 9]; // проверяем сериализацию number[][][]
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    puzzleId: 'p1',
    difficulty: 'easy',
    initialGrid: grid,
    currentGrid: grid.map((r) => [...r]),
    solution: grid.map((r) => [...r]),
    notes,
    history: [],
    lives: INITIAL_LIVES,
    elapsedSeconds: 7,
    startedAt: '2026-07-03T00:00:00.000Z',
    status: 'in_progress',
    ...createInitialScoreFields(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('localGame', () => {
  it('round-trip сохраняет и загружает партию, включая notes как number[][][]', () => {
    const state = sampleState();
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.notes[0][0]).toEqual([1, 5, 9]);
    expect(loaded?.elapsedSeconds).toBe(7);
  });
  it('null, если ничего не сохранено', () => {
    expect(loadGame()).toBeNull();
  });
  it('null при чужом schemaVersion (партия отбрасывается)', () => {
    saveGame(sampleState({ schemaVersion: 999 }));
    expect(loadGame()).toBeNull();
  });
  it('null для завершённой партии (восстанавливаем только незавершённые)', () => {
    saveGame(sampleState({ status: 'completed', result: 'won' }));
    expect(loadGame()).toBeNull();
  });
  it('восстанавливает партию на паузе', () => {
    saveGame(sampleState({ status: 'paused' }));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe('paused');
  });
  it('null при битом JSON', () => {
    localStorage.setItem(GAME_STORAGE_KEY, '{не json');
    expect(loadGame()).toBeNull();
  });
  it('сохранение idle-партии стирает существующую сохранёнку (хранить нечего)', () => {
    saveGame(sampleState({ status: 'in_progress' }));
    saveGame(sampleState({ status: 'idle' }));
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
  });
  it('clearGame удаляет запись', () => {
    saveGame(sampleState());
    clearGame();
    expect(loadGame()).toBeNull();
  });
});

const SCORE_FIELD_NAMES = ['score', 'lastCorrectAtSecond', 'scoredCells', 'lastScoreEvent'];

/** Партия в формате до фичи очков: тех же полей просто нет в JSON. */
function saveLegacyGame(overrides: Partial<GameState> = {}): void {
  const legacy: Record<string, unknown> = { ...sampleState(overrides) };
  for (const field of SCORE_FIELD_NAMES) delete legacy[field];
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(legacy));
}

function solvedLikeGrid(): number[][] {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1),
  );
}

describe('localGame — мягкая миграция очков', () => {
  it('старая партия без полей очков восстанавливается, а не отбрасывается', () => {
    saveLegacyGame({ elapsedSeconds: 42 });
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.score).toBe(0);
    expect(loaded?.lastCorrectAtSecond).toBe(42);
    expect(loaded?.lastScoreEvent).toBeNull();
  });

  it('scoredCells = true только для уже верных НЕ исходных клеток', () => {
    const solution = solvedLikeGrid();
    const initialGrid = solution.map((row) => [...row]);
    initialGrid[0][0] = 0; // игрок поставил верно
    initialGrid[0][1] = 0; // игрок поставил неверно
    initialGrid[0][2] = 0; // пусто
    const currentGrid = solution.map((row) => [...row]);
    currentGrid[0][1] = solution[0][1] === 1 ? 2 : 1;
    currentGrid[0][2] = 0;
    saveLegacyGame({ solution, initialGrid, currentGrid });

    const scoredCells = loadGame()?.scoredCells;
    expect(scoredCells?.[0][0]).toBe(true);
    expect(scoredCells?.[0][1]).toBe(false);
    expect(scoredCells?.[0][2]).toBe(false);
    expect(scoredCells?.[4][4]).toBe(false); // исходная клетка очков не приносила
  });

  it('сохранённое lastScoreEvent при загрузке сбрасывается', () => {
    saveGame(
      sampleState({
        score: 300,
        lastScoreEvent: {
          id: 3,
          row: 0,
          col: 0,
          delta: 50,
          multiplier: 1,
          closedUnits: { row: false, col: false, box: false },
        },
      }),
    );
    const loaded = loadGame();
    expect(loaded?.score).toBe(300);
    expect(loaded?.lastScoreEvent).toBeNull();
  });

  it('withScoreDefaults не трогает уже заполненные поля', () => {
    const state = sampleState({ score: 120, lastCorrectAtSecond: 3 });
    const migrated = withScoreDefaults(state);
    expect(migrated.score).toBe(120);
    expect(migrated.lastCorrectAtSecond).toBe(3);
    expect(migrated.scoredCells).toBe(state.scoredCells);
  });
});
