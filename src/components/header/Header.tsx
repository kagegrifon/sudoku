import { useGame } from '../../state/GameContext';
import { useAppView } from '../../state/AppContext';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { DIFFICULTY_LABELS } from '../difficultyLabels';
import { formatTime } from './formatTime';
import styles from './Header.module.css';

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

export default function Header() {
  const game = useGame();
  const { navigate } = useAppView();
  const filledHearts = game.state.lives;

  // При уходе из игры ставим партию на паузу — таймер не должен идти вне экрана.
  const leaveTo = (screen: 'home' | 'settings') => {
    game.pause();
    navigate(screen);
  };

  const canPause = game.state.status === 'in_progress';

  return (
    <header className={styles.header} data-testid="header">
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.iconButton}
          data-testid="game-back"
          onClick={() => leaveTo('home')}
          aria-label="На главную"
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.iconButton}
          data-testid="game-settings"
          onClick={() => leaveTo('settings')}
          aria-label="Настройки"
        >
          ⚙
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Уровень</div>
          <div className={styles.statValue}>{DIFFICULTY_LABELS[game.state.difficulty]}</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Жизни</div>
          <div className={styles.lives} data-testid="lives" aria-label={`Жизни: ${filledHearts}`}>
            {HEART_SLOTS.map((slot) => {
              const isFilled = slot < filledHearts;
              return (
                <span key={slot} className={isFilled ? styles.heartFull : styles.heartEmpty}>
                  {isFilled ? '♥' : '♡'}
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.timeGroup}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Время</div>
            <div className={styles.statValue} data-testid="timer">
              {formatTime(game.state.elapsedSeconds)}
            </div>
          </div>
          <button
            type="button"
            className={styles.pauseButton}
            data-testid="pause"
            onClick={game.pause}
            disabled={!canPause}
            aria-label="Пауза"
          >
            ❚❚
          </button>
        </div>
      </div>
    </header>
  );
}
