// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Board from './Board';
import { GRID_SIZE, type Grid } from '../../core';

afterEach(cleanup);

function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function falseMatrix(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
}

/** Пустые заметки во всех клетках, кроме [0][0] — туда кладём переданных кандидатов. */
function notesAtOrigin(candidates: number[]): number[][][] {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => (row === 0 && col === 0 ? candidates : [])),
  );
}

function renderBoard(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  render(
    <Board
      grid={emptyGrid()}
      conflicts={falseMatrix()}
      selected={null}
      cellIsGiven={() => false}
      onSelectCell={vi.fn()}
      {...overrides}
    />,
  );
}

describe('Board — скрытие пометок полностью расставленных цифр', () => {
  it('пометка завершённой цифры не отображается, остальные остаются', () => {
    renderBoard({
      notes: notesAtOrigin([2, 5, 7]),
      completedDigits: new Set([5]),
    });
    const notes = screen.getByTestId('notes-0-0').textContent;
    expect(notes).toContain('2');
    expect(notes).toContain('7');
    expect(notes).not.toContain('5');
  });

  it('без завершённых цифр показаны все пометки', () => {
    renderBoard({ notes: notesAtOrigin([2, 5, 7]) });
    const notes = screen.getByTestId('notes-0-0').textContent;
    expect(notes).toContain('2');
    expect(notes).toContain('5');
    expect(notes).toContain('7');
  });

  it('если все пометки клетки завершены, блок заметок не рендерится', () => {
    renderBoard({
      notes: notesAtOrigin([5, 7]),
      completedDigits: new Set([5, 7]),
    });
    expect(screen.queryByTestId('notes-0-0')).toBeNull();
    expect(screen.getByTestId('cell-0-0').textContent).toBe('');
  });
});
