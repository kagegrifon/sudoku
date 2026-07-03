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
  type Move,
  type CellNotesSnapshot,
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

const tick: Handler<Extract<GameAction, { type: 'TICK' }>> = (state) => {
  if (state.status !== 'in_progress') return state;
  return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
};

const newGame: Handler<Extract<GameAction, { type: 'NEW_GAME' }>> = (_state, action) =>
  createInitialGameState(action.difficulty);

const restore: Handler<Extract<GameAction, { type: 'RESTORE' }>> = (_state, action) => action.state;

const HANDLERS: {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
} = {
  TICK: tick,
  NEW_GAME: newGame,
  RESTORE: restore,
  // PLACE_DIGIT / TOGGLE_NOTE / ERASE / UNDO добавляются в Tasks 3–6.
} as {
  [K in GameAction['type']]: Handler<Extract<GameAction, { type: K }>>;
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  const handler = HANDLERS[action.type] as Handler<GameAction> | undefined;
  return handler ? handler(state, action) : state;
}

// Экспортируем приватные хелперы для последующих handlers (используются в Tasks 3–6).
export { withCellValue, cloneNotes, autoclearNotes };
