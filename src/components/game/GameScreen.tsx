import { useState } from 'react';
import type { Difficulty } from '../../core';
import { useGame } from '../../state/GameContext';
import Board from '../board/Board';
import type { CellPosition } from '../board/cellHighlight';
import NumberPad from '../numberpad/NumberPad';
import Header from '../header/Header';
import DifficultyPicker from '../difficulty/DifficultyPicker';
import WinScreen from '../winscreen/WinScreen';
import styles from './GameScreen.module.css';

export default function GameScreen() {
  const game = useGame();
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectCell = ({ row, col }: CellPosition) => setSelected({ row, col });

  const inputDigit = (value: number) => {
    if (!selected) return;
    game.inputDigit({ row: selected.row, col: selected.col, value });
  };

  const eraseSelected = () => {
    if (!selected) return;
    game.erase({ row: selected.row, col: selected.col });
  };

  const openPicker = () => setPickerOpen(true);

  const startNewGame = (difficulty: Difficulty) => {
    game.newGame(difficulty);
    setSelected(null);
    setPickerOpen(false);
  };

  const gameOver = game.won || game.lost;
  const padDisabled = selected === null || gameOver;
  const winResult = game.won ? 'won' : 'lost';

  return (
    <div className={styles.screen}>
      <Header onNewGame={openPicker} />

      <div className={styles.boardArea}>
        <Board
          grid={game.state.currentGrid}
          notes={game.state.notes}
          conflicts={game.conflicts}
          mistakes={game.mistakes}
          selected={selected}
          cellIsGiven={game.cellIsGiven}
          onSelectCell={selectCell}
        />
      </div>

      <div className={styles.padArea}>
        <NumberPad onDigit={inputDigit} onErase={eraseSelected} disabled={padDisabled} />
      </div>

      {gameOver && (
        <WinScreen
          result={winResult}
          elapsedSeconds={game.state.elapsedSeconds}
          onNewGame={openPicker}
        />
      )}

      {pickerOpen && (
        <DifficultyPicker onPick={startNewGame} onCancel={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
