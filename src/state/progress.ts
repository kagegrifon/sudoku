import type { Difficulty } from '../core';
import type { CompletedGame } from './storage/historyDb';

/** На переход L → L+1 нужно LEVEL_STEP_POINTS × L очков. */
export const LEVEL_STEP_POINTS = 5000;

/** Баланс, с которого начинается уровень: 5000 × (L−1) × L / 2. */
export function levelStart(level: number): number {
  return (LEVEL_STEP_POINTS * (level - 1) * level) / 2;
}

export function levelForTotal(total: number): number {
  let level = 1;
  while (levelStart(level + 1) <= total) level += 1;
  return level;
}

export interface LevelInfo {
  level: number;
  pointsIntoLevel: number;
  pointsForLevel: number;
  pointsToNext: number;
}

export function levelInfo(total: number): LevelInfo {
  const level = levelForTotal(total);
  const start = levelStart(level);
  const pointsForLevel = levelStart(level + 1) - start;
  const pointsIntoLevel = total - start;
  return { level, pointsIntoLevel, pointsForLevel, pointsToNext: pointsForLevel - pointsIntoLevel };
}

export type RankId =
  | 'novice'
  | 'apprentice'
  | 'amateur'
  | 'connoisseur'
  | 'expert'
  | 'master'
  | 'grandmaster';

export interface Rank {
  id: RankId;
  name: string;
  fromLevel: number;
  color: string;
}

/** Ранги по возрастанию fromLevel (спека §3.4). */
export const RANKS: readonly Rank[] = [
  { id: 'novice', name: 'Новичок', fromLevel: 1, color: '#37b26b' },
  { id: 'apprentice', name: 'Ученик', fromLevel: 3, color: '#3f9fd8' },
  { id: 'amateur', name: 'Любитель', fromLevel: 5, color: '#2f6fed' },
  { id: 'connoisseur', name: 'Знаток', fromLevel: 8, color: '#7b5cf0' },
  { id: 'expert', name: 'Эксперт', fromLevel: 12, color: '#12a4b6' },
  { id: 'master', name: 'Мастер', fromLevel: 17, color: '#e8a23a' },
  { id: 'grandmaster', name: 'Гроссмейстер', fromLevel: 25, color: '#d49a12' },
];

/** Последний ранг, чей fromLevel уже достигнут. */
export function rankForLevel(level: number): Rank {
  const reached = RANKS.filter((rank) => rank.fromLevel <= level);
  return reached.at(-1) ?? RANKS[0];
}

export function rankById(id: RankId): Rank {
  return RANKS.find((rank) => rank.id === id) ?? RANKS[0];
}

export function nextRankAfter(level: number): Rank | null {
  return RANKS.find((rank) => rank.fromLevel > level) ?? null;
}

export interface LevelSegment {
  level: number;
  fromFraction: number;
  toFraction: number;
  /** Сегмент доводит полоску до 100% — дальше идёт переход на следующий уровень. */
  completesLevel: boolean;
}

interface LevelUpSegmentsArgs {
  fromTotal: number;
  toTotal: number;
}

/** Сегменты анимации полоски уровня при росте баланса fromTotal → toTotal. */
export function levelUpSegments({ fromTotal, toTotal }: LevelUpSegmentsArgs): LevelSegment[] {
  const target = Math.max(fromTotal, toTotal);
  const segments: LevelSegment[] = [];
  let current = fromTotal;
  for (;;) {
    const level = levelForTotal(current);
    const start = levelStart(level);
    const end = levelStart(level + 1);
    const span = end - start;
    const fromFraction = (current - start) / span;
    if (target < end) {
      segments.push({ level, fromFraction, toFraction: (target - start) / span, completesLevel: false });
      return segments;
    }
    segments.push({ level, fromFraction, toFraction: 1, completesLevel: true });
    current = end;
  }
}

/** Очки одной записи журнала; старые записи без поля — 0. */
export function gameScore(game: CompletedGame): number {
  return game.score ?? 0;
}

/** Баланс игрока: сумма очков по всему журналу. */
export function totalScore(games: CompletedGame[]): number {
  return games.reduce((sum, game) => sum + gameScore(game), 0);
}

export type ScoreRecordsByDifficulty = Record<Difficulty, number | null>;

/** Рекорд очков по сложности среди побед; null — побед с очками нет. */
export function bestScoresByDifficulty(games: CompletedGame[]): ScoreRecordsByDifficulty {
  const best: ScoreRecordsByDifficulty = { easy: null, medium: null, hard: null };
  for (const game of games) {
    if (game.outcome !== 'won') continue;
    const score = gameScore(game);
    if (score <= 0) continue;
    const current = best[game.difficulty];
    if (current === null || score > current) best[game.difficulty] = score;
  }
  return best;
}
