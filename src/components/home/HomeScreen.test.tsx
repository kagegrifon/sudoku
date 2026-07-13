// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import HomeScreen from './HomeScreen';
import { AppProvider, useAppView } from '../../state/AppContext';
import { SettingsProvider } from '../../state/SettingsContext';
import { RecordsProvider } from '../../state/RecordsContext';
import { GameProvider } from '../../state/GameContext';

vi.mock('../../state/storage/historyDb', () => ({
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

function CurrentScreen() {
  const { screen: current } = useAppView();
  return <span data-testid="current-screen">{current}</span>;
}

function renderHome() {
  return render(
    <AppProvider>
      <SettingsProvider>
        <RecordsProvider>
          <GameProvider>
            <CurrentScreen />
            <HomeScreen />
          </GameProvider>
        </RecordsProvider>
      </SettingsProvider>
    </AppProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe('HomeScreen', () => {
  it('рендерит стартовый экран с кнопкой новой игры', () => {
    renderHome();
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.getByTestId('home-new-game')).toBeInTheDocument();
  });

  it('без начатой партии карточку «Продолжить» не показывает', () => {
    renderHome();
    expect(screen.queryByTestId('continue-card')).toBeNull();
  });

  it('Статистика ведёт на экран статистики', () => {
    renderHome();
    fireEvent.click(screen.getByTestId('home-stats'));
    expect(screen.getByTestId('current-screen').textContent).toBe('stats');
  });

  it('Настройки ведут на экран настроек', () => {
    renderHome();
    fireEvent.click(screen.getByTestId('home-settings'));
    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });

  it('Новая игра открывает выбор сложности, выбор ведёт в игру', async () => {
    renderHome();
    fireEvent.click(screen.getByTestId('home-new-game'));
    expect(screen.getByTestId('difficulty-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('difficulty-medium'));
    await waitFor(() => {
      expect(screen.getByTestId('current-screen').textContent).toBe('game');
    });
  });
});
