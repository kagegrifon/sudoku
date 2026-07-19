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

let updateAvailableValue = false;
const applyUpdate = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({ updateAvailable: updateAvailableValue, applyUpdate }),
}));

vi.mock('../../state/GameContext', () => ({
  useGame: () => ({ state: { puzzleId: 'p1', status: 'paused' } }),
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
  updateAvailableValue = false;
  applyUpdate.mockClear();
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

  it('кнопка «Обновить» отключена, когда обновление недоступно', () => {
    updateAvailableValue = false;
    renderSettings();
    expect(screen.getByTestId('update-app')).toBeDisabled();
  });

  it('кнопка «Обновить» активна и вызывает applyUpdate, когда обновление доступно', () => {
    updateAvailableValue = true;
    renderSettings();
    const button = screen.getByTestId('update-app');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('сброс статистики вызывает clearAllCompletedGames', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('reset-stats'));
    await waitFor(() => {
      expect(vi.mocked(historyDb.clearAllCompletedGames)).toHaveBeenCalledTimes(1);
    });
  });
});
