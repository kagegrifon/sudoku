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
import { bestScoresByDifficulty, totalScore, type ScoreRecordsByDifficulty } from './progress';

export type RecordsByDifficulty = Record<Difficulty, number | null>;

/** Агрегаты журнала — единственный контекст, который их считает. */
interface JournalAggregates {
  records: RecordsByDifficulty;
  bestScores: ScoreRecordsByDifficulty;
  totalScore: number;
}

const EMPTY_AGGREGATES: JournalAggregates = {
  records: { easy: null, medium: null, hard: null },
  bestScores: { easy: null, medium: null, hard: null },
  totalScore: 0,
};

export interface RecordsApi extends JournalAggregates {
  refresh(): Promise<void>;
}

const RecordsContext = createContext<RecordsApi | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [aggregates, setAggregates] = useState<JournalAggregates>(EMPTY_AGGREGATES);

  const refresh = useCallback(async () => {
    const games = await getAllCompletedGames();
    setAggregates({
      records: bestTimesByDifficulty(games),
      bestScores: bestScoresByDifficulty(games),
      totalScore: totalScore(games),
    });
  }, []);

  useEffect(() => {
    // refresh асинхронный: setState вызывается после await, не синхронно в теле
    // эффекта — правило это не распознаёт, поэтому подавляем точечно.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const api = useMemo<RecordsApi>(() => ({ ...aggregates, refresh }), [aggregates, refresh]);

  return <RecordsContext.Provider value={api}>{children}</RecordsContext.Provider>;
}

export function useRecords(): RecordsApi {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords должен использоваться внутри RecordsProvider');
  return context;
}
