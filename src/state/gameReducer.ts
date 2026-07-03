import {
  generatePuzzle,
  cloneGrid,
  getBoxStart,
  isSolved,
  EMPTY_CELL,
  GRID_SIZE,
  BOX_SIZE,
  type Difficulty,
  type Grid,
} from '../core';
import {
  GAME_SCHEMA_VERSION,
  INITIAL_LIVES,
  type GameState,
  type GameAction,
  type CellNotesSnapshot,
  type Move,
} from './gameTypes';

export function createEmptyNotes(): number[][][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => [] as number[]),
  );
}

function createPuzzleId(): string {
  return crypto.randomUUID();
}

export function createInitialGameState(difficulty: Difficulty): GameState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    puzzleId: createPuzzleId(),
    difficulty,
    initialGrid: puzzle,
    currentGrid: cloneGrid(puzzle),
    solution,
    notes: createEmptyNotes(),
    history: [],
    lives: INITIAL_LIVES,
    elapsedSeconds: 0,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
  };
}

export function isGiven(state: GameState, row: number, col: number): boolean {
  return state.initialGrid[row][col] !== EMPTY_CELL;
}

/** Иммутабельно записывает значение в клетку grid, возвращая новый grid. */
function withCellValue(grid: Grid, row: number, col: number, value: number): Grid {
  const next = cloneGrid(grid);
  next[row][col] = value;
  return next;
}

function cloneNotes(notes: number[][][]): number[][][] {
  return notes.map((rowNotes) => rowNotes.map((cellNotes) => [...cellNotes]));
}

/** Все клетки одного юнита (строка + столбец + блок) с клеткой (row,col) включительно; с дублями. */
function samePeers(row: number, col: number): Array<{ row: number; col: number }> {
  const peers: Array<{ row: number; col: number }> = [];
  for (let index = 0; index < GRID_SIZE; index++) {
    peers.push({ row, col: index });
    peers.push({ row: index, col });
  }
  const boxRow = getBoxStart(row);
  const boxCol = getBoxStart(col);
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      peers.push({ row: r, col: c });
    }
  }
  return peers;
}

/**
 * Убирает `value` из заметок всех клеток одного юнита с (row,col).
 * Возвращает новые notes и снимки только тех клеток, что реально изменились.
 */
function autoclearNotes(
  notes: number[][][],
  row: number,
  col: number,
  value: number,
): { notes: number[][][]; cleared: CellNotesSnapshot[] } {
  const nextNotes = cloneNotes(notes);
  const cleared: CellNotesSnapshot[] = [];
  const seen = new Set<string>();
  for (const peer of samePeers(row, col)) {
    const key = `${peer.row},${peer.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cellNotes = nextNotes[peer.row][peer.col];
    if (!cellNotes.includes(value)) continue;
    cleared.push({ row: peer.row, col: peer.col, prevNotes: [...cellNotes] });
    nextNotes[peer.row][peer.col] = cellNotes.filter((candidate) => candidate !== value);
  }
  return { notes: nextNotes, cleared };
}

type Handler<A extends GameAction> = (state: GameState, action: A) => GameState;

const placeDigit: Handler<Extract<GameAction, { type: 'PLACE_DIGIT' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col, value } = action;
  if (isGiven(state, row, col)) return state;

  const prevValue = state.currentGrid[row][col];
  const wasMistake = value !== state.solution[row][col];
  const currentGrid = withCellValue(state.currentGrid, row, col, value);
  const { notes, cleared } = autoclearNotes(state.notes, row, col, value);

  const move: Move = {
    row,
    col,
    prevValue,
    newValue: value,
    wasNote: false,
    wasMistake,
    clearedNotes: cleared,
  };
  const lives = wasMistake ? state.lives - 1 : state.lives;
  const base: GameState = {
    ...state,
    currentGrid,
    notes,
    history: [...state.history, move],
    lives,
  };

  if (lives <= 0) return { ...base, status: 'completed', result: 'lost' };
  if (isSolved(currentGrid)) return { ...base, status: 'completed', result: 'won' };
  return base;
};

const toggleNote: Handler<Extract<GameAction, { type: 'TOGGLE_NOTE' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col, value } = action;
  if (isGiven(state, row, col)) return state;
  if (state.currentGrid[row][col] !== EMPTY_CELL) return state;

  const prevNotes = state.notes[row][col];
  const nextNotes = cloneNotes(state.notes);
  const alreadyNoted = prevNotes.includes(value);
  nextNotes[row][col] = alreadyNoted
    ? prevNotes.filter((candidate) => candidate !== value)
    : [...prevNotes, value].sort((a, b) => a - b);

  const move: Move = {
    row,
    col,
    prevValue: EMPTY_CELL,
    newValue: EMPTY_CELL,
    wasNote: true,
    wasMistake: false,
    clearedNotes: [{ row, col, prevNotes: [...prevNotes] }],
  };
  return { ...state, notes: nextNotes, history: [...state.history, move] };
};

const tick: Handler<Extract<GameAction, { type: 'TICK' }>> = (state) => {
  if (state.status !== 'in_progress') return state;
  return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
};

const newGame: Handler<Extract<GameAction, { type: 'NEW_GAME' }>> = (_state, action) =>
  createInitialGameState(action.difficulty);

const restore: Handler<Extract<GameAction, { type: 'RESTORE' }>> = (_state, action) => action.state;

const erase: Handler<Extract<GameAction, { type: 'ERASE' }>> = (state, action) => {
  if (state.status === 'completed') return state;
  const { row, col } = action;
  if (isGiven(state, row, col)) return state;

  const prevValue = state.currentGrid[row][col];
  const prevNotes = state.notes[row][col];
  if (prevValue === EMPTY_CELL && prevNotes.length === 0) return state;

  const currentGrid = withCellValue(state.currentGrid, row, col, EMPTY_CELL);
  const nextNotes = cloneNotes(state.notes);
  nextNotes[row][col] = [];

  const clearedNotes: Move['clearedNotes'] =
    prevNotes.length > 0 ? [{ row, col, prevNotes: [...prevNotes] }] : [];
  const move: Move = {
    row,
    col,
    prevValue,
    newValue: EMPTY_CELL,
    wasNote: false,
    wasMistake: false,
    clearedNotes,
  };
  return { ...state, currentGrid, notes: nextNotes, history: [...state.history, move] };
};

const HANDLERS: {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
} = {
  TICK: tick,
  NEW_GAME: newGame,
  RESTORE: restore,
  PLACE_DIGIT: placeDigit,
  TOGGLE_NOTE: toggleNote,
  ERASE: erase,
  // UNDO добавляется в Task 6.
} as {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  const handler = HANDLERS[action.type] as Handler<GameAction> | undefined;
  return handler ? handler(state, action) : state;
}

// Экспортируем приватные хелперы для последующих handlers (используются в Tasks 3–6).
export { withCellValue, cloneNotes, autoclearNotes };
