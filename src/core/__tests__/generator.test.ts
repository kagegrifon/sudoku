import { describe, it, expect } from 'vitest';
import { generateFullGrid } from '../generator';
import { isSolved } from '../validator';

describe('generateFullGrid', () => {
  it('всегда даёт валидное решённое поле (прогон 20 раз)', () => {
    for (let i = 0; i < 20; i++) {
      expect(isSolved(generateFullGrid())).toBe(true);
    }
  });
  it('даёт разные поля (рандомизация)', () => {
    const a = JSON.stringify(generateFullGrid());
    const b = JSON.stringify(generateFullGrid());
    expect(a).not.toBe(b);
  });
});
