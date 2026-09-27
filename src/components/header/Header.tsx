import { useGame } from '../../state/GameContext';
import { useAppView } from '../../state/AppContext';
import { useRecords } from '../../state/RecordsContext';
import { INITIAL_LIVES } from '../../state/gameTypes';
import { levelInfo, rankForLevel } from '../../state/progress';
import { DIFFICULTY_LABELS } from '../difficultyLabels';
import RankBadge from '../rank/RankBadge';
import { formatTime } from './formatTime';
import ScoreDisplay from './ScoreDisplay';
import styles from './Header.module.css';

const HEART_SLOTS = Array.from({ length: INITIAL_LIVES }, (_, index) => index);
const RANK_BADGE_SIZE = 20;

export default function Header() {
  const game = useGame();
  const { navigate } = useAppView();
  const { totalScore } = useRecords();
  const filledHearts = game.state.lives;

  const rank = rankForLevel(levelInfo(totalScore).level);

  // При уходе из игры ставим партию на паузу — таймер не должен идти вне экрана.
  const leaveTo = (screen: 'home' | 'settings') => {
    game.pause();
    navigate(screen);
  };

  const canPause = game.state.status === 'in_progress';

  return (
    <header className={styles.header} data-testid="header">
      <button
        type="button"
        className={`${styles.iconButton} ${styles.navBack}`}
        data-testid="game-back"
        onClick={() => leaveTo('home')}
        aria-label="На главную"
      >
        ‹
      </button>

      {/* Пауза: на мобилке — рядом со временем, на десктопе — по центру верхней строки. */}
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

      {/* Идентичность игрока: сложность, ранг (иконка + имя), очки. На десктопе — над полем. */}
      <div className={styles.identity}>
        <div className={styles.difficulty}>{DIFFICULTY_LABELS[game.state.difficulty]}</div>
        {/* На мобилке обёртка прозрачна (display: contents), на десктопе — ранг и очки в одну строку. */}
        <div className={styles.rankScoreRow}>
          <div className={styles.rankRow}>
            <RankBadge rank={rank} size={RANK_BADGE_SIZE} />
            <span className={styles.rankName}>{rank.name}</span>
          </div>
          <ScoreDisplay />
        </div>
      </div>

      {/* Жизни: на десктопе — по центру, между левым блоком и временем. */}
      <div className={styles.stat + ' ' + styles.livesBlock}>
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

      {/* Время. На десктопе — над нампадом (справа). */}
      <div className={styles.vitals}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Время</div>
          <div className={styles.statValue} data-testid="timer">
            {formatTime(game.state.elapsedSeconds)}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.iconButton} ${styles.navSettings}`}
        data-testid="game-settings"
        onClick={() => leaveTo('settings')}
        aria-label="Настройки"
      >
        ⚙
      </button>
    </header>
  );
}
