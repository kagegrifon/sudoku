import { memo } from 'react';
import { EMPTY_CELL } from '../../core';
import type { CellHighlight } from './cellHighlight';
import styles from './Board.module.css';

export interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean;
  highlight: CellHighlight;
  onSelect(args: { row: number; col: number }): void;
}

// Соответствие «флаг подсветки → CSS-класс». Порядок не важен: классы независимы.
const HIGHLIGHT_CLASSES: Array<{ active: (h: CellHighlight) => boolean; className: string }> = [
  { active: (h) => h.peer, className: styles.peer },
  { active: (h) => h.sameValue, className: styles.sameValue },
  { active: (h) => h.selected, className: styles.selected },
  { active: (h) => h.conflict, className: styles.conflict },
];

function CellComponent({ row, col, value, given, highlight, onSelect }: CellProps) {
  const highlightClasses = HIGHLIGHT_CLASSES.filter((entry) => entry.active(highlight)).map(
    (entry) => entry.className,
  );
  const givenClass = given ? styles.given : styles.editable;
  const className = [styles.cell, givenClass, ...highlightClasses].join(' ');
  const displayValue = value === EMPTY_CELL ? '' : String(value);

  return (
    <button
      type="button"
      className={className}
      data-testid={`cell-${row}-${col}`}
      onClick={() => onSelect({ row, col })}
    >
      {displayValue}
    </button>
  );
}

const Cell = memo(CellComponent);
export default Cell;
