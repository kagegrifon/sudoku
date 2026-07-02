import { generatePuzzle, cloneGrid, EMPTY_CELL, type Grid, type Difficulty } from '../../core';

export interface GameBoardState {
  puzzle: Grid;
  solution: Grid;
  grid: Grid;
  difficulty: Difficulty;
}

export type GameBoardAction =
  | { type: 'PLACE_DIGIT'; row: number; col: number; value: number }
  | { type: 'ERASE'; row: number; col: number }
  | { type: 'NEW_GAME'; difficulty: Difficulty };

export function createInitialState(difficulty: Difficulty): GameBoardState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    solution,
    grid: cloneGrid(puzzle),
    difficulty,
  };
}

export function isGiven(state: GameBoardState, row: number, col: number): boolean {
  return state.puzzle[row][col] !== EMPTY_CELL;
}

/** Иммутабельно записывает значение в клетку grid, возвращая новый grid. */
function withCell(grid: Grid, row: number, col: number, value: number): Grid {
  const next = cloneGrid(grid);
  next[row][col] = value;
  return next;
}

type Handler<A extends GameBoardAction> = (state: GameBoardState, action: A) => GameBoardState;

const placeDigit: Handler<Extract<GameBoardAction, { type: 'PLACE_DIGIT' }>> = (state, action) => {
  if (isGiven(state, action.row, action.col)) return state;
  return { ...state, grid: withCell(state.grid, action.row, action.col, action.value) };
};

const erase: Handler<Extract<GameBoardAction, { type: 'ERASE' }>> = (state, action) => {
  if (isGiven(state, action.row, action.col)) return state;
  return { ...state, grid: withCell(state.grid, action.row, action.col, EMPTY_CELL) };
};

const newGame: Handler<Extract<GameBoardAction, { type: 'NEW_GAME' }>> = (_state, action) =>
  createInitialState(action.difficulty);

const HANDLERS: {
  [K in GameBoardAction['type']]: Handler<Extract<GameBoardAction, { type: K }>>;
} = {
  PLACE_DIGIT: placeDigit,
  ERASE: erase,
  NEW_GAME: newGame,
};

export function gameBoardReducer(state: GameBoardState, action: GameBoardAction): GameBoardState {
  const handler = HANDLERS[action.type] as Handler<GameBoardAction>;
  return handler(state, action);
}
