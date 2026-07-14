// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { recordCompletedGame, getAllCompletedGames, clearAllCompletedGames } from './historyDb';

// Каждый тест — чистая БД: сбрасываем глобальный indexedDB.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('historyDb', () => {
  it('пустой журнал даёт пустой массив', async () => {
    expect(await getAllCompletedGames()).toEqual([]);
  });

  it('записанная партия читается обратно с присвоенным id', async () => {
    await recordCompletedGame({
      difficulty: 'easy',
      durationSeconds: 120,
      completedAt: '2026-07-03T10:00:00.000Z',
      outcome: 'won',
    });
    const games = await getAllCompletedGames();
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      difficulty: 'easy',
      durationSeconds: 120,
      completedAt: '2026-07-03T10:00:00.000Z',
      outcome: 'won',
    });
    expect(typeof games[0].id).toBe('string');
    expect(games[0].id.length).toBeGreaterThan(0);
  });

  it('несколько партий возвращаются отсортированными по completedAt (возр.)', async () => {
    await recordCompletedGame({
      difficulty: 'hard',
      durationSeconds: 300,
      completedAt: '2026-07-03T12:00:00.000Z',
      outcome: 'lost',
    });
    await recordCompletedGame({
      difficulty: 'medium',
      durationSeconds: 200,
      completedAt: '2026-07-03T09:00:00.000Z',
      outcome: 'abandoned',
    });
    const games = await getAllCompletedGames();
    expect(games.map((game) => game.completedAt)).toEqual([
      '2026-07-03T09:00:00.000Z',
      '2026-07-03T12:00:00.000Z',
    ]);
  });

  it('clearAllCompletedGames очищает журнал', async () => {
    await recordCompletedGame({
      difficulty: 'easy',
      durationSeconds: 120,
      completedAt: '2026-07-03T10:00:00.000Z',
      outcome: 'won',
    });
    expect(await getAllCompletedGames()).toHaveLength(1);
    await clearAllCompletedGames();
    expect(await getAllCompletedGames()).toEqual([]);
  });
});
