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

describe('PLACE_DIGIT', () => {
  it('вписывает верную цифру без потери жизни', () => {
    const state = createInitialGameState('easy'); // (0,0) solution=5
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next.currentGrid[0][0]).toBe(5);
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].wasMistake).toBe(false);
  });
  it('неверная цифра вписывается и снимает жизнь', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 });
    expect(next.currentGrid[0][0]).toBe(1);
    expect(next.lives).toBe(INITIAL_LIVES - 1);
    expect(next.history[0].wasMistake).toBe(true);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 2, value: 1 });
    expect(next).toBe(state);
  });
  it('автоочистка убирает цифру из заметок соседей и пишет clearedNotes', () => {
    let state = createInitialGameState('easy');
    // Заметка 3 в (0,0) — сосед (0,1) по строке/блоку.
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 3 });
    expect(state.notes[0][0]).toContain(3);
    // Ставим 3 в (0,1) (solution=3) — автоочистка снимает 3 из заметок (0,0).
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 1, value: 3 });
    expect(next.notes[0][0]).not.toContain(3);
    const move = next.history[next.history.length - 1];
    expect(move.clearedNotes).toEqual([{ row: 0, col: 0, prevNotes: [3] }]);
  });
  it('верная последняя цифра завершает партию победой', () => {
    mockPuzzle((() => {
      const puzzle = solved.map((row) => [...row]);
      puzzle[0][0] = 0; // единственная пустая
      return puzzle;
    })());
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next.status).toBe('completed');
    expect(next.result).toBe('won');
  });
  it('третья ошибка обнуляет жизни и завершает партию поражением', () => {
    const state = createInitialGameState('easy'); // lives=3
    const a = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 }); // lives2
    const b = gameReducer(a, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 2 }); // lives1
    const c = gameReducer(b, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 4 }); // lives0
    expect(c.lives).toBe(0);
    expect(c.status).toBe('completed');
    expect(c.result).toBe('lost');
  });
  it('после completed новые ходы игнорируются', () => {
    const state: GameState = { ...createInitialGameState('easy'), status: 'completed', result: 'lost' };
    const next = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    expect(next).toBe(state);
  });
});

describe('TOGGLE_NOTE', () => {
  it('добавляет и убирает кандидата', () => {
    const state = createInitialGameState('easy');
    const added = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(added.notes[0][0]).toEqual([4]);
    const removed = gameReducer(added, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(removed.notes[0][0]).toEqual([]);
  });
  it('держит кандидатов отсортированными', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 7 });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 2 });
    expect(state.notes[0][0]).toEqual([2, 7]);
  });
  it('заметка пишет ход с wasNote и снимком prevNotes', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const move = next.history[next.history.length - 1];
    expect(move.wasNote).toBe(true);
    expect(move.clearedNotes).toEqual([{ row: 0, col: 0, prevNotes: [] }]);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 2, value: 4 });
    expect(next).toBe(state);
  });
  it('нельзя ставить заметку в заполненную клетку', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    const next = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    expect(next).toBe(state);
  });
});

describe('ERASE', () => {
  it('очищает значение и пишет ход', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 });
    const erased = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(erased.currentGrid[0][0]).toBe(0);
    expect(erased.history[erased.history.length - 1].prevValue).toBe(1);
  });
  it('очищает заметки и сохраняет снимок для undo', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const erased = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(erased.notes[0][0]).toEqual([]);
    expect(erased.history[erased.history.length - 1].clearedNotes).toEqual([
      { row: 0, col: 0, prevNotes: [4] },
    ]);
  });
  it('given-клетка — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'ERASE', row: 0, col: 2 });
    expect(next).toBe(state);
  });
  it('пустая клетка без заметок — no-op', () => {
    const state = createInitialGameState('easy');
    const next = gameReducer(state, { type: 'ERASE', row: 0, col: 0 });
    expect(next).toBe(state);
  });
});

describe('UNDO', () => {
  it('откатывает значение и снимает ход из истории', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 5 });
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.currentGrid[0][0]).toBe(0);
    expect(undone.history).toHaveLength(0);
  });
  it('точно восстанавливает заметки соседей после автоочистки', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 3 });
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 1, value: 3 }); // автоочистка (0,0)
    expect(state.notes[0][0]).not.toContain(3);
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.notes[0][0]).toEqual([3]); // заметка соседа восстановлена
    expect(undone.currentGrid[0][1]).toBe(0);
  });
  it('undo НЕ возвращает потерянную жизнь', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'PLACE_DIGIT', row: 0, col: 0, value: 1 }); // ошибка, lives-1
    expect(state.lives).toBe(INITIAL_LIVES - 1);
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.lives).toBe(INITIAL_LIVES - 1); // жизнь не вернулась
    expect(undone.currentGrid[0][0]).toBe(0);
  });
  it('undo заметки возвращает прежние кандидаты', () => {
    let state = createInitialGameState('easy');
    state = gameReducer(state, { type: 'TOGGLE_NOTE', row: 0, col: 0, value: 4 });
    const undone = gameReducer(state, { type: 'UNDO' });
    expect(undone.notes[0][0]).toEqual([]);
  });
  it('пустая история — no-op', () => {
    const state = createInitialGameState('easy');
    expect(gameReducer(state, { type: 'UNDO' })).toBe(state);
  });
});
