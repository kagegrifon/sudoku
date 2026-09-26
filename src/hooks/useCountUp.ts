import { useEffect, useRef, useState } from 'react';

export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

interface CountUpArgs {
  target: number;
  durationMs: number;
  /** false — без анимации: сразу возвращается target. */
  enabled: boolean;
}

/** Число, плавно набегающее от предыдущего значения к target на requestAnimationFrame. */
export function useCountUp({ target, durationMs, enabled }: CountUpArgs): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (!enabled) {
      shownRef.current = target;
      return;
    }
    const from = shownRef.current;
    if (from === target) return;

    let frameId = 0;
    let startedAt: number | null = null;
    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const value = Math.round(from + (target - from) * easeOutCubic(progress));
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs, enabled]);

  return enabled ? shown : target;
}
