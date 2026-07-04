import { useGame } from '../../state/GameContext';
import { useAppView } from '../../state/AppContext';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { formatTime } from './formatTime';
import styles from './Header.module.css';

interface HeaderProps {
  onNewGame(): void;
}

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

export default function Header({ onNewGame }: HeaderProps) {
  const game = useGame();
  const { setActiveView } = useAppView();
  const filledHearts = game.state.lives;
  const notesToggleClass = game.notesMode ? styles.actionActive : styles.action;

  return (
    <header className={styles.header} data-testid="header">
      <div className={styles.timer} data-testid="timer">
        {formatTime(game.state.elapsedSeconds)}
      </div>

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

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          data-testid="toggle-stats"
          onClick={() => setActiveView('stats')}
          aria-label="Статистика"
        >
          📊
        </button>
        <button
          type="button"
          className={styles.action}
          data-testid="undo"
          disabled={!game.canUndo}
          onClick={game.undo}
          aria-label="Отменить ход"
        >
          ↶
        </button>
        <button
          type="button"
          className={notesToggleClass}
          data-testid="notes-toggle"
          aria-pressed={game.notesMode}
          onClick={game.toggleNotesMode}
          aria-label="Режим заметок"
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.action}
          data-testid="new-game"
          onClick={onNewGame}
        >
          Новая
        </button>
      </div>
    </header>
  );
}
