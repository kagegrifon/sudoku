// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, clearGame, GAME_STORAGE_KEY } from './localGame';
import { GAME_SCHEMA_VERSION, INITIAL_LIVES, type GameState } from '../gameTypes';

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
