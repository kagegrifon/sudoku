import { SETTINGS_SCHEMA_VERSION, type Settings } from '../gameTypes';

export const SETTINGS_STORAGE_KEY = 'sudoku:settings';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  notesMode: false,
  lastDifficulty: 'easy',
  iosInstallPromptDismissed: false,
  theme: 'system',
  highlightSameDigits: true,
  highlightPeers: true,
  showRemainingCounts: false,
};

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

/**
 * Дополняет разобранный объект настроек до актуальной схемы, сохраняя уже
 * записанные поля (напр. lastDifficulty/notesMode из v1). Неизвестные версии и
 * отсутствующие поля падают на дефолты — это и есть миграция v1→v2.
 */
function migrateSettings(parsed: Partial<Settings>): Settings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    notesMode: parsed.notesMode ?? DEFAULT_SETTINGS.notesMode,
    lastDifficulty: parsed.lastDifficulty ?? DEFAULT_SETTINGS.lastDifficulty,
    iosInstallPromptDismissed:
      parsed.iosInstallPromptDismissed ?? DEFAULT_SETTINGS.iosInstallPromptDismissed,
    theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
    highlightSameDigits: parsed.highlightSameDigits ?? DEFAULT_SETTINGS.highlightSameDigits,
    highlightPeers: parsed.highlightPeers ?? DEFAULT_SETTINGS.highlightPeers,
    showRemainingCounts: parsed.showRemainingCounts ?? DEFAULT_SETTINGS.showRemainingCounts,
  };
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
    return migrateSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
