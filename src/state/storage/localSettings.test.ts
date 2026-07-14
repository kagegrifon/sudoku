// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSettings,
  loadSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from './localSettings';
import { SETTINGS_SCHEMA_VERSION } from '../gameTypes';

beforeEach(() => {
  localStorage.clear();
});

describe('localSettings', () => {
  it('дефолты, если ничего не сохранено', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trip сохраняет все поля', () => {
    saveSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      notesMode: true,
      lastDifficulty: 'hard',
      iosInstallPromptDismissed: true,
      theme: 'dark',
      highlightSameDigits: false,
      highlightPeers: false,
      showRemainingCounts: true,
    });
    const loaded = loadSettings();
    expect(loaded.notesMode).toBe(true);
    expect(loaded.lastDifficulty).toBe('hard');
    expect(loaded.theme).toBe('dark');
    expect(loaded.highlightSameDigits).toBe(false);
    expect(loaded.showRemainingCounts).toBe(true);
  });

  it('миграция v1→v2: сохраняет старые поля, добирает новые из дефолтов', () => {
    // Запись «старой» схемы v1 — без theme/highlight*/showRemainingCounts.
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, notesMode: true, lastDifficulty: 'hard' }),
    );
    const loaded = loadSettings();
    // Старые поля не потеряны.
    expect(loaded.notesMode).toBe(true);
    expect(loaded.lastDifficulty).toBe('hard');
    // Новые поля — из дефолтов, версия поднята.
    expect(loaded.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
    expect(loaded.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(loaded.highlightSameDigits).toBe(DEFAULT_SETTINGS.highlightSameDigits);
    expect(loaded.showRemainingCounts).toBe(DEFAULT_SETTINGS.showRemainingCounts);
  });

  it('дефолты при битом JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'oops');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
