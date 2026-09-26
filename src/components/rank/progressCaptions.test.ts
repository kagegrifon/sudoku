import { describe, it, expect } from 'vitest';
import { homeProfileCaption, statsProgressCaption } from './progressCaptions';

describe('progressCaptions', () => {
  it('главный: баланс и остаток до следующего уровня', () => {
    expect(homeProfileCaption(89810)).toBe('89 810 очков · до ур. 7: 15 190');
  });

  it('статистика: баланс и следующий ранг', () => {
    expect(statsProgressCaption(89810)).toBe('89 810 очков · след. ранг: Знаток на ур. 8');
  });

  it('статистика на последнем ранге — только баланс', () => {
    expect(statsProgressCaption(1_500_000)).toBe('1 500 000 очков');
  });
});
