/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { findConflicts, EMPTY_CELL, type Difficulty } from '../core';
import { gameReducer, createInitialGameState } from './gameReducer';
import type { GameState, GameAction, GameStatus } from './gameTypes';
import { loadGame, saveGame } from './storage/localGame';
import { loadSettings, saveSettings } from './storage/localSettings';

const SAVE_DEBOUNCE_MS = 400;
const TIMER_SAVE_INTERVAL_MS = 5000;

interface DigitTarget {
  row: number;
  col: number;
  value: number;
}
interface CellTarget {
  row: number;
  col: number;
}

export interface GameApi {
  state: GameState;
  conflicts: boolean[][];
  mistakes: boolean[][];
  won: boolean;
  lost: boolean;
  canUndo: boolean;
  notesMode: boolean;
  cellIsGiven(row: number, col: number): boolean;
  inputDigit(target: DigitTarget): void;
  erase(target: CellTarget): void;
  undo(): void;
  newGame(difficulty: Difficulty): void;
  toggleNotesMode(): void;
}

const GameContext = createContext<GameApi | null>(null);

function initGameState(): GameState {
  const restored = loadGame();
  if (restored) return restored;
  return createInitialGameState(loadSettings().lastDifficulty);
}

/** Клетка ошибочна: игрок вписал непустое значение, не совпадающее с решением. */
function computeMistakes(state: GameState): boolean[][] {
  return state.currentGrid.map((rowValues, row) =>
    rowValues.map((value, col) => {
      if (value === EMPTY_CELL) return false;
      if (state.initialGrid[row][col] !== EMPTY_CELL) return false;
      return value !== state.solution[row][col];
    }),
  );
}

function useGamePersistence(state: GameState): void {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Структурные изменения (не тики таймера) — сохраняем с debounce.
  useEffect(() => {
    const handle = window.setTimeout(() => saveGame(stateRef.current), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [state.currentGrid, state.notes, state.history, state.lives, state.status, state.result]);

  // Таймер и уход со страницы — периодический flush.
  useEffect(() => {
    const flush = () => saveGame(stateRef.current);
    const interval = window.setInterval(flush, TIMER_SAVE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

function useGameTimer({
  status,
  dispatch,
}: {
  status: GameStatus;
  dispatch: Dispatch<GameAction>;
}): void {
  useEffect(() => {
    if (status !== 'in_progress') return;
    const id = window.setInterval(() => {
      if (!document.hidden) dispatch({ type: 'TICK' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, dispatch]);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initGameState);
  const [settings, setSettings] = useState(loadSettings);

  const conflicts = useMemo(() => findConflicts(state.currentGrid), [state.currentGrid]);
  const mistakes = useMemo(
    () => computeMistakes(state),
    // Намеренно узкий набор зависимостей: пересчитываем ошибки только когда меняются
    // клетки/решение, а не на каждый тик таймера (state.elapsedSeconds).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.currentGrid, state.solution, state.initialGrid],
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useGamePersistence(state);
  useGameTimer({ status: state.status, dispatch });

  const notesMode = settings.notesMode;

  const inputDigit = ({ row, col, value }: DigitTarget) => {
    if (notesMode) dispatch({ type: 'TOGGLE_NOTE', row, col, value });
    else dispatch({ type: 'PLACE_DIGIT', row, col, value });
  };

  const newGame = (difficulty: Difficulty) => {
    setSettings((prev) => ({ ...prev, lastDifficulty: difficulty }));
    dispatch({ type: 'NEW_GAME', difficulty });
  };

  const toggleNotesMode = () => setSettings((prev) => ({ ...prev, notesMode: !prev.notesMode }));

  const api: GameApi = {
    state,
    conflicts,
    mistakes,
    won: state.status === 'completed' && state.result === 'won',
    lost: state.status === 'completed' && state.result === 'lost',
    canUndo: state.history.length > 0 && state.status === 'in_progress',
    notesMode,
    cellIsGiven: (row, col) => state.initialGrid[row][col] !== EMPTY_CELL,
    inputDigit,
    erase: ({ row, col }) => dispatch({ type: 'ERASE', row, col }),
    undo: () => dispatch({ type: 'UNDO' }),
    newGame,
    toggleNotesMode,
  };

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame должен использоваться внутри GameProvider');
  return context;
}
