import { formatPoints } from '../rank/formatPoints';
import styles from './WinScreen.module.css';

interface WonScoreProps {
  shownScore: number;
  popped: boolean;
}

export function WonScore({ shownScore, popped }: WonScoreProps) {
  const valueClass = popped ? `${styles.scoreValue} ${styles.scorePop}` : styles.scoreValue;
  return (
    <div className={styles.scoreBlock}>
      <div className={styles.scoreLabel}>Очки за партию</div>
      <div className={valueClass} data-testid="win-score">
        {formatPoints(shownScore)}
      </div>
    </div>
  );
}

export function BurnedScore({ score }: { score: number }) {
  return (
    <div className={styles.scoreBlock}>
      <div className={styles.scoreLabel}>Очки за партию</div>
      <div className={styles.scoreBurned} data-testid="win-score-burned">
        {formatPoints(score)}
      </div>
      <div className={styles.scoreBurnedNote}>Очки сгорают при поражении</div>
    </div>
  );
}
