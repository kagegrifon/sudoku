import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Difficulty } from '../../core';

export type GameOutcome = 'won' | 'lost' | 'abandoned';

export interface CompletedGame {
  id: string;
  difficulty: Difficulty;
  durationSeconds: number;
  completedAt: string; // ISO
  outcome: GameOutcome;
}

const DB_NAME = 'sudoku-history';
const DB_VERSION = 1;
const STORE_NAME = 'games';
const COMPLETED_AT_INDEX = 'by-completedAt';

interface HistorySchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: CompletedGame;
    indexes: { [COMPLETED_AT_INDEX]: string };
  };
}

// Промис БД пересоздаётся, если тест подменил глобальный indexedDB.
let dbPromise: Promise<IDBPDatabase<HistorySchema>> | null = null;
let dbFactory: IDBFactory | null = null;

function getDb(): Promise<IDBPDatabase<HistorySchema>> {
  if (dbPromise === null || dbFactory !== globalThis.indexedDB) {
    dbFactory = globalThis.indexedDB;
    dbPromise = openDB<HistorySchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(COMPLETED_AT_INDEX, 'completedAt');
      },
    });
  }
  return dbPromise;
}

export async function recordCompletedGame(game: Omit<CompletedGame, 'id'>): Promise<void> {
  try {
    const db = await getDb();
    const record: CompletedGame = { ...game, id: crypto.randomUUID() };
    await db.put(STORE_NAME, record);
  } catch {
    // Журнал недоступен — статистика просто не пополнится, игра не ломается.
  }
}

export async function getAllCompletedGames(): Promise<CompletedGame[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex(STORE_NAME, COMPLETED_AT_INDEX);
  } catch {
    return [];
  }
}
