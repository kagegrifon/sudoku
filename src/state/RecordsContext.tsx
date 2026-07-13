/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Difficulty } from '../core';
import { getAllCompletedGames } from './storage/historyDb';
import { bestTimesByDifficulty } from './statsService';

export type RecordsByDifficulty = Record<Difficulty, number | null>;

const EMPTY_RECORDS: RecordsByDifficulty = { easy: null, medium: null, hard: null };

export interface RecordsApi {
  records: RecordsByDifficulty;
  refresh(): Promise<void>;
}

const RecordsContext = createContext<RecordsApi | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<RecordsByDifficulty>(EMPTY_RECORDS);

  const refresh = useCallback(async () => {
    const games = await getAllCompletedGames();
    setRecords(bestTimesByDifficulty(games));
  }, []);

  useEffect(() => {
    // refresh асинхронный: setState вызывается после await, не синхронно в теле
    // эффекта — правило это не распознаёт, поэтому подавляем точечно.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const api = useMemo<RecordsApi>(() => ({ records, refresh }), [records, refresh]);

  return <RecordsContext.Provider value={api}>{children}</RecordsContext.Provider>;
}

export function useRecords(): RecordsApi {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords должен использоваться внутри RecordsProvider');
  return context;
}
