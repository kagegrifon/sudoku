import { describe, it, expect } from 'vitest';
import {
  WIN_TIMINGS,
  buildWinTimeline,
  finalWinView,
  initialWinView,
  lostWinView,
} from './winSequence';

function effectsOf(timeline: ReturnType<typeof buildWinTimeline>) {
  return timeline.flatMap((step) => (step.effect ? [step.effect] : []));
}

describe('initialWinView', () => {
  it('стартует с уровня и доли полоски старого баланса, всё скрыто', () => {
    const view = initialWinView(2500);
    expect(view.level).toBe(1);
    expect(view.rankId).toBe('novice');
    expect(view.barFraction).toBeCloseTo(0.5);
    expect(view.scoreCounting).toBe(false);
    expect(view.progressShown).toBe(false);
    expect(view.finished).toBe(false);
  });
});

describe('buildWinTimeline', () => {
  it('начало: 300 мс до набегания, 1200 мс до pop и залпа победы', () => {
    const timeline = buildWinTimeline({ prevTotal: 0, nextTotal: 750 });
    expect(timeline[0]).toMatchObject({ delayMs: WIN_TIMINGS.startDelayMs, patch: { scoreCounting: true } });
    expect(timeline[1]).toMatchObject({ delayMs: WIN_TIMINGS.countUpMs, effect: 'winBurst' });
  });

  it('без перехода уровня — ни вспышки, ни залпа уровня', () => {
    const timeline = buildWinTimeline({ prevTotal: 1000, nextTotal: 3000 });
    expect(effectsOf(timeline)).toEqual(['winBurst']);
    const view = finalWinView({ prevTotal: 1000, timeline });
    expect(view.level).toBe(1);
    expect(view.barFraction).toBeCloseTo(0.6);
    expect(view.finished).toBe(true);
    expect(view.newRankName).toBeNull();
  });

  it('один переход уровня без смены ранга', () => {
    const timeline = buildWinTimeline({ prevTotal: 4000, nextTotal: 6000 });
    expect(effectsOf(timeline)).toEqual(['winBurst', 'levelBurst']);
    const view = finalWinView({ prevTotal: 4000, timeline });
    expect(view.level).toBe(2);
    expect(view.levelPopCount).toBe(1);
    expect(view.barFraction).toBeCloseTo(0.1);
    expect(view.rankSwapCount).toBe(0);
    expect(view.flash).toBe(false);
  });

  it('переход со сменой ранга: залп ранга и строка нового ранга', () => {
    const timeline = buildWinTimeline({ prevTotal: 14000, nextTotal: 15500 });
    expect(effectsOf(timeline)).toEqual(['winBurst', 'levelBurst', 'rankBurst']);
    const view = finalWinView({ prevTotal: 14000, timeline });
    expect(view.level).toBe(3);
    expect(view.rankId).toBe('apprentice');
    expect(view.rankSwapCount).toBe(1);
    expect(view.newRankName).toBe('Ученик');
  });

  it('два перехода подряд — два pop уровня', () => {
    const view = finalWinView({ prevTotal: 4000, timeline: buildWinTimeline({ prevTotal: 4000, nextTotal: 16500 }) });
    expect(view.level).toBe(3);
    expect(view.levelPopCount).toBe(2);
  });

  it('первый сегмент стартует через 400 мс с медленным переходом, последующие — быстрее', () => {
    const timeline = buildWinTimeline({ prevTotal: 4000, nextTotal: 6000 });
    const barSteps = timeline.filter((step) => step.patch.barTransition !== undefined && step.patch.barTransition !== 'none');
    expect(barSteps[0]).toMatchObject({ delayMs: WIN_TIMINGS.barStartDelayMs, patch: { barTransition: 'first' } });
    expect(barSteps[1].patch.barTransition).toBe('next');
  });
});

describe('lostWinView', () => {
  it('поражение: статичный прогресс по старому балансу, сразу финал', () => {
    const view = lostWinView(89810);
    expect(view.level).toBe(6);
    expect(view.progressShown).toBe(true);
    expect(view.finished).toBe(true);
    expect(view.newRankName).toBeNull();
  });
});
