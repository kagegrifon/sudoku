import { DIFFICULTY_LABELS } from '../difficultyLabels';
import { formatTime } from '../header/formatTime';
import type { Difficulty } from '../../core';
import styles from './PauseOverlay.module.css';

interface PauseOverlayProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  onResume(): void;
  onRestart(): void;
  onHome(): void;
}

export default function PauseOverlay({
  difficulty,
  elapsedSeconds,
  onResume,
  onRestart,
  onHome,
}: PauseOverlayProps) {
  const summary = `${DIFFICULTY_LABELS[difficulty]} · ${formatTime(elapsedSeconds)}`;
  return (
    <div className={styles.scrim} data-testid="pause-overlay">
      <div className={styles.icon}>❚❚</div>
      <div className={styles.title}>Пауза</div>
      <div className={styles.summary}>{summary}</div>

      <button
        type="button"
        className={styles.primary}
        data-testid="pause-resume"
        onClick={onResume}
      >
        Продолжить
      </button>
      <button
        type="button"
        className={styles.secondary}
        data-testid="pause-restart"
        onClick={onRestart}
      >
        Заново
      </button>
      <button type="button" className={styles.ghost} data-testid="pause-home" onClick={onHome}>
        На главную
      </button>
    </div>
  );
}
