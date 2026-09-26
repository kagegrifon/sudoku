import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { useAppView } from '../../state/AppContext';
import { useSettings } from '../../state/SettingsContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import Board from '../board/Board';
import type { CellPosition } from '../board/cellHighlight';
import NumberPad from '../numberpad/NumberPad';
import Header from '../header/Header';
import ActionsBar from './ActionsBar';
import PauseOverlay from './PauseOverlay';
import WinScreen from '../winscreen/WinScreen';
import styles from './GameScreen.module.css';

export default function GameScreen() {
  const game = useGame();
  const { navigate } = useAppView();
  const { settings } = useSettings();
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  // При reduced-motion всплывашки не показываем — остаётся только смена числа в шапке.
  const scoreEvent = reducedMotion ? null : game.state.lastScoreEvent;

  const selectCell = ({ row, col }: CellPosition) => setSelected({ row, col });

  const inputDigit = (value: number) => {
    if (!selected) return;
    game.inputDigit({ row: selected.row, col: selected.col, value });
  };

  const eraseSelected = () => {
    if (!selected) return;
    game.erase({ row: selected.row, col: selected.col });
  };

  const restartGame = () => {
    game.newGame(game.state.difficulty);
    setSelected(null);
  };

  // С экрана результата уход на главную завершает партию: сбрасываем в idle,
  // чтобы «Продолжить» не предлагало уже сыгранную партию.
  const leaveToHomeFromResult = () => {
    game.resetToIdle();
    navigate('home');
  };

  const gameOver = game.won || game.lost;
  const paused = game.state.status === 'paused';
  const padDisabled = selected === null || gameOver || paused;
  const winResult = game.won ? 'won' : 'lost';
  const boardAreaClass = paused ? styles.boardAreaBlurred : styles.boardArea;

  const scoreSummary = {
    score: game.state.score,
    prevTotalScore: game.completion.prevTotalScore,
    nextTotalScore: game.completion.nextTotalScore,
    isNewScoreRecord: game.completion.isNewScoreRecord,
  };
  // Итоги считаются в эффекте после перехода в completed, поэтому первый кадр WinScreen видит
  // NO_COMPLETION. Ключ пересоздаёт экран, когда итоги приходят, — анимация стартует с верного баланса.
  const winScreenKey = `${scoreSummary.prevTotalScore}:${scoreSummary.nextTotalScore}`;

  return (
    <div className={styles.screen}>
      <Header />

      <div className={boardAreaClass}>
        <Board
          grid={game.state.currentGrid}
          notes={game.state.notes}
          completedDigits={game.completedDigits}
          conflicts={game.conflicts}
          mistakes={game.mistakes}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
          highlightSameDigits={settings.highlightSameDigits}
          highlightPeers={settings.highlightPeers}
          scoreEvent={scoreEvent}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.actionsArea}>
          <ActionsBar
            canUndo={game.canUndo}
            notesMode={game.notesMode}
            disabled={padDisabled}
            onUndo={game.undo}
            onErase={eraseSelected}
            onToggleNotes={game.toggleNotesMode}
          />
        </div>

        <div className={styles.padArea}>
          <NumberPad
            onDigit={inputDigit}
            disabled={padDisabled}
            showRemaining={settings.showRemainingCounts}
            remainingByDigit={game.remainingByDigit}
            completedDigits={game.completedDigits}
          />
        </div>
      </div>

      {paused && (
        <PauseOverlay
          difficulty={game.state.difficulty}
          elapsedSeconds={game.state.elapsedSeconds}
          onResume={game.resume}
          onRestart={restartGame}
          onHome={() => navigate('home')}
        />
      )}

      {gameOver && (
        <WinScreen
          key={winScreenKey}
          result={winResult}
          elapsedSeconds={game.state.elapsedSeconds}
          difficulty={game.state.difficulty}
          livesLeft={game.state.lives}
          isNewRecord={game.isNewRecord}
          scoreSummary={scoreSummary}
          onNewGame={restartGame}
          onHome={leaveToHomeFromResult}
        />
      )}
    </div>
  );
}
