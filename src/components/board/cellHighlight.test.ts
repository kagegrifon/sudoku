import { describe, it, expect } from 'vitest';
import { isSameUnit, computeHighlight } from './cellHighlight';
import type { Grid } from '../../core';

const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));
const noConflicts = (): boolean[][] => Array.from({ length: 9 }, () => Array(9).fill(false));

describe('isSameUnit', () => {
  it('true для одной строки', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 0, col: 8 })).toBe(true);
  });
  it('true для одного столбца', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 8, col: 0 })).toBe(true);
  });
  it('true для одного блока 3×3', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(true);
  });
  it('true для той же клетки', () => {
    expect(isSameUnit({ row: 4, col: 4 }, { row: 4, col: 4 })).toBe(true);
  });
  it('false для несвязанных клеток', () => {
    expect(isSameUnit({ row: 0, col: 0 }, { row: 5, col: 8 })).toBe(false);
  });
});

describe('computeHighlight', () => {
  it('без выбранной клетки — только конфликт', () => {
    const grid = emptyGrid();
    const conflicts = noConflicts();
    conflicts[3][3] = true;
    const highlight = computeHighlight({
      pos: { row: 3, col: 3 },
      selected: null,
      grid,
      conflicts,
    });
    expect(highlight).toEqual({
      selected: false,
      peer: false,
      sameValue: false,
      conflict: true,
      mistake: false,
    });
  });

  it('mistake прокидывается из массива mistakes', () => {
    const grid = emptyGrid();
    const mistakes = noConflicts();
    mistakes[2][2] = true;
    const highlight = computeHighlight({
      pos: { row: 2, col: 2 },
      selected: null,
      grid,
      conflicts: noConflicts(),
      mistakes,
    });
    expect(highlight.mistake).toBe(true);
  });

  it('сама выбранная клетка помечена selected, не peer и не sameValue', () => {
    const grid = emptyGrid();
    grid[4][4] = 7;
    const highlight = computeHighlight({
      pos: { row: 4, col: 4 },
      selected: { row: 4, col: 4 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.selected).toBe(true);
    expect(highlight.peer).toBe(false);
    expect(highlight.sameValue).toBe(false);
  });

  it('клетка в одном столбце с выбранной — peer', () => {
    const grid = emptyGrid();
    const highlight = computeHighlight({
      pos: { row: 0, col: 4 },
      selected: { row: 8, col: 4 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.peer).toBe(true);
    expect(highlight.selected).toBe(false);
  });

  it('одинаковое значение подсвечивается как sameValue', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[8][8] = 5; // не в одном юните с выбранной
    const highlight = computeHighlight({
      pos: { row: 8, col: 8 },
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.sameValue).toBe(true);
    expect(highlight.peer).toBe(false);
  });

  it('пустая клетка не даёт sameValue', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    const highlight = computeHighlight({
      pos: { row: 8, col: 8 },
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
    });
    expect(highlight.sameValue).toBe(false);
  });

  it('highlightPeers=false обнуляет подсветку соседей', () => {
    const grid = emptyGrid();
    const highlight = computeHighlight({
      pos: { row: 0, col: 5 }, // одна строка с (0,0)
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
      highlightPeers: false,
    });
    expect(highlight.peer).toBe(false);
  });

  it('highlightSameDigits=false обнуляет подсветку одинаковых цифр', () => {
    const grid = emptyGrid();
    grid[0][0] = 5;
    grid[8][8] = 5;
    const highlight = computeHighlight({
      pos: { row: 8, col: 8 },
      selected: { row: 0, col: 0 },
      grid,
      conflicts: noConflicts(),
      highlightSameDigits: false,
    });
    expect(highlight.sameValue).toBe(false);
  });
});
