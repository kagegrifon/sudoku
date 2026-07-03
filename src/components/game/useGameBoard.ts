import { useMemo, useReducer } from 'react';
import { findConflicts, isSolved, type Difficulty } from '../../core';
import {
  createInitialState,
  gameBoardReducer,
  isGiven,
  type GameBoardState,
} from './gameBoardReducer';

export interface UseGameBoard {
  state: GameBoardState;
  conflicts: boolean[][];
  solved: boolean;
  placeDigit(args: { row: number; col: number; value: number }): void;
  erase(args: { row: number; col: number }): void;
  newGame(difficulty: Difficulty): void;
  cellIsGiven(row: number, col: number): boolean;
}

export function useGameBoard(initialDifficulty: Difficulty): UseGameBoard {
  const [state, dispatch] = useReducer(gameBoardReducer, initialDifficulty, createInitialState);

  const conflicts = useMemo(() => findConflicts(state.grid), [state.grid]);
  const solved = useMemo(() => isSolved(state.grid), [state.grid]);

  return {
    state,
    conflicts,
    solved,
    placeDigit: ({ row, col, value }) => dispatch({ type: 'PLACE_DIGIT', row, col, value }),
    erase: ({ row, col }) => dispatch({ type: 'ERASE', row, col }),
    newGame: (difficulty) => dispatch({ type: 'NEW_GAME', difficulty }),
    cellIsGiven: (row, col) => isGiven(state, row, col),
  };
}
