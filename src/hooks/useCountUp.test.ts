// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { easeOutCubic, useCountUp } from './useCountUp';

afterEach(() => vi.useRealTimers());

describe('easeOutCubic', () => {
  it('0 → 0, 1 → 1, середина выше линейной', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('useCountUp', () => {
  it('выключен — сразу целевое значение', () => {
    const { result, rerender } = renderHook((props) => useCountUp(props), {
      initialProps: { target: 0, durationMs: 450, enabled: false },
    });
    rerender({ target: 750, durationMs: 450, enabled: false });
    expect(result.current).toBe(750);
  });

  it('включён — набегает и к концу длительности равен цели', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result, rerender } = renderHook((props) => useCountUp(props), {
      initialProps: { target: 0, durationMs: 450, enabled: true },
    });
    rerender({ target: 750, durationMs: 450, enabled: true });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(750);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(750);
  });
});
