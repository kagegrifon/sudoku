import type { Difficulty } from './types';

export const DIFFICULTY_CLUES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 36, max: 40 },
  medium: { min: 30, max: 35 },
  hard: { min: 24, max: 28 },
};

export function targetCluesFor(difficulty: Difficulty): number {
  const { min, max } = DIFFICULTY_CLUES[difficulty];
  return min + Math.floor(Math.random() * (max - min + 1));
}
