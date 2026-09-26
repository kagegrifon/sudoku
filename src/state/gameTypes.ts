import type { Difficulty, Grid } from '../core';
import type { ClosedUnits } from './scoring';

export const GAME_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 2;
export const INITIAL_LIVES = 3;

export type Theme = 'system' | 'light' | 'dark';

export interface CellNotesSnapshot {
  row: number;
  col: number;
  prevNotes: number[];
}

export interface Move {
  row: number;
  col: number;
  prevValue: number;
  newValue: number;
  wasNote: boolean;
  wasMistake: boolean;
  clearedNotes: CellNotesSnapshot[];
}

export type GameStatus = 'idle' | 'in_progress' | 'paused' | 'completed';
export type GameResult = 'won' | 'lost';

/** Последнее изменение счёта — для всплывашки над клеткой. Не восстанавливается из хранилища. */
export interface ScoreEvent {
  /** Монотонный счётчик в пределах партии — ключ для перезапуска анимации. */
  id: number;
  row: number;
  col: number;
  /** +начислено или −фактический штраф (с учётом пола 0). */
  delta: number;
  /** 1 для обычной цифры и для ошибки. */
  multiplier: number;
  /** Какие юниты закрыла постановка — для подсветки. */
  closedUnits: ClosedUnits;
}

export interface GameState {
  schemaVersion: number;
  puzzleId: string;
  difficulty: Difficulty;
  initialGrid: Grid;
  currentGrid: Grid;
  solution: Grid;
  notes: number[][][]; // notes[row][col] = отсортированные кандидаты
  history: Move[];
  lives: number;
  elapsedSeconds: number;
  startedAt: string; // ISO
  status: GameStatus;
  result?: GameResult;
  /** Счёт текущей партии, ≥ 0. */
  score: number;
  /** elapsedSeconds последней оплаченной верной цифры. */
  lastCorrectAtSecond: number;
  /** 9×9: клетка уже принесла очки (анти-фарм через erase/undo). */
  scoredCells: boolean[][];
  lastScoreEvent: ScoreEvent | null;
}

export type ScoreFields = Pick<
  GameState,
  'score' | 'lastCorrectAtSecond' | 'scoredCells' | 'lastScoreEvent'
>;

export type GameAction =
  | { type: 'PLACE_DIGIT'; row: number; col: number; value: number }
  | { type: 'TOGGLE_NOTE'; row: number; col: number; value: number }
  | { type: 'ERASE'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'TICK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEW_GAME'; difficulty: Difficulty }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'RESTORE'; state: GameState };

export interface Settings {
  schemaVersion: number;
  notesMode: boolean;
  lastDifficulty: Difficulty;
  iosInstallPromptDismissed: boolean;
  theme: Theme;
  highlightSameDigits: boolean;
  highlightPeers: boolean;
  showRemainingCounts: boolean;
}
