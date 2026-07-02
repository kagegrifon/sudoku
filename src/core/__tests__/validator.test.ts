import { describe, it, expect } from 'vitest';
import { findConflicts, isSolved } from '../validator';
import type { Grid } from '../types';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));

const solvedGrid: Grid = [
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

describe('findConflicts', () => {
  it('нет конфликтов на решённом поле', () => {
    const conflicts = findConflicts(solvedGrid);
    expect(conflicts.flat().some(Boolean)).toBe(false);
  });
  it('ловит дубль в строке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[0][4] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[0][4]).toBe(true);
    expect(conflicts[0][1]).toBe(false);
  });
  it('ловит дубль в столбце', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[4][0] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[4][0]).toBe(true);
  });
  it('ловит дубль в блоке', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[1][1] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts[0][0]).toBe(true);
    expect(conflicts[1][1]).toBe(true);
  });
  it('пустые клетки не конфликтуют', () => {
    const conflicts = findConflicts(emptyGrid());
    expect(conflicts.flat().some(Boolean)).toBe(false);
  });
});

describe('isSolved', () => {
  it('true для решённого поля', () => {
    expect(isSolved(solvedGrid)).toBe(true);
  });
  it('false для пустого', () => {
    expect(isSolved(emptyGrid())).toBe(false);
  });
  it('false при конфликте', () => {
    const grid = solvedGrid.map((row) => [...row]);
    grid[0][0] = grid[0][1]; // создаём дубль
    expect(isSolved(grid)).toBe(false);
  });
});
