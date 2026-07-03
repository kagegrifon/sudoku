import { getBoxStart, EMPTY_CELL, type Grid } from '../../core';

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellHighlight {
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  conflict: boolean;
  mistake: boolean;
}

/** true, если клетки a и b делят строку, столбец или блок 3×3 (та же клетка — тоже true). */
export function isSameUnit(a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row) return true;
  if (a.col === b.col) return true;
  const sameBoxRow = getBoxStart(a.row) === getBoxStart(b.row);
  const sameBoxCol = getBoxStart(a.col) === getBoxStart(b.col);
  return sameBoxRow && sameBoxCol;
}

interface ComputeHighlightArgs {
  pos: CellPosition;
  selected: CellPosition | null;
  grid: Grid;
  conflicts: boolean[][];
  mistakes?: boolean[][];
}

export function computeHighlight({
  pos,
  selected,
  grid,
  conflicts,
  mistakes,
}: ComputeHighlightArgs): CellHighlight {
  const conflict = conflicts[pos.row][pos.col];
  const mistake = mistakes?.[pos.row]?.[pos.col] ?? false;

  if (!selected) {
    return { selected: false, peer: false, sameValue: false, conflict, mistake };
  }

  const isSelectedCell = pos.row === selected.row && pos.col === selected.col;
  if (isSelectedCell) {
    return { selected: true, peer: false, sameValue: false, conflict, mistake };
  }

  const peer = isSameUnit(pos, selected);
  const cellValue = grid[pos.row][pos.col];
  const selectedValue = grid[selected.row][selected.col];
  const sameValue = cellValue !== EMPTY_CELL && cellValue === selectedValue;

  return { selected: false, peer, sameValue, conflict, mistake };
}
