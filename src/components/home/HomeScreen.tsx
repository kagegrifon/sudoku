import { useState } from 'react';
import { useAppView } from '../../state/AppContext';
import { useGame } from '../../state/GameContext';
import { EMPTY_CELL, GRID_SIZE, type Difficulty } from '../../core';
import { formatTime } from '../header/formatTime';
import { DIFFICULTY_LABELS } from '../difficultyLabels';
import DifficultyPicker from '../difficulty/DifficultyPicker';
import styles from './HomeScreen.module.css';

// Файл из public/ — Vite не импортирует его как модуль, поэтому путь собираем
// вручную от BASE_URL (на GitHub Pages приложение живёт в подкаталоге /sudoku/).
const ICON_URL = `${import.meta.env.BASE_URL}icons/icon-rounded-512.png`;

const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function countFilledCells(grid: number[][]): number {
  let filled = 0;
  for (const row of grid) {
    for (const value of row) {
      if (value !== EMPTY_CELL) filled += 1;
    }
  }
  return filled;
}

interface ContinueCardProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  filledCells: number;
  onContinue(): void;
}

function ContinueCard({ difficulty, elapsedSeconds, filledCells, onContinue }: ContinueCardProps) {
  const progressPercent = Math.round((filledCells / TOTAL_CELLS) * 100);
  const summary = `${DIFFICULTY_LABELS[difficulty]} · ${formatTime(elapsedSeconds)}`;
  return (
    <button
      type="button"
      className={styles.continueCard}
      data-testid="continue-card"
      onClick={onContinue}
    >
      <div className={styles.continueTop}>
        <div>
          <div className={styles.continueLabel}>Продолжить</div>
          <div className={styles.continueSummary}>{summary}</div>
        </div>
        <span className={styles.continueIcon}>▶</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>
      <div className={styles.continueFilled}>
        Заполнено {filledCells} из {TOTAL_CELLS}
      </div>
    </button>
  );
}

export default function HomeScreen() {
  const { navigate } = useAppView();
  const game = useGame();
  const [pickerOpen, setPickerOpen] = useState(false);

  // «Продолжить» показываем, когда есть активная партия — идущая или на паузе.
  // idle (нет игры) и completed (партия завершена) карточку не показывают.
  const gameStarted = game.state.status === 'in_progress' || game.state.status === 'paused';
  const filledCells = countFilledCells(game.state.currentGrid);

  const startGame = (difficulty: Difficulty) => {
    game.newGame(difficulty);
    setPickerOpen(false);
    navigate('game');
  };

  return (
    <div className={styles.screen} data-testid="home-screen">
      <div className={styles.brand}>
        <img src={ICON_URL} alt="Судоку" className={styles.logo} />
        <div className={styles.title}>Судоку</div>
      </div>

      <div className={styles.spacer} />

      {gameStarted && (
        <ContinueCard
          difficulty={game.state.difficulty}
          elapsedSeconds={game.state.elapsedSeconds}
          filledCells={filledCells}
          onContinue={() => navigate('game')}
        />
      )}

      <button
        type="button"
        className={styles.newGameButton}
        data-testid="home-new-game"
        onClick={() => setPickerOpen(true)}
      >
        Новая игра
      </button>

      <div className={styles.secondaryRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          data-testid="home-stats"
          onClick={() => navigate('stats')}
        >
          Статистика
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          data-testid="home-settings"
          onClick={() => navigate('settings')}
        >
          Настройки
        </button>
      </div>

      {pickerOpen && <DifficultyPicker onStart={startGame} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
