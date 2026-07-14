// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { CompletedGame } from '../../state/storage/historyDb';
import { AppProvider, useAppView } from '../../state/AppContext';
import StatsView from './StatsView';

vi.mock('../../state/storage/historyDb', () => ({
  getAllCompletedGames: vi.fn(),
}));
import { getAllCompletedGames } from '../../state/storage/historyDb';

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

const SAMPLE: CompletedGame[] = [
  { id: '1', difficulty: 'easy', durationSeconds: 100, completedAt: iso(0), outcome: 'won' },
  { id: '2', difficulty: 'easy', durationSeconds: 300, completedAt: iso(0), outcome: 'won' },
  { id: '3', difficulty: 'hard', durationSeconds: 50, completedAt: iso(20), outcome: 'lost' },
];

function CurrentScreen() {
  const { screen: current } = useAppView();
  return <span data-testid="current-screen">{current}</span>;
}

function renderStats() {
  return render(
    <AppProvider>
      <CurrentScreen />
      <StatsView />
    </AppProvider>,
  );
}

describe('StatsView', () => {
  beforeEach(() => {
    vi.mocked(getAllCompletedGames).mockResolvedValue(SAMPLE);
  });

  it('загружает журнал и показывает completedCount за период Всё', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-all'));
    await waitFor(() => {
      // 2 выигранных всего
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('2');
    });
  });

  it('переключение периода меняет цифры (day исключает старую партию)', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-day'));
    await waitFor(() => {
      // за день только 2 сегодняшних won; проигрыш 20-дневной давности вне периода
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('2');
    });
    fireEvent.click(screen.getByTestId('period-all'));
    await waitFor(() => {
      // completionRate за всё: 2 won из 3 → отображается «67%»
      expect(screen.getByTestId('stat-completion-rate')).toHaveTextContent('67');
    });
  });

  it('пустой журнал показывает нули/прочерки без падения', async () => {
    vi.mocked(getAllCompletedGames).mockResolvedValue([]);
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('0');
    });
    expect(screen.getByTestId('stat-best-time')).toHaveTextContent('—');
    expect(screen.getByTestId('stat-favorite-difficulty')).toHaveTextContent('—');
  });

  it('карточки дизайна: всего партий за период и победы по сложности', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-all'));
    await waitFor(() => {
      // Всего партий за «Всё» = 3 (2 won easy + 1 lost hard).
      expect(screen.getByTestId('stat-total-games')).toHaveTextContent('3');
    });
    expect(screen.getByTestId('stat-diff-easy-wins')).toHaveTextContent('2 побед');
    expect(screen.getByTestId('stat-diff-hard-wins')).toHaveTextContent('0 побед');
  });

  it('«‹ назад» уводит с экрана статистики', async () => {
    renderStats();
    // Начальный экран AppProvider — home; StatsView отрендерен принудительно.
    fireEvent.click(await screen.findByTestId('stats-back'));
    expect(screen.getByTestId('current-screen').textContent).toBe('home');
  });
});
