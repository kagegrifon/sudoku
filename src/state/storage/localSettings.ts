import { SETTINGS_SCHEMA_VERSION, type Settings } from '../gameTypes';

export const SETTINGS_STORAGE_KEY = 'sudoku:settings';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  notesMode: false,
  lastDifficulty: 'easy',
  iosInstallPromptDismissed: false,
};

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

export function loadSettings(): Settings {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION) return { ...DEFAULT_SETTINGS };
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      notesMode: parsed.notesMode ?? DEFAULT_SETTINGS.notesMode,
      lastDifficulty: parsed.lastDifficulty ?? DEFAULT_SETTINGS.lastDifficulty,
      iosInstallPromptDismissed:
        parsed.iosInstallPromptDismissed ?? DEFAULT_SETTINGS.iosInstallPromptDismissed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
