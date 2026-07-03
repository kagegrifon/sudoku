import { formatTime } from '../header/formatTime';
import styles from './WinScreen.module.css';

interface WinScreenProps {
  result: 'won' | 'lost';
  elapsedSeconds: number;
  onNewGame(): void;
}

const CONTENT: Record<'won' | 'lost', { title: string; testid: string }> = {
  won: { title: 'Победа!', testid: 'win-screen-won' },
  lost: { title: 'Игра окончена', testid: 'win-screen-lost' },
};

export default function WinScreen({ result, elapsedSeconds, onNewGame }: WinScreenProps) {
  const content = CONTENT[result];
  const subtitle = result === 'won' ? `Время: ${formatTime(elapsedSeconds)}` : 'Закончились жизни';

  return (
    <div className={styles.overlay} data-testid="win-screen" role="dialog" aria-modal="true">
      <div className={styles.card} data-testid={content.testid}>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <button
          type="button"
          className={styles.newGame}
          data-testid="win-new-game"
          onClick={onNewGame}
        >
          Новая игра
        </button>
      </div>
    </div>
  );
}
