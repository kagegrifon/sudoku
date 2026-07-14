/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Difficulty } from '../core';
import type { Settings, Theme } from './gameTypes';
import { loadSettings, saveSettings } from './storage/localSettings';
import { useApplyTheme } from '../theme/useApplyTheme';

/** Булевы тумблеры настроек — ключи, по которым переключаем флаг. */
export type SettingsFlag = 'highlightSameDigits' | 'highlightPeers' | 'showRemainingCounts';

export interface SettingsApi {
  settings: Settings;
  setTheme(theme: Theme): void;
  toggle(flag: SettingsFlag): void;
  notesMode: boolean;
  toggleNotesMode(): void;
  lastDifficulty: Difficulty;
  setLastDifficulty(difficulty: Difficulty): void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useApplyTheme(settings.theme);

  const api = useMemo<SettingsApi>(
    () => ({
      settings,
      setTheme: (theme) => setSettings((prev) => ({ ...prev, theme })),
      toggle: (flag) => setSettings((prev) => ({ ...prev, [flag]: !prev[flag] })),
      notesMode: settings.notesMode,
      toggleNotesMode: () => setSettings((prev) => ({ ...prev, notesMode: !prev.notesMode })),
      lastDifficulty: settings.lastDifficulty,
      setLastDifficulty: (difficulty) =>
        setSettings((prev) => ({ ...prev, lastDifficulty: difficulty })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings должен использоваться внутри SettingsProvider');
  return context;
}
