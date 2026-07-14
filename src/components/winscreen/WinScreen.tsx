import type { Difficulty } from '../../core';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { DIFFICULTY_LABELS } from '../difficultyLabels';
import { formatTime } from '../header/formatTime';
import styles from './WinScreen.module.css';

interface WinScreenProps {
  result: 'won' | 'lost';
  elapsedSeconds: number;
  difficulty: Difficulty;
  livesLeft: number;
  isNewRecord: boolean;
  onNewGame(): void;
  onHome(): void;
}

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

const CONTENT: Record<
  'won' | 'lost',
  { icon: string; title: string; subtitle: string; testid: string }
> = {
  won: { icon: '✓', title: 'Готово!', subtitle: 'Судоку решено верно', testid: 'win-screen-won' },
  lost: {
    icon: '✕',
    title: 'Игра окончена',
    subtitle: 'Закончились жизни',
    testid: 'win-screen-lost',
  },
};

export default function WinScreen({
  result,
  elapsedSeconds,
  difficulty,
  livesLeft,
  isNewRecord,
  onNewGame,
  onHome,
}: WinScreenProps) {
  const content = CONTENT[result];
  const iconClass = result === 'won' ? styles.iconWon : styles.iconLost;

  return (
    <div className={styles.overlay} data-testid="win-screen" role="dialog" aria-modal="true">
      <div className={styles.card} data-testid={content.testid}>
        <div className={iconClass}>{content.icon}</div>
        <div className={styles.title}>{content.title}</div>
        <div className={styles.subtitle}>{content.subtitle}</div>

        {isNewRecord && (
          <div className={styles.recordBadge} data-testid="new-record-badge">
            ★ Новый рекорд
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statCell}>
            <div className={styles.statLabel}>Время</div>
            <div className={styles.statTime}>{formatTime(elapsedSeconds)}</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statLabel}>Уровень</div>
            <div className={styles.statValue}>{DIFFICULTY_LABELS[difficulty]}</div>
          </div>
          <div className={styles.statCellLast}>
            <div className={styles.statLabel}>Жизни</div>
            <div className={styles.statHearts}>
              {HEART_SLOTS.map((slot) => (
                <span
                  key={slot}
                  className={slot < livesLeft ? styles.heartFull : styles.heartEmpty}
                >
                  ♥
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.newGame}
          data-testid="win-new-game"
          onClick={onNewGame}
        >
          Новая игра
        </button>
        <button type="button" className={styles.home} data-testid="win-home" onClick={onHome}>
          На главную
        </button>
      </div>
    </div>
  );
}
