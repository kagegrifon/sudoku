import { describe, expect, it } from 'vitest';
import type { CompletedGame } from './storage/historyDb';
import {
  filterByPeriod,
  computeStats,
  bestTimesByDifficulty,
  type StatsPeriod,
} from './statsService';

// Фиксированный «сейчас» — детерминизм. Пятница.
const NOW = new Date('2026-07-03T12:00:00.000Z');

let idCounter = 0;
function game(overrides: Partial<CompletedGame>): CompletedGame {
  idCounter += 1;
  return {
    id: `g${idCounter}`,
    difficulty: 'easy',
    durationSeconds: 100,
    completedAt: NOW.toISOString(),
    outcome: 'won',
    ...overrides,
  };
}

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}
function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60_000).toISOString();
}

describe('filterByPeriod', () => {
  it('период all возвращает все записи', () => {
    const games = [game({ completedAt: isoDaysAgo(400) }), game({})];
    expect(filterByPeriod(games, 'all', NOW)).toHaveLength(2);
  });

  it('day оставляет только записи за последние 24 часа', () => {
    const recent = game({ completedAt: isoMinutesAgo(60) });
    const old = game({ completedAt: isoDaysAgo(2) });
    const result = filterByPeriod([recent, old], 'day', NOW);
    expect(result).toEqual([recent]);
  });

  it('сегодняшняя запись попадает и в day, и в week одновременно', () => {
    const today = game({ completedAt: isoMinutesAgo(30) });
    expect(filterByPeriod([today], 'day', NOW)).toEqual([today]);
    expect(filterByPeriod([today], 'week', NOW)).toEqual([today]);
    expect(filterByPeriod([today], 'month', NOW)).toEqual([today]);
  });

  it('week оставляет последние 7 дней, month — последние 30', () => {
    const fiveDays = game({ completedAt: isoDaysAgo(5) });
    const tenDays = game({ completedAt: isoDaysAgo(10) });
    const fortyDays = game({ completedAt: isoDaysAgo(40) });
    const all = [fiveDays, tenDays, fortyDays];
    expect(filterByPeriod(all, 'week', NOW)).toEqual([fiveDays]);
    expect(filterByPeriod(all, 'month', NOW)).toEqual([fiveDays, tenDays]);
  });
});

describe('computeStats — completionRate', () => {
  it('пустой журнал: rate 0, favoriteDifficulty null, времена null', () => {
    const stats = computeStats([]);
    expect(stats.completionRate).toBe(0);
    expect(stats.favoriteDifficulty).toBeNull();
    expect(stats.total.completedCount).toBe(0);
    expect(stats.total.bestTimeSeconds).toBeNull();
    expect(stats.total.averageTimeSeconds).toBeNull();
  });

  it('rate = won / (won + lost + abandoned)', () => {
    const games = [
      game({ outcome: 'won' }),
      game({ outcome: 'won' }),
      game({ outcome: 'lost' }),
      game({ outcome: 'abandoned' }),
    ];
    // 2 won из 4 всего
    expect(computeStats(games).completionRate).toBeCloseTo(0.5, 5);
  });
});

describe('computeStats — времена по won', () => {
  it('best/average считаются только по выигранным', () => {
    const games = [
      game({ outcome: 'won', durationSeconds: 100 }),
      game({ outcome: 'won', durationSeconds: 300 }),
      game({ outcome: 'lost', durationSeconds: 10 }), // игнор для времени
    ];
    const total = computeStats(games).total;
    expect(total.completedCount).toBe(2);
    expect(total.bestTimeSeconds).toBe(100);
    expect(total.averageTimeSeconds).toBe(200);
  });

  it('разбивка по сложности независима', () => {
    const games = [
      game({ difficulty: 'easy', outcome: 'won', durationSeconds: 50 }),
      game({ difficulty: 'hard', outcome: 'won', durationSeconds: 400 }),
      game({ difficulty: 'hard', outcome: 'won', durationSeconds: 200 }),
    ];
    const { byDifficulty } = computeStats(games);
    expect(byDifficulty.easy.completedCount).toBe(1);
    expect(byDifficulty.easy.bestTimeSeconds).toBe(50);
    expect(byDifficulty.medium.completedCount).toBe(0);
    expect(byDifficulty.medium.bestTimeSeconds).toBeNull();
    expect(byDifficulty.hard.completedCount).toBe(2);
    expect(byDifficulty.hard.bestTimeSeconds).toBe(200);
    expect(byDifficulty.hard.averageTimeSeconds).toBe(300);
  });
});

describe('computeStats — favoriteDifficulty', () => {
  it('самая частая сложность среди всех записей (включая lost/abandoned)', () => {
    const games = [
      game({ difficulty: 'hard', outcome: 'lost' }),
      game({ difficulty: 'hard', outcome: 'abandoned' }),
      game({ difficulty: 'easy', outcome: 'won' }),
    ];
    expect(computeStats(games).favoriteDifficulty).toBe('hard');
  });

  it('при равенстве count tie-break: easy < medium < hard', () => {
    const games = [
      game({ difficulty: 'medium', outcome: 'won' }),
      game({ difficulty: 'easy', outcome: 'won' }),
    ];
    // по одной — побеждает easy как более ранняя в порядке
    expect(computeStats(games).favoriteDifficulty).toBe('easy');

    const games2 = [
      game({ difficulty: 'hard', outcome: 'won' }),
      game({ difficulty: 'medium', outcome: 'won' }),
    ];
    expect(computeStats(games2).favoriteDifficulty).toBe('medium');
  });
});

// Проверка, что StatsPeriod-тип покрывает ровно 4 значения (документирующий тест).
it('StatsPeriod включает day/week/month/all', () => {
  const periods: StatsPeriod[] = ['day', 'week', 'month', 'all'];
  expect(periods).toHaveLength(4);
});

describe('bestTimesByDifficulty', () => {
  it('берёт минимум по won для каждой сложности, null при отсутствии побед', () => {
    const games = [
      game({ difficulty: 'easy', outcome: 'won', durationSeconds: 200 }),
      game({ difficulty: 'easy', outcome: 'won', durationSeconds: 150 }),
      game({ difficulty: 'easy', outcome: 'lost', durationSeconds: 10 }),
      game({ difficulty: 'medium', outcome: 'won', durationSeconds: 300 }),
      game({ difficulty: 'hard', outcome: 'abandoned', durationSeconds: 5 }),
    ];
    const best = bestTimesByDifficulty(games);
    expect(best.easy).toBe(150); // lost не учитывается
    expect(best.medium).toBe(300);
    expect(best.hard).toBeNull(); // только abandoned — побед нет
  });

  it('пустой журнал — все null', () => {
    expect(bestTimesByDifficulty([])).toEqual({ easy: null, medium: null, hard: null });
  });
});
