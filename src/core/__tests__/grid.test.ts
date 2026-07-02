import { describe, it, expect } from 'vitest';
import { cloneGrid, getBoxStart, findEmptyCell, isPlacementValid } from '../grid';
import type { Grid } from '../types';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

describe('cloneGrid', () => {
  it('создаёт глубокую копию', () => {
    const grid = emptyGrid();
    const copy = cloneGrid(grid);
    copy[0][0] = 5;
    expect(grid[0][0]).toBe(0);
  });
});

describe('getBoxStart', () => {
  it('возвращает начало блока 3×3', () => {
    expect(getBoxStart(0)).toBe(0);
    expect(getBoxStart(4)).toBe(3);
    expect(getBoxStart(8)).toBe(6);
  });
});

describe('findEmptyCell', () => {
  it('находит первую пустую клетку', () => {
    const grid = emptyGrid();
    grid[0][0] = 1;
    expect(findEmptyCell(grid)).toEqual({ row: 0, col: 1 });
  });
  it('возвращает null для заполненного поля', () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(1));
    expect(findEmptyCell(grid)).toBeNull();
  });
});

describe('isPlacementValid', () => {
  it('отклоняет дубль в строке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 0, col: 3, value: 5 })).toBe(false);
  });
  it('отклоняет дубль в столбце', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 3, col: 0, value: 5 })).toBe(false);
  });
  it('отклоняет дубль в блоке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 1, col: 1, value: 5 })).toBe(false);
  });
  it('разрешает валидную постановку', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    expect(isPlacementValid({ grid, row: 0, col: 3, value: 6 })).toBe(true);
  });
});
