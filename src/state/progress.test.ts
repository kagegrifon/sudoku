import { describe, it, expect } from 'vitest';
import type { CompletedGame } from './storage/historyDb';
import {
  RANKS,
  levelStart,
  levelForTotal,
  levelInfo,
  rankForLevel,
  rankById,
  nextRankAfter,
  levelUpSegments,
  totalScore,
  bestScoresByDifficulty,
} from './progress';

function game(overrides: Partial<CompletedGame>): CompletedGame {
  return {
    id: crypto.randomUUID(),
    difficulty: 'easy',
    durationSeconds: 100,
    completedAt: '2026-09-26T00:00:00.000Z',
    outcome: 'won',
    ...overrides,
  };
}

describe('levelStart', () => {
  it.each([
    { level: 1, expected: 0 },
    { level: 2, expected: 5000 },
    { level: 3, expected: 15000 },
    { level: 4, expected: 30000 },
    { level: 5, expected: 50000 },
    { level: 6, expected: 75000 },
    { level: 10, expected: 225000 },
  ])('уровень $level начинается с $expected', ({ level, expected }) => {
    expect(levelStart(level)).toBe(expected);
  });
});

describe('levelForTotal', () => {
  it.each([
    { total: 0, expected: 1 },
    { total: 4999, expected: 1 },
    { total: 5000, expected: 2 },
    { total: 14999, expected: 2 },
    { total: 15000, expected: 3 },
    { total: 225000, expected: 10 },
  ])('$total очков → уровень $expected', ({ total, expected }) => {
    expect(levelForTotal(total)).toBe(expected);
  });
});

describe('levelInfo', () => {
  it('прогресс внутри уровня 6 при 89 810 очках', () => {
    expect(levelInfo(89810)).toEqual({
      level: 6,
      pointsIntoLevel: 14810,
      pointsForLevel: 30000,
      pointsToNext: 15190,
    });
  });
});

describe('rankForLevel', () => {
  it.each([
    { level: 1, rank: 'Новичок' },
    { level: 2, rank: 'Новичок' },
    { level: 3, rank: 'Ученик' },
    { level: 4, rank: 'Ученик' },
    { level: 5, rank: 'Любитель' },
    { level: 7, rank: 'Любитель' },
    { level: 8, rank: 'Знаток' },
    { level: 11, rank: 'Знаток' },
    { level: 12, rank: 'Эксперт' },
    { level: 16, rank: 'Эксперт' },
    { level: 17, rank: 'Мастер' },
    { level: 24, rank: 'Мастер' },
    { level: 25, rank: 'Гроссмейстер' },
    { level: 100, rank: 'Гроссмейстер' },
  ])('уровень $level → $rank', ({ level, rank }) => {
    expect(rankForLevel(level).name).toBe(rank);
  });

  it('RANKS отсортирован по fromLevel', () => {
    const levels = RANKS.map((rank) => rank.fromLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe('rankById / nextRankAfter', () => {
  it('rankById находит ранг по id', () => {
    expect(rankById('amateur').name).toBe('Любитель');
  });

  it('следующий ранг после уровня 6 — Знаток на ур. 8', () => {
    expect(nextRankAfter(6)).toMatchObject({ name: 'Знаток', fromLevel: 8 });
  });

  it('на последнем ранге следующего нет', () => {
    expect(nextRankAfter(30)).toBeNull();
  });
});

describe('levelUpSegments', () => {
  it('без перехода — один сегмент внутри уровня', () => {
    expect(levelUpSegments({ fromTotal: 1000, toTotal: 3000 })).toEqual([
      { level: 1, fromFraction: 0.2, toFraction: 0.6, completesLevel: false },
    ]);
  });

  it('один переход — сегмент до 100% и остаток на новом уровне', () => {
    expect(levelUpSegments({ fromTotal: 4000, toTotal: 6000 })).toEqual([
      { level: 1, fromFraction: 0.8, toFraction: 1, completesLevel: true },
      { level: 2, fromFraction: 0, toFraction: 0.1, completesLevel: false },
    ]);
  });

  it('два перехода подряд', () => {
    const segments = levelUpSegments({ fromTotal: 4000, toTotal: 16500 });
    expect(segments.map((segment) => segment.level)).toEqual([1, 2, 3]);
    expect(segments.map((segment) => segment.completesLevel)).toEqual([true, true, false]);
    expect(segments[2].toFraction).toBeCloseTo(0.1);
  });

  it('ровно на границе уровня — переход и пустой сегмент нового уровня', () => {
    expect(levelUpSegments({ fromTotal: 4000, toTotal: 5000 })).toEqual([
      { level: 1, fromFraction: 0.8, toFraction: 1, completesLevel: true },
      { level: 2, fromFraction: 0, toFraction: 0, completesLevel: false },
    ]);
  });

  it('без изменения баланса — один неподвижный сегмент', () => {
    expect(levelUpSegments({ fromTotal: 2500, toTotal: 2500 })).toEqual([
      { level: 1, fromFraction: 0.5, toFraction: 0.5, completesLevel: false },
    ]);
  });
});

describe('totalScore', () => {
  it('суммирует очки журнала, записи без score = 0', () => {
    const games = [game({ score: 700 }), game({ outcome: 'lost', score: 0 }), game({})];
    expect(totalScore(games)).toBe(700);
  });

  it('пустой журнал — 0', () => {
    expect(totalScore([])).toBe(0);
  });
});

describe('bestScoresByDifficulty', () => {
  it('максимум среди побед по каждой сложности', () => {
    const games = [
      game({ difficulty: 'easy', score: 500 }),
      game({ difficulty: 'easy', score: 900 }),
      game({ difficulty: 'hard', score: 4000 }),
      game({ difficulty: 'medium', outcome: 'lost', score: 0 }),
    ];
    expect(bestScoresByDifficulty(games)).toEqual({ easy: 900, medium: null, hard: 4000 });
  });

  it('старые победы без score рекорда очков не дают', () => {
    expect(bestScoresByDifficulty([game({ difficulty: 'easy' })])).toEqual({
      easy: null,
      medium: null,
      hard: null,
    });
  });
});
