import { describe, it, expect } from 'vitest';
import { formatPoints, pointsWord } from './formatPoints';

describe('formatPoints', () => {
  it.each([
    { points: 0, expected: '0' },
    { points: 750, expected: '750' },
    { points: 21640, expected: '21 640' },
    { points: 1234567, expected: '1 234 567' },
  ])('$points → $expected', ({ points, expected }) => {
    expect(formatPoints(points)).toBe(expected);
  });
});

describe('pointsWord', () => {
  it.each([
    { count: 1, expected: 'очко' },
    { count: 21, expected: 'очко' },
    { count: 2, expected: 'очка' },
    { count: 24, expected: 'очка' },
    { count: 5, expected: 'очков' },
    { count: 11, expected: 'очков' },
    { count: 0, expected: 'очков' },
    { count: 89810, expected: 'очков' },
  ])('$count $expected', ({ count, expected }) => {
    expect(pointsWord(count)).toBe(expected);
  });
});
