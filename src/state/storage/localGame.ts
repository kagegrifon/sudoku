import { GAME_SCHEMA_VERSION, type GameState } from '../gameTypes';

export const GAME_STORAGE_KEY = 'sudoku:game';

// Восстанавливаем только незавершённые партии, поэтому и храним только их.
const PERSISTABLE_STATUSES: ReadonlySet<GameState['status']> = new Set(['in_progress', 'paused']);

export function saveGame(state: GameState): void {
  // idle (нет партии) и completed (завершена) хранить незачем — стираем запись,
  // чтобы при следующей загрузке приложение не пыталось восстановить их.
  if (!PERSISTABLE_STATUSES.has(state.status)) {
    clearGame();
    return;
  }
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Хранилище недоступно/переполнено — партия просто не сохранится.
  }
}

function isRestorableGame(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<GameState>;
  if (candidate.schemaVersion !== GAME_SCHEMA_VERSION) return false;
  // Восстанавливаем и незавершённые, и поставленные на паузу партии.
  if (candidate.status !== 'in_progress' && candidate.status !== 'paused') return false;
  return true;
}

export function loadGame(): GameState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(GAME_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRestorableGame(parsed) ? parsed : null;
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch {
    // no-op
  }
}
