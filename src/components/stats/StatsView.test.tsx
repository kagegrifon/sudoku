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
  { id: '1', difficulty: 'easy', durationSeconds: 100, completedAt: iso(0), outcome: 'won', score: 21640 },
  { id: '2', difficulty: 'easy', durationSeconds: 300, completedAt: iso(0), outcome: 'won', score: 900 },
  { id: '3', difficulty: 'hard', durationSeconds: 50, completedAt: iso(20), outcome: 'lost', score: 0 },
  { id: '4', difficulty: 'medium', durationSeconds: 500, completedAt: iso(20), outcome: 'won' },
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
      // 3 выигранных всего (easy×2 + medium)
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('3');
    });
  });

  it('переключение периода меняет цифры (day исключает старую партию)', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-day'));
    await waitFor(() => {
      // за день только 2 сегодняшних won; проигрыш и победа 20-дневной давности вне периода
      expect(screen.getByTestId('stat-completed-count')).toHaveTextContent('2');
    });
    fireEvent.click(screen.getByTestId('period-all'));
    await waitFor(() => {
      // completionRate за всё: 3 won из 4 → отображается «75%»
      expect(screen.getByTestId('stat-completion-rate')).toHaveTextContent('75');
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
      // Всего партий за «Всё» = 4 (2 won easy + 1 lost hard + 1 won medium).
      expect(screen.getByTestId('stat-total-games')).toHaveTextContent('4');
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

  it('карточка прогресса считает баланс по всему журналу', async () => {
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stats-progress')).toHaveTextContent('Уровень 3');
    });
    // 21 640 + 900 = 22 540 → уровень 3 (с 15 000), ранг Ученик
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Ученик');
    expect(screen.getByTestId('stats-progress')).toHaveTextContent('22 540 очков');
  });

  it('рекорд очков по сложности; без побед с очками — прочерк', async () => {
    renderStats();
    await waitFor(() => {
      expect(screen.getByTestId('stat-diff-easy-best-score')).toHaveTextContent('★ 21 640 очков');
    });
    expect(screen.getByTestId('stat-diff-medium-best-score')).toHaveTextContent('—');
    expect(screen.getByTestId('stat-diff-hard-best-score')).toHaveTextContent('—');
  });

  it('рекорд очков зависит от периода, баланс — нет', async () => {
    renderStats();
    fireEvent.click(await screen.findByTestId('period-day'));
    await waitFor(() => {
      expect(screen.getByTestId('stat-diff-easy-best-score')).toHaveTextContent('21 640');
    });
    expect(screen.getByTestId('stats-progress')).toHaveTextContent('22 540');
  });
});
