import type { Difficulty } from '../core';
import type { GameResult } from './gameTypes';
import type { ScoreRecordsByDifficulty } from './progress';

/** Агрегаты журнала на момент ДО записи завершённой партии. */
export interface CompletionSnapshot {
  records: Record<Difficulty, number | null>;
  bestScores: ScoreRecordsByDifficulty;
  totalScore: number;
}

export interface CompletionSummary {
  isNewRecord: boolean;
  isNewScoreRecord: boolean;
  prevTotalScore: number;
  /** Баланс «после» считается локально — экран победы не ждёт журнал. */
  nextTotalScore: number;
}

export const NO_COMPLETION: CompletionSummary = {
  isNewRecord: false,
  isNewScoreRecord: false,
  prevTotalScore: 0,
  nextTotalScore: 0,
};

interface SummarizeCompletionArgs {
  result: GameResult;
  difficulty: Difficulty;
  elapsedSeconds: number;
  score: number;
  snapshot: CompletionSnapshot;
}

export function summarizeCompletion({
  result,
  difficulty,
  elapsedSeconds,
  score,
  snapshot,
}: SummarizeCompletionArgs): CompletionSummary {
  const prevTotalScore = snapshot.totalScore;
  // Очки проигранной партии сгорают: ни рекордов, ни прироста баланса.
  if (result === 'lost') {
    return { ...NO_COMPLETION, prevTotalScore, nextTotalScore: prevTotalScore };
  }
  const prevBestTime = snapshot.records[difficulty];
  const prevBestScore = snapshot.bestScores[difficulty];
  return {
    isNewRecord: prevBestTime === null || elapsedSeconds < prevBestTime,
    isNewScoreRecord: prevBestScore === null || score > prevBestScore,
    prevTotalScore,
    nextTotalScore: prevTotalScore + score,
  };
}
