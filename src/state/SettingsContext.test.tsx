// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsContext.dismissIosInstallPrompt', () => {
  it('по умолчанию iosInstallPromptDismissed = false', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.iosInstallPromptDismissed).toBe(false);
  });

  it('dismissIosInstallPrompt ставит флаг в true', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.dismissIosInstallPrompt();
    });
    expect(result.current.settings.iosInstallPromptDismissed).toBe(true);
  });
});
