import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInitialGameState, gameReducer, isGiven } from './gameReducer';
import { GAME_SCHEMA_VERSION, INITIAL_LIVES, type GameState } from './gameTypes';
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

// Головоломка с несколькими пустыми клетками, часть из которых — соседи по юниту.
// (0,0) и (0,1) — одна строка и один блок 3×3 (нужно для теста автоочистки).
function puzzleWithHoles(): Grid {
  const puzzle = solved.map((row) => [...row]);
  puzzle[0][0] = 0; // solution 5
  puzzle[0][1] = 0; // solution 3
  puzzle[4][4] = 0; // solution 5
  puzzle[8][8] = 0; // solution 9
  return puzzle;
}

function mockPuzzle(puzzle: Grid): void {
  vi.spyOn(core, 'generatePuzzle').mockReturnValue({ puzzle, solution: solved });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockPuzzle(puzzleWithHoles());
});

describe('createInitialGameState', () => {
  it('заполняет поля стартовой партии', () => {
    const state = createInitialGameState('easy');
    expect(state.schemaVersion).toBe(GAME_SCHEMA_VERSION);
    expect(state.difficulty).toBe('easy');
    expect(state.lives).toBe(INITIAL_LIVES);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.status).toBe('in_progress');
    expect(state.history).toEqual([]);
    expect(typeof state.puzzleId).toBe('string');
    expect(state.puzzleId.length).toBeGreaterThan(0);
  });
  it('currentGrid — независимая копия initialGrid', () => {
    const state = createInitialGameState('easy');
    expect(state.currentGrid).toEqual(state.initialGrid);
    state.currentGrid[0][0] = 9;
    expect(state.initialGrid[0][0]).not.toBe(9);
  });
  it('notes — сетка 9×9 пустых массивов', () => {
    const state = createInitialGameState('easy');
    expect(state.notes).toHaveLength(9);
    expect(state.notes[0]).toHaveLength(9);
    expect(state.notes[0][0]).toEqual([]);
  });
});

describe('isGiven', () => {
  it('true для заданной клетки, false для пустой', () => {
    const state = createInitialGameState('easy');
    expect(isGiven(state, 0, 2)).toBe(true); // given (8)
    expect(isGiven(state, 0, 0)).toBe(false); // hole
  });
});

describe('TICK', () => {
  it('инкрементит elapsedSeconds в in_progress', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TICK' });
    expect(next.elapsedSeconds).toBe(1);
  });
  it('не тикает в completed', () => {
    const state: GameState = { ...createInitialGameState('easy'), status: 'completed', result: 'won' };
    const next = gameReducer(state, { type: 'TICK' });
    expect(next.elapsedSeconds).toBe(0);
  });
});

describe('NEW_GAME', () => {
  it('создаёт свежую партию заданной сложности', () => {
    const state = { ...createInitialGameState('easy'), elapsedSeconds: 99, lives: 1 };
    const next = gameReducer(state, { type: 'NEW_GAME', difficulty: 'hard' });
    expect(next.difficulty).toBe('hard');
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.status).toBe('in_progress');
  });
});

describe('RESTORE', () => {
  it('возвращает переданное состояние', () => {
    const state = createInitialGameState('easy');
    const saved: GameState = { ...createInitialGameState('medium'), elapsedSeconds: 42 };
    const next = gameReducer(state, { type: 'RESTORE', state: saved });
    expect(next).toBe(saved);
    expect(next.elapsedSeconds).toBe(42);
  });
});
