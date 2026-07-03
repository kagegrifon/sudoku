// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSettings, loadSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './localSettings';
import { SETTINGS_SCHEMA_VERSION } from '../gameTypes';

beforeEach(() => {
  localStorage.clear();
});

describe('localSettings', () => {
  it('дефолты, если ничего не сохранено', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trip', () => {
    saveSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      notesMode: true,
      lastDifficulty: 'hard',
      iosInstallPromptDismissed: true,
    });
    const loaded = loadSettings();
    expect(loaded.notesMode).toBe(true);
    expect(loaded.lastDifficulty).toBe('hard');
    expect(loaded.iosInstallPromptDismissed).toBe(true);
  });
  it('дефолты при чужом schemaVersion', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, notesMode: true, lastDifficulty: 'hard' }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('дефолты при битом JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'oops');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
