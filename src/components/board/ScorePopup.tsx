import { GRID_SIZE } from '../../core';
import type { ScoreEvent } from '../../state/gameTypes';
import { formatPoints } from '../rank/formatPoints';
import styles from './ScorePopup.module.css';

type PopupKind = 'gain' | 'combo' | 'loss';

const POPUP_CLASSES: Record<PopupKind, string> = {
  gain: styles.gain,
  combo: styles.combo,
  loss: styles.loss,
};

function popupKind(event: ScoreEvent): PopupKind {
  if (event.delta < 0) return 'loss';
  if (event.multiplier > 1) return 'combo';
  return 'gain';
}

function formatDelta(delta: number): string {
  if (delta < 0) return `−${formatPoints(-delta)}`;
  return `+${formatPoints(delta)}`;
}

function cellFraction(cells: number): string {
  return `${(cells / GRID_SIZE) * 100}%`;
}

export default function ScorePopup({ event }: { event: ScoreEvent }) {
  const kind = popupKind(event);
  const position = { left: cellFraction(event.col + 0.5), top: cellFraction(event.row) };
  return (
    <div
      className={`${styles.popup} ${POPUP_CLASSES[kind]}`}
      style={position}
      data-testid="score-popup"
      data-kind={kind}
      aria-hidden="true"
    >
      {kind === 'combo' && <span className={styles.multiplier}>×{event.multiplier}</span>}
      <span>{formatDelta(event.delta)}</span>
    </div>
  );
}
