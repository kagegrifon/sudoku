// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import SettingsScreen from './SettingsScreen';
import { AppProvider } from '../../state/AppContext';
import { SettingsProvider } from '../../state/SettingsContext';
import { RecordsProvider } from '../../state/RecordsContext';
import * as historyDb from '../../state/storage/historyDb';

vi.mock('../../state/storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

function renderSettings() {
  return render(
    <AppProvider>
      <SettingsProvider>
        <RecordsProvider>
          <SettingsScreen />
        </RecordsProvider>
      </SettingsProvider>
    </AppProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(historyDb.clearAllCompletedGames).mockClear();
});
afterEach(cleanup);

describe('SettingsScreen', () => {
  it('по умолчанию тема — Система (aria-checked)', () => {
    renderSettings();
    expect(screen.getByTestId('theme-system').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('theme-dark').getAttribute('aria-checked')).toBe('false');
  });

  it('выбор тёмной темы ставит data-theme=dark на <html>', () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('theme-dark'));
    expect(screen.getByTestId('theme-dark').getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('тумблер счётчика цифр по умолчанию выключен и переключается', () => {
    renderSettings();
    const toggle = screen.getByTestId('toggle-remaining');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('кнопка «Обновить» — заглушка (disabled)', () => {
    renderSettings();
    expect(screen.getByTestId('update-app')).toBeDisabled();
  });

  it('сброс статистики вызывает clearAllCompletedGames', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('reset-stats'));
    await waitFor(() => {
      expect(vi.mocked(historyDb.clearAllCompletedGames)).toHaveBeenCalledTimes(1);
    });
  });
});
