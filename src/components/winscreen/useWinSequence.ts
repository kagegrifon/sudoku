import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameResult } from '../../state/gameTypes';
import {
  buildWinTimeline,
  finalWinView,
  initialWinView,
  lostWinView,
  type WinEffect,
  type WinView,
} from './winSequence';

interface UseWinSequenceArgs {
  result: GameResult;
  prevTotalScore: number;
  nextTotalScore: number;
  reducedMotion: boolean;
  onEffect(effect: WinEffect): void;
}

/**
 * Проигрывает таймлайн экрана победы. skip() — сразу финал без эффектов.
 * Поражение и reduced-motion — сразу финал.
 */
export function useWinSequence({
  result,
  prevTotalScore,
  nextTotalScore,
  reducedMotion,
  onEffect,
}: UseWinSequenceArgs): { view: WinView; skip(): void } {
  const timeline = useMemo(
    () => buildWinTimeline({ prevTotal: prevTotalScore, nextTotal: nextTotalScore }),
    [prevTotalScore, nextTotalScore],
  );
  const finalView = useMemo(() => {
    if (result === 'lost') return lostWinView(prevTotalScore);
    return finalWinView({ prevTotal: prevTotalScore, timeline });
  }, [result, prevTotalScore, timeline]);

  const animate = result === 'won' && !reducedMotion;
  const [view, setView] = useState<WinView>(() => initialWinView(prevTotalScore));
  const [skipped, setSkipped] = useState(false);
  const timersRef = useRef<number[]>([]);

  const onEffectRef = useRef(onEffect);
  useEffect(() => {
    onEffectRef.current = onEffect;
  }, [onEffect]);

  useEffect(() => {
    if (!animate) return;
    let elapsedMs = 0;
    timersRef.current = timeline.map((step) => {
      elapsedMs += step.delayMs;
      return window.setTimeout(() => {
        setView((current) => ({ ...current, ...step.patch }));
        if (step.effect) onEffectRef.current(step.effect);
      }, elapsedMs);
    });
    return () => timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
  }, [animate, timeline]);

  const skip = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
    setSkipped(true);
  }, []);

  const showFinal = !animate || skipped;
  return { view: showFinal ? finalView : view, skip };
}
