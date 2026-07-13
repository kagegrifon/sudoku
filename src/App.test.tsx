// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// StatsView лезет в IndexedDB — мокаем журнал, чтобы тест был чистым.
vi.mock('./state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

import App from './App';

describe('App — навигация', () => {
  it('вход всегда на стартовый экран', () => {
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  it('со старта: Новая игра открывает игровой экран', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('home-new-game'));
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
