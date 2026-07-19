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
import { gameReducer, createIdleGameState } from './gameReducer';
import type { GameState, GameAction, GameStatus } from './gameTypes';
import { loadGame, saveGame, clearGame } from './storage/localGame';
import { loadSettings } from './storage/localSettings';
import { recordCompletedGame } from './storage/historyDb';
import { countRemainingDigits, type RemainingDigit } from './remainingDigits';
import { useSettings } from './SettingsContext';
import { useRecords } from './RecordsContext';

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
  isNewRecord: boolean;
  canUndo: boolean;
  notesMode: boolean;
  remainingByDigit: Record<number, RemainingDigit>;
  cellIsGiven(row: number, col: number): boolean;
  inputDigit(target: DigitTarget): void;
  erase(target: CellTarget): void;
  undo(): void;
  newGame(difficulty: Difficulty): void;
  resetToIdle(): void;
  toggleNotesMode(): void;
  pause(): void;
  resume(): void;
}

const GameContext = createContext<GameApi | null>(null);

function initGameState(): GameState {
  const restored = loadGame();
  if (restored) return restored;
  // Без сохранённой партии не стартуем игру автоматически: показываем главный
  // экран в состоянии idle. Игра начинается только по явному выбору сложности.
  return createIdleGameState(loadSettings().lastDifficulty);
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

/**
 * Пишет CompletedGame один раз при переходе партии в 'completed' и определяет,
 * побит ли рекорд. `prevBest` читается ДО записи/refresh — иначе свежий результат
 * сам бы стал «предыдущим» рекордом. Возвращает флаг isNewRecord.
 */
function useRecordCompletion(state: GameState): boolean {
  const { records, refresh } = useRecords();
  const [isNewRecord, setIsNewRecord] = useState(false);
  const prevStatus = useRef(state.status);

  // Держим свежие records в ref, чтобы эффект завершения не зависел от них
  // (иначе он бы перезапускался на каждый refresh).
  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    // setState здесь — намеренная реакция на переход партии в/из 'completed'
    // (сброс и вычисление флага рекорда). Правило этого не распознаёт.
    /* eslint-disable react-hooks/set-state-in-effect */
    const justCompleted = prevStatus.current !== 'completed' && state.status === 'completed';
    prevStatus.current = state.status;
    if (state.status !== 'completed') setIsNewRecord(false);
    const result = state.result;
    if (!justCompleted || result === undefined) return;

    if (result === 'won') {
      const prevBest = recordsRef.current[state.difficulty];
      setIsNewRecord(prevBest === null || state.elapsedSeconds < prevBest);
    } else {
      setIsNewRecord(false);
    }

    void (async () => {
      await recordCompletedGame({
        difficulty: state.difficulty,
        durationSeconds: state.elapsedSeconds,
        completedAt: new Date().toISOString(),
        outcome: result,
      });
      await refresh();
    })();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state.status, state.result, state.difficulty, state.elapsedSeconds, refresh]);

  return isNewRecord;
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
  const { notesMode, toggleNotesMode, setLastDifficulty } = useSettings();

  const conflicts = useMemo(() => findConflicts(state.currentGrid), [state.currentGrid]);
  const mistakes = useMemo(
    () => computeMistakes(state),
    // Намеренно узкий набор зависимостей: пересчитываем ошибки только когда меняются
    // клетки/решение, а не на каждый тик таймера (state.elapsedSeconds).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.currentGrid, state.solution, state.initialGrid],
  );

  const remainingByDigit = useMemo(
    () => countRemainingDigits({ currentGrid: state.currentGrid, solution: state.solution }),
    [state.currentGrid, state.solution],
  );

  useGamePersistence(state);
  useGameTimer({ status: state.status, dispatch });
  const isNewRecord = useRecordCompletion(state);

  const inputDigit = ({ row, col, value }: DigitTarget) => {
    if (notesMode) dispatch({ type: 'TOGGLE_NOTE', row, col, value });
    else dispatch({ type: 'PLACE_DIGIT', row, col, value });
  };

  const newGame = (difficulty: Difficulty) => {
    const abandoningStartedGame =
      state.status === 'in_progress' && (state.history.length > 0 || state.elapsedSeconds > 0);
    if (abandoningStartedGame) {
      recordCompletedGame({
        difficulty: state.difficulty,
        durationSeconds: state.elapsedSeconds,
        completedAt: new Date().toISOString(),
        outcome: 'abandoned',
      });
    }
    setLastDifficulty(difficulty);
    dispatch({ type: 'NEW_GAME', difficulty });
  };

  const api: GameApi = {
    state,
    conflicts,
    mistakes,
    won: state.status === 'completed' && state.result === 'won',
    lost: state.status === 'completed' && state.result === 'lost',
    isNewRecord,
    canUndo: state.history.length > 0 && state.status === 'in_progress',
    notesMode,
    remainingByDigit,
    cellIsGiven: (row, col) => state.initialGrid[row][col] !== EMPTY_CELL,
    inputDigit,
    erase: ({ row, col }) => dispatch({ type: 'ERASE', row, col }),
    undo: () => dispatch({ type: 'UNDO' }),
    newGame,
    resetToIdle: () => {
      clearGame();
      dispatch({ type: 'RESET_TO_IDLE' });
    },
    toggleNotesMode,
    pause: () => dispatch({ type: 'PAUSE' }),
    resume: () => dispatch({ type: 'RESUME' }),
  };

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame должен использоваться внутри GameProvider');
  return context;
}
