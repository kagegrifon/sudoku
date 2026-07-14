// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Управляемые из теста значения хука useRegisterSW.
const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
let needRefreshValue = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefreshValue, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

const saveGame = vi.fn();
vi.mock('./storage/localGame', () => ({
  saveGame: (state: unknown) => saveGame(state),
}));

import { useAppUpdate } from './appUpdate';
import type { GameState } from './gameTypes';

const FAKE_STATE = { puzzleId: 'p1', status: 'paused' } as unknown as GameState;

beforeEach(() => {
  updateServiceWorker.mockClear();
  saveGame.mockClear();
  needRefreshValue = false;
});

describe('useAppUpdate', () => {
  it('updateAvailable отражает needRefresh', () => {
    needRefreshValue = true;
    const { result } = renderHook(() => useAppUpdate(() => FAKE_STATE));
    expect(result.current.updateAvailable).toBe(true);
  });

  it('applyUpdate сохраняет партию, затем вызывает updateServiceWorker(true)', () => {
    const { result } = renderHook(() => useAppUpdate(() => FAKE_STATE));
    act(() => {
      result.current.applyUpdate();
    });
    expect(saveGame).toHaveBeenCalledWith(FAKE_STATE);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    // Сохранение — до перезагрузки.
    expect(saveGame.mock.invocationCallOrder[0]).toBeLessThan(
      updateServiceWorker.mock.invocationCallOrder[0],
    );
  });
});
