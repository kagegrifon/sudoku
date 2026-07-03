import type { Difficulty, Grid } from '../core';

export const GAME_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 1;
export const INITIAL_LIVES = 3;

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

export type GameStatus = 'in_progress' | 'completed';
export type GameResult = 'won' | 'lost';

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
}

export type GameAction =
  | { type: 'PLACE_DIGIT'; row: number; col: number; value: number }
  | { type: 'TOGGLE_NOTE'; row: number; col: number; value: number }
  | { type: 'ERASE'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'TICK' }
  | { type: 'NEW_GAME'; difficulty: Difficulty }
  | { type: 'RESTORE'; state: GameState };

export interface Settings {
  schemaVersion: number;
  notesMode: boolean;
  lastDifficulty: Difficulty;
  iosInstallPromptDismissed: boolean;
}
