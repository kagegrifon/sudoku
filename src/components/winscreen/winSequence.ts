import { levelInfo, levelUpSegments, rankForLevel, type RankId } from '../../state/progress';

export type BarTransition = 'none' | 'first' | 'next';
export type WinEffect = 'winBurst' | 'levelBurst' | 'rankBurst';

/** Всё, что экран победы рисует в данный момент анимации. */
export interface WinView {
  scoreCounting: boolean;
  scorePopped: boolean;
  scoreBadgeShown: boolean;
  timeBadgeShown: boolean;
  progressShown: boolean;
  level: number;
  rankId: RankId;
  barFraction: number;
  barTransition: BarTransition;
  /** Растёт на каждом переходе уровня — ключ перезапуска анимации «pop». */
  levelPopCount: number;
  /** Растёт на каждой смене ранга — ключ перезапуска анимации «swap». */
  rankSwapCount: number;
  flash: boolean;
  newRankName: string | null;
  finished: boolean;
}

/** Шаг таймлайна: через delayMs после предыдущего применить patch и, если есть, эффект. */
export interface WinStep {
  delayMs: number;
  patch: Partial<WinView>;
  effect?: WinEffect;
}

export const WIN_TIMINGS = {
  startDelayMs: 300,
  countUpMs: 1200,
  scoreBadgeDelayMs: 250,
  timeBadgeDelayMs: 150,
  progressDelayMs: 300,
  barStartDelayMs: 400,
  firstSegmentMs: 900,
  nextSegmentMs: 600,
  flashMs: 350,
  rankGlyphSwapAtMs: 280,
  /** Пауза, чтобы браузер отрисовал сброс полоски в 0 до анимации следующего сегмента. */
  barResetGapMs: 50,
} as const;

const BAR_EASING = 'cubic-bezier(.2,.7,.3,1)';

export const BAR_TRANSITIONS: Record<BarTransition, string> = {
  none: 'none',
  first: `width ${WIN_TIMINGS.firstSegmentMs}ms ${BAR_EASING}`,
  next: `width ${WIN_TIMINGS.nextSegmentMs}ms ${BAR_EASING}`,
};

const SEGMENT_DURATIONS: Record<Exclude<BarTransition, 'none'>, number> = {
  first: WIN_TIMINGS.firstSegmentMs,
  next: WIN_TIMINGS.nextSegmentMs,
};

function barFractionOf(total: number): number {
  const info = levelInfo(total);
  return info.pointsIntoLevel / info.pointsForLevel;
}

export function initialWinView(prevTotal: number): WinView {
  const level = levelInfo(prevTotal).level;
  return {
    scoreCounting: false,
    scorePopped: false,
    scoreBadgeShown: false,
    timeBadgeShown: false,
    progressShown: false,
    level,
    rankId: rankForLevel(level).id,
    barFraction: barFractionOf(prevTotal),
    barTransition: 'none',
    levelPopCount: 0,
    rankSwapCount: 0,
    flash: false,
    newRankName: null,
    finished: false,
  };
}

interface LevelUpStepsArgs {
  segmentDurationMs: number;
  reachedLevel: number;
  levelPopCount: number;
  rankSwapCount: number;
}

/** Полоска дошла до 100%: вспышка → новый уровень → (смена ранга). */
function levelUpSteps({ segmentDurationMs, reachedLevel, levelPopCount, rankSwapCount }: LevelUpStepsArgs): WinStep[] {
  const steps: WinStep[] = [
    { delayMs: segmentDurationMs, patch: { flash: true } },
    {
      delayMs: WIN_TIMINGS.flashMs,
      patch: { flash: false, level: reachedLevel, levelPopCount, barFraction: 0, barTransition: 'none' },
      effect: 'levelBurst',
    },
  ];
  const previousRank = rankForLevel(reachedLevel - 1);
  const reachedRank = rankForLevel(reachedLevel);
  if (reachedRank.id === previousRank.id) return steps;

  // Анимация swap стартует вместе с pop уровня, глиф подменяется на её 280-й мс.
  steps.push({ delayMs: 0, patch: { rankSwapCount } });
  steps.push({
    delayMs: WIN_TIMINGS.rankGlyphSwapAtMs,
    patch: { rankId: reachedRank.id, newRankName: reachedRank.name },
    effect: 'rankBurst',
  });
  return steps;
}

interface WinTimelineArgs {
  prevTotal: number;
  nextTotal: number;
}

export function buildWinTimeline({ prevTotal, nextTotal }: WinTimelineArgs): WinStep[] {
  const steps: WinStep[] = [
    { delayMs: WIN_TIMINGS.startDelayMs, patch: { scoreCounting: true } },
    { delayMs: WIN_TIMINGS.countUpMs, patch: { scorePopped: true }, effect: 'winBurst' },
    { delayMs: WIN_TIMINGS.scoreBadgeDelayMs, patch: { scoreBadgeShown: true } },
    { delayMs: WIN_TIMINGS.timeBadgeDelayMs, patch: { timeBadgeShown: true } },
    { delayMs: WIN_TIMINGS.progressDelayMs, patch: { progressShown: true } },
  ];

  const segments = levelUpSegments({ fromTotal: prevTotal, toTotal: nextTotal });
  let rankSwapCount = 0;
  let lastSegmentDurationMs = 0;

  segments.forEach((segment, index) => {
    const isFirstSegment = index === 0;
    const transition: BarTransition = isFirstSegment ? 'first' : 'next';
    const startDelayMs = isFirstSegment ? WIN_TIMINGS.barStartDelayMs : WIN_TIMINGS.barResetGapMs;
    lastSegmentDurationMs = SEGMENT_DURATIONS[transition];

    steps.push({ delayMs: startDelayMs, patch: { barFraction: segment.toFraction, barTransition: transition } });
    if (!segment.completesLevel) return;

    const reachedLevel = segment.level + 1;
    const rankChanges = rankForLevel(reachedLevel).id !== rankForLevel(segment.level).id;
    if (rankChanges) rankSwapCount += 1;
    steps.push(
      ...levelUpSteps({
        segmentDurationMs: lastSegmentDurationMs,
        reachedLevel,
        levelPopCount: index + 1,
        rankSwapCount,
      }),
    );
  });

  steps.push({ delayMs: lastSegmentDurationMs, patch: { finished: true, barTransition: 'none' } });
  return steps;
}

interface FinalWinViewArgs {
  prevTotal: number;
  timeline: WinStep[];
}

/** Итоговое состояние — все шаги, применённые разом (skip и reduced-motion). */
export function finalWinView({ prevTotal, timeline }: FinalWinViewArgs): WinView {
  return timeline.reduce<WinView>((view, step) => ({ ...view, ...step.patch }), initialWinView(prevTotal));
}

/** Поражение: баланс не меняется, прогресс показан сразу и статично. */
export function lostWinView(prevTotal: number): WinView {
  return { ...initialWinView(prevTotal), progressShown: true, finished: true };
}
