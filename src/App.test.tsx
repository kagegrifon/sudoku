// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// StatsView лезет в IndexedDB — мокаем журнал, чтобы тест был чистым.
vi.mock('./state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([]),
  recordCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

import App from './App';

describe('App — переключение вида', () => {
  it('по toggle-stats показывает статистику, по toggle-game возвращает игру', async () => {
    render(<App />);
    expect(screen.getByTestId('header')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-stats'));
    await waitFor(() => {
      expect(screen.getByTestId('stats-view')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toggle-game'));
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });
});
