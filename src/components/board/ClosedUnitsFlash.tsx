import type { CSSProperties } from 'react';
import { BOX_SIZE, GRID_SIZE, getBoxStart } from '../../core';
import type { ScoreEvent } from '../../state/gameTypes';
import type { ClosedUnits } from '../../state/scoring';
import styles from './ScorePopup.module.css';

type UnitName = keyof ClosedUnits;

function cellFraction(cells: number): string {
  return `${(cells / GRID_SIZE) * 100}%`;
}

/** Прямоугольник подсветки для каждого вида юнита — в долях доски. */
const UNIT_AREAS: Record<UnitName, (event: ScoreEvent) => CSSProperties> = {
  row: (event) => ({ top: cellFraction(event.row), left: 0, width: '100%', height: cellFraction(1) }),
  col: (event) => ({ top: 0, left: cellFraction(event.col), width: cellFraction(1), height: '100%' }),
  box: (event) => ({
    top: cellFraction(getBoxStart(event.row)),
    left: cellFraction(getBoxStart(event.col)),
    width: cellFraction(BOX_SIZE),
    height: cellFraction(BOX_SIZE),
  }),
};

const UNIT_NAMES = Object.keys(UNIT_AREAS) as UnitName[];

export default function ClosedUnitsFlash({ event }: { event: ScoreEvent }) {
  const closedUnits = UNIT_NAMES.filter((unit) => event.closedUnits[unit]);
  return (
    <>
      {closedUnits.map((unit) => (
        <div
          key={unit}
          className={styles.flash}
          style={UNIT_AREAS[unit](event)}
          data-testid={`closed-unit-${unit}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
