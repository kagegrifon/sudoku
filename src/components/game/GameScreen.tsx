import { useState } from 'react';
import type { Difficulty } from '../../core';
import Board from '../board/Board';
import type { CellPosition } from '../board/cellHighlight';
import NumberPad from '../numberpad/NumberPad';
import { useGameBoard } from './useGameBoard';
import styles from './GameScreen.module.css';

const DEFAULT_DIFFICULTY: Difficulty = 'easy';

export default function GameScreen() {
  const game = useGameBoard(DEFAULT_DIFFICULTY);
  const [selected, setSelected] = useState<CellPosition | null>(null);

  const selectCell = ({ row, col }: CellPosition) => setSelected({ row, col });

  const placeDigit = (value: number) => {
    if (!selected) return;
    game.placeDigit({ row: selected.row, col: selected.col, value });
  };

  const eraseSelected = () => {
    if (!selected) return;
    game.erase({ row: selected.row, col: selected.col });
  };

  const startNewGame = () => {
    game.newGame(game.state.difficulty);
    setSelected(null);
  };

  const padDisabled = selected === null || game.solved;

  return (
    <div className={styles.screen}>
      <div className={styles.boardArea}>
        <Board
          grid={game.state.grid}
          conflicts={game.conflicts}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
        />
      </div>

      <div className={styles.padArea}>
        <NumberPad onDigit={placeDigit} onErase={eraseSelected} disabled={padDisabled} />
        <button
          type="button"
          className={styles.newGame}
          data-testid="new-game"
          onClick={startNewGame}
        >
          Новая игра
        </button>
      </div>

      {game.solved && (
        <div className={styles.winOverlay} data-testid="win-overlay" role="dialog">
          <div className={styles.winCard}>
            <h2 className={styles.winTitle}>Готово!</h2>
            <p>Судоку решено.</p>
            <button
              type="button"
              className={styles.newGame}
              data-testid="win-new-game"
              onClick={startNewGame}
            >
              Новая игра
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
