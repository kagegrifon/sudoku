// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// StatsView лезет в IndexedDB — мокаем журнал, чтобы тест был чистым.
vi.mock('./state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
  clearAllCompletedGames: vi.fn().mockResolvedValue(undefined),
}));

// Новые оверлеи обращаются к SW-регистрации и matchMedia — мокаем для чистоты навигационных тестов.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
);

import App from './App';

describe('App — навигация', () => {
  it('вход всегда на стартовый экран', () => {
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  it('со старта: Новая игра → выбор сложности → игровой экран', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('home-new-game'));
    // Открывается выбор сложности; выбираем и жмём «Начать» — попадаем в игру.
    fireEvent.click(screen.getByTestId('difficulty-easy'));
    fireEvent.click(screen.getByTestId('difficulty-start'));
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  it('со старта: Статистика открывает экран статистики', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('home-stats'));
    await waitFor(() => {
      expect(screen.getByTestId('stats-view')).toBeInTheDocument();
    });
  });
});
