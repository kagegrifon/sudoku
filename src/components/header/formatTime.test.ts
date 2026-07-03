import { describe, it, expect } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('0 → 00:00', () => expect(formatTime(0)).toBe('00:00'));
  it('9 → 00:09', () => expect(formatTime(9)).toBe('00:09'));
  it('75 → 01:15', () => expect(formatTime(75)).toBe('01:15'));
  it('3661 → 61:01 (минуты не ограничены 60)', () => expect(formatTime(3661)).toBe('61:01'));
  it('отрицательное → 00:00', () => expect(formatTime(-5)).toBe('00:00'));
});
