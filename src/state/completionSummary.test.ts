import { describe, it, expect } from 'vitest';
import { summarizeCompletion, type CompletionSnapshot } from './completionSummary';

const EMPTY_JOURNAL: CompletionSnapshot = {
  records: { easy: null, medium: null, hard: null },
  bestScores: { easy: null, medium: null, hard: null },
  totalScore: 0,
};

describe('summarizeCompletion', () => {
  it('первая победа — рекорд времени и очков, баланс растёт на счёт партии', () => {
    const summary = summarizeCompletion({
      result: 'won',
      difficulty: 'easy',
      elapsedSeconds: 300,
      score: 1200,
      snapshot: EMPTY_JOURNAL,
    });
    expect(summary).toEqual({
      isNewRecord: true,
      isNewScoreRecord: true,
      prevTotalScore: 0,
      nextTotalScore: 1200,
    });
  });

  it('рекорд очков только при строго большем счёте', () => {
    const snapshot: CompletionSnapshot = {
      records: { easy: 100, medium: null, hard: null },
      bestScores: { easy: 1200, medium: null, hard: null },
      totalScore: 5000,
    };
    const tie = summarizeCompletion({ result: 'won', difficulty: 'easy', elapsedSeconds: 200, score: 1200, snapshot });
    expect(tie.isNewScoreRecord).toBe(false);
    expect(tie.isNewRecord).toBe(false);
    const better = summarizeCompletion({ result: 'won', difficulty: 'easy', elapsedSeconds: 90, score: 1300, snapshot });
    expect(better.isNewScoreRecord).toBe(true);
    expect(better.isNewRecord).toBe(true);
    expect(better.nextTotalScore).toBe(6300);
  });

  it('поражение: рекордов нет, баланс не меняется (очки сгорают)', () => {
    const summary = summarizeCompletion({
      result: 'lost',
      difficulty: 'hard',
      elapsedSeconds: 50,
      score: 900,
      snapshot: { ...EMPTY_JOURNAL, totalScore: 7000 },
    });
    expect(summary).toEqual({
      isNewRecord: false,
      isNewScoreRecord: false,
      prevTotalScore: 7000,
      nextTotalScore: 7000,
    });
  });

  it('журнал не загружен (пустой снимок) — «после» считается локально', () => {
    const summary = summarizeCompletion({ result: 'won', difficulty: 'medium', elapsedSeconds: 10, score: 500, snapshot: EMPTY_JOURNAL });
    expect(summary.nextTotalScore).toBe(500);
  });
});
