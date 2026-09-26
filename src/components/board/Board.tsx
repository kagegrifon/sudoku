import { Fragment } from 'react';
import { GRID_SIZE, type Grid } from '../../core';
import type { ScoreEvent } from '../../state/gameTypes';
import Cell from './Cell';
import ClosedUnitsFlash from './ClosedUnitsFlash';
import ScorePopup from './ScorePopup';
import { computeHighlight, type CellPosition } from './cellHighlight';
import styles from './Board.module.css';

export interface BoardProps {
  grid: Grid;
  conflicts: boolean[][];
  selected: CellPosition | null;
  cellIsGiven(row: number, col: number): boolean;
  onSelectCell(args: { row: number; col: number }): void;
  notes?: number[][][];
  /** Цифры с девятью верными вхождениями: их пометки в клетках не показываем. */
  completedDigits?: ReadonlySet<number>;
  mistakes?: boolean[][];
  highlightSameDigits?: boolean;
  highlightPeers?: boolean;
  /** Последнее изменение счёта — всплывашка над клеткой; null/undefined — не показывать. */
  scoreEvent?: ScoreEvent | null;
}

const ROW_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);
const COL_INDICES = Array.from({ length: GRID_SIZE }, (_, index) => index);

export default function Board({
  grid,
  conflicts,
  selected,
  cellIsGiven,
  onSelectCell,
  notes,
  completedDigits,
  mistakes,
  highlightSameDigits,
  highlightPeers,
  scoreEvent,
}: BoardProps) {
  return (
    <div className={styles.board} data-testid="board" role="grid">
      {ROW_INDICES.map((row) =>
        COL_INDICES.map((col) => {
          const pos = { row, col };
          const highlight = computeHighlight({
            pos,
            selected,
            grid,
            conflicts,
            mistakes,
            highlightSameDigits,
            highlightPeers,
          });
          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              value={grid[row][col]}
              given={cellIsGiven(row, col)}
              highlight={highlight}
              notes={notes?.[row]?.[col]}
              completedDigits={completedDigits}
              onSelect={onSelectCell}
            />
          );
        }),
      )}
      {/* Слой очков идёт ПОСЛЕ 81 клетки — nth-child границ блоков не сдвигается. */}
      {scoreEvent && (
        <Fragment key={scoreEvent.id}>
          <ClosedUnitsFlash event={scoreEvent} />
          <ScorePopup event={scoreEvent} />
        </Fragment>
      )}
    </div>
  );
}
