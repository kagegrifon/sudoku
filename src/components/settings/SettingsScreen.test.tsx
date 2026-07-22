// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import SettingsScreen from './SettingsScreen';
import { AppProvider } from '../../state/AppContext';
import { SettingsProvider } from '../../state/SettingsContext';
import { RecordsProvider } from '../../state/RecordsContext';
import * as historyDb from '../../state/storage/historyDb';
import type { UpdateCheckState } from '../../state/updateCheckState';

vi.mock('../../state/storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

let updateAvailableValue = false;
let checkStateValue: UpdateCheckState = 'idle';
const applyUpdate = vi.fn();
const handleVersionAction = vi.fn();
vi.mock('../../state/appUpdate', () => ({
  useAppUpdate: () => ({
    updateAvailable: updateAvailableValue,
    applyUpdate,
    checkState: checkStateValue,
    handleVersionAction,
  }),
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
  checkStateValue = 'idle';
  handleVersionAction.mockClear();
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

  it('подпись кнопки соответствует состоянию проверки', () => {
    const expectedLabels: Array<[UpdateCheckState, string]> = [
      ['idle', 'Проверить обновления'],
      ['checking', 'Проверяем…'],
      ['updateReady', 'Обновить'],
      ['notFound', 'Обновлений не найдено'],
      ['offline', 'Нет соединения'],
      ['failed', 'Не удалось проверить'],
    ];
    for (const [state, label] of expectedLabels) {
      checkStateValue = state;
      renderSettings();
      expect(screen.getByTestId('update-app').textContent).toBe(label);
      cleanup();
    }
  });

  it('кнопка отключена только во время проверки', () => {
    checkStateValue = 'checking';
    renderSettings();
    expect(screen.getByTestId('update-app')).toBeDisabled();
    cleanup();

    checkStateValue = 'idle';
    renderSettings();
    expect(screen.getByTestId('update-app')).not.toBeDisabled();
  });

  it('клик по кнопке вызывает handleVersionAction', () => {
    checkStateValue = 'idle';
    renderSettings();
    fireEvent.click(screen.getByTestId('update-app'));
    expect(handleVersionAction).toHaveBeenCalledTimes(1);
  });

  // Версия подставляется из package.json на сборке (define в vite.config.ts).
  // Если define сломается, здесь окажется пустая строка — тест это ловит.
  it('показывает подставленную версию в формате SemVer', () => {
    renderSettings();
    expect(screen.getByTestId('app-version').textContent).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('сброс статистики вызывает clearAllCompletedGames', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('reset-stats'));
    await waitFor(() => {
      expect(vi.mocked(historyDb.clearAllCompletedGames)).toHaveBeenCalledTimes(1);
    });
  });
});
