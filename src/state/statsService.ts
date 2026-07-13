import type { Difficulty } from '../core';
import type { CompletedGame } from './storage/historyDb';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';

export interface DifficultyStats {
  completedCount: number; // число выигранных партий
  bestTimeSeconds: number | null; // по won; null если выигранных нет
  averageTimeSeconds: number | null; // по won; null если выигранных нет
}

export interface PeriodStats {
  total: DifficultyStats;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  completionRate: number; // won / (won + lost + abandoned); 0 если записей нет
  favoriteDifficulty: Difficulty | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Сколько дней назад отсчитывать порог для каждого периода; 'all' — без порога.
const PERIOD_WINDOW_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = {
  day: 1,
  week: 7,
  month: 30,
};

// Порядок сложностей задаёт tie-break для favoriteDifficulty.
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export function filterByPeriod(
  games: CompletedGame[],
  period: StatsPeriod,
  now: Date,
): CompletedGame[] {
  if (period === 'all') return games;
  const thresholdMs = now.getTime() - PERIOD_WINDOW_DAYS[period] * DAY_MS;
  return games.filter((game) => new Date(game.completedAt).getTime() >= thresholdMs);
}

function statsFromWins(wins: CompletedGame[]): DifficultyStats {
  if (wins.length === 0) {
    return { completedCount: 0, bestTimeSeconds: null, averageTimeSeconds: null };
  }
  const durations = wins.map((game) => game.durationSeconds);
  const totalDuration = durations.reduce((sum, seconds) => sum + seconds, 0);
  return {
    completedCount: wins.length,
    bestTimeSeconds: Math.min(...durations),
    averageTimeSeconds: Math.round(totalDuration / wins.length),
  };
}

function emptyByDifficulty(): Record<Difficulty, DifficultyStats> {
  const empty: DifficultyStats = {
    completedCount: 0,
    bestTimeSeconds: null,
    averageTimeSeconds: null,
  };
  return { easy: { ...empty }, medium: { ...empty }, hard: { ...empty } };
}

function pickFavoriteDifficulty(games: CompletedGame[]): Difficulty | null {
  if (games.length === 0) return null;
  const counts = new Map<Difficulty, number>();
  for (const game of games) {
    counts.set(game.difficulty, (counts.get(game.difficulty) ?? 0) + 1);
  }
  let favorite: Difficulty = DIFFICULTY_ORDER[0];
  let favoriteCount = -1;
  // Идём в фиксированном порядке — при равенстве count побеждает более ранняя сложность.
  for (const difficulty of DIFFICULTY_ORDER) {
    const count = counts.get(difficulty) ?? 0;
    if (count > favoriteCount) {
      favorite = difficulty;
      favoriteCount = count;
    }
  }
  return favorite;
}

/**
 * Лучшее время (в секундах) по каждой сложности среди выигранных партий.
 * null, если по сложности нет побед.
 */
export function bestTimesByDifficulty(games: CompletedGame[]): Record<Difficulty, number | null> {
  const wins = games.filter((game) => game.outcome === 'won');
  const result = {} as Record<Difficulty, number | null>;
  for (const difficulty of DIFFICULTY_ORDER) {
    const winsForDifficulty = wins.filter((game) => game.difficulty === difficulty);
    result[difficulty] = statsFromWins(winsForDifficulty).bestTimeSeconds;
  }
  return result;
}

export function computeStats(games: CompletedGame[]): PeriodStats {
  const wins = games.filter((game) => game.outcome === 'won');

  const byDifficulty = emptyByDifficulty();
  for (const difficulty of DIFFICULTY_ORDER) {
    const winsForDifficulty = wins.filter((game) => game.difficulty === difficulty);
    byDifficulty[difficulty] = statsFromWins(winsForDifficulty);
  }

  const completionRate = games.length === 0 ? 0 : wins.length / games.length;

  return {
    total: statsFromWins(wins),
    byDifficulty,
    completionRate,
    favoriteDifficulty: pickFavoriteDifficulty(games),
  };
}
