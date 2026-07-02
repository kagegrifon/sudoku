import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CLUES, targetCluesFor } from '../difficulty';

describe('DIFFICULTY_CLUES', () => {
  it('диапазоны соответствуют спеке §5.1', () => {
    expect(DIFFICULTY_CLUES.easy).toEqual({ min: 36, max: 40 });
    expect(DIFFICULTY_CLUES.medium).toEqual({ min: 30, max: 35 });
    expect(DIFFICULTY_CLUES.hard).toEqual({ min: 24, max: 28 });
  });
});

describe('targetCluesFor', () => {
  it('возвращает число в диапазоне сложности', () => {
    for (let i = 0; i < 30; i++) {
      const clues = targetCluesFor('medium');
      expect(clues).toBeGreaterThanOrEqual(30);
      expect(clues).toBeLessThanOrEqual(35);
    }
  });
});
