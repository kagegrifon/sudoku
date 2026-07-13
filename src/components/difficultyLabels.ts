import type { Difficulty } from '../core';

/** Русские подписи сложностей — единый источник для всех экранов. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

/** Цвета рисок сложностей (совпадают с --diff-* токенами). */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'var(--diff-easy)',
  medium: 'var(--diff-medium)',
  hard: 'var(--diff-hard)',
};
