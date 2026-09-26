// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { RecordsProvider, useRecords } from './RecordsContext';

vi.mock('./storage/historyDb', () => ({
  getAllCompletedGames: vi.fn().mockResolvedValue([
    { id: '1', difficulty: 'easy', durationSeconds: 90, completedAt: '2026-09-01T00:00:00.000Z', outcome: 'won', score: 800 },
    { id: '2', difficulty: 'easy', durationSeconds: 60, completedAt: '2026-09-02T00:00:00.000Z', outcome: 'won', score: 1200 },
    { id: '3', difficulty: 'hard', durationSeconds: 30, completedAt: '2026-09-03T00:00:00.000Z', outcome: 'lost', score: 0 },
    { id: '4', difficulty: 'medium', durationSeconds: 400, completedAt: '2026-08-01T00:00:00.000Z', outcome: 'won' },
  ]),
}));

afterEach(cleanup);

function Probe() {
  const { records, bestScores, totalScore } = useRecords();
  return (
    <div>
      <span data-testid="total">{totalScore}</span>
      <span data-testid="best-easy">{String(bestScores.easy)}</span>
      <span data-testid="best-medium">{String(bestScores.medium)}</span>
      <span data-testid="time-easy">{String(records.easy)}</span>
    </div>
  );
}

describe('RecordsContext', () => {
  it('отдаёт баланс, рекорды очков и рекорды времени из журнала', async () => {
    render(
      <RecordsProvider>
        <Probe />
      </RecordsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('2000'));
    expect(screen.getByTestId('best-easy')).toHaveTextContent('1200');
    expect(screen.getByTestId('best-medium')).toHaveTextContent('null');
    expect(screen.getByTestId('time-easy')).toHaveTextContent('60');
  });
});
