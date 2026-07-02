import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  gameBoardReducer,
  isGiven,
  type GameBoardState,
} from './gameBoardReducer';
import { EMPTY_CELL } from '../../core';

// Ищет пустую (редактируемую) клетку в исходной головоломке.
function findEditable(state: GameBoardState): { row: number; col: number } {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.puzzle[row][col] === EMPTY_CELL) return { row, col };
    }
  }
  throw new Error('нет пустых клеток — головоломка невозможна');
}

// Ищет заданную (given) клетку.
function findGivenCell(state: GameBoardState): { row: number; col: number } {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.puzzle[row][col] !== EMPTY_CELL) return { row, col };
    }
  }
  throw new Error('нет заданных клеток');
}

describe('createInitialState', () => {
  it('grid стартует как копия puzzle', () => {
    const state = createInitialState('easy');
    expect(state.grid).toEqual(state.puzzle);
  });
  it('grid — независимая копия (мутация не задевает puzzle)', () => {
    const state = createInitialState('easy');
    state.grid[0][0] = 9;
    expect(state.puzzle[0][0]).not.toBe(9);
  });
  it('хранит выбранную сложность', () => {
    expect(createInitialState('hard').difficulty).toBe('hard');
  });
});

describe('isGiven', () => {
  it('true для заданной клетки, false для пустой', () => {
    const state = createInitialState('easy');
    const given = findGivenCell(state);
    const editable = findEditable(state);
    expect(isGiven(state, given.row, given.col)).toBe(true);
    expect(isGiven(state, editable.row, editable.col)).toBe(false);
  });
});

describe('PLACE_DIGIT', () => {
  it('вписывает цифру в редактируемую клетку', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    expect(next.grid[row][col]).toBe(5);
  });
  it('не мутирует исходный state (иммутабельность)', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    expect(state.grid[row][col]).toBe(EMPTY_CELL);
  });
  it('given-клетка не меняется (no-op)', () => {
    const state = createInitialState('easy');
    const { row, col } = findGivenCell(state);
    const original = state.grid[row][col];
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 1 });
    expect(next.grid[row][col]).toBe(original);
  });
  it('вписывает даже неверную цифру (проверка ошибок — фаза 5)', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const wrong = state.solution[row][col] === 1 ? 2 : 1;
    const next = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: wrong });
    expect(next.grid[row][col]).toBe(wrong);
  });
});

describe('ERASE', () => {
  it('очищает редактируемую клетку', () => {
    const state = createInitialState('easy');
    const { row, col } = findEditable(state);
    const placed = gameBoardReducer(state, { type: 'PLACE_DIGIT', row, col, value: 5 });
    const erased = gameBoardReducer(placed, { type: 'ERASE', row, col });
    expect(erased.grid[row][col]).toBe(EMPTY_CELL);
  });
  it('given-клетку не стирает', () => {
    const state = createInitialState('easy');
    const { row, col } = findGivenCell(state);
    const original = state.grid[row][col];
    const next = gameBoardReducer(state, { type: 'ERASE', row, col });
    expect(next.grid[row][col]).toBe(original);
  });
});

describe('NEW_GAME', () => {
  it('создаёт новую партию заданной сложности', () => {
    const state = createInitialState('easy');
    const next = gameBoardReducer(state, { type: 'NEW_GAME', difficulty: 'hard' });
    expect(next.difficulty).toBe('hard');
    expect(next.grid).toEqual(next.puzzle);
  });
});
