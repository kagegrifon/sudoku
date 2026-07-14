import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { useAppView } from '../../state/AppContext';
import { useSettings } from '../../state/SettingsContext';
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

  const gameOver = game.won || game.lost;
  const paused = game.state.status === 'paused';
  const padDisabled = selected === null || gameOver || paused;
  const winResult = game.won ? 'won' : 'lost';
  const boardAreaClass = paused ? styles.boardAreaBlurred : styles.boardArea;

  return (
    <div className={styles.screen}>
      <Header />

      <div className={boardAreaClass}>
        <Board
          grid={game.state.currentGrid}
          notes={game.state.notes}
          conflicts={game.conflicts}
          mistakes={game.mistakes}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
          highlightSameDigits={settings.highlightSameDigits}
          highlightPeers={settings.highlightPeers}
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
          result={winResult}
          elapsedSeconds={game.state.elapsedSeconds}
          difficulty={game.state.difficulty}
          livesLeft={game.state.lives}
          isNewRecord={game.isNewRecord}
          onNewGame={restartGame}
          onHome={() => navigate('home')}
        />
      )}
    </div>
  );
}
