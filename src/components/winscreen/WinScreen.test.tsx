// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import WinScreen from './WinScreen';

afterEach(cleanup);

const baseProps = {
  elapsedSeconds: 75,
  difficulty: 'medium' as const,
  livesLeft: 3,
  isNewRecord: false,
  onNewGame: () => {},
  onHome: () => {},
};

describe('WinScreen', () => {
  it('режим победы показывает время и уровень', () => {
    render(<WinScreen {...baseProps} result="won" />);
    expect(screen.getByTestId('win-screen-won')).toBeTruthy();
    expect(screen.getByTestId('win-screen').textContent).toContain('01:15');
    expect(screen.getByTestId('win-screen').textContent).toContain('Средний');
  });

  it('режим поражения помечен своим testid', () => {
    render(<WinScreen {...baseProps} result="lost" />);
    expect(screen.getByTestId('win-screen-lost')).toBeTruthy();
  });

  it('бейдж рекорда показан только при isNewRecord', () => {
    const { rerender } = render(<WinScreen {...baseProps} result="won" isNewRecord={false} />);
    expect(screen.queryByTestId('new-record-badge')).toBeNull();
    rerender(<WinScreen {...baseProps} result="won" isNewRecord />);
    expect(screen.getByTestId('new-record-badge')).toBeInTheDocument();
  });

  it('кнопки «Новая игра» и «На главную» вызывают колбэки', () => {
    const onNewGame = vi.fn();
    const onHome = vi.fn();
    render(<WinScreen {...baseProps} result="won" onNewGame={onNewGame} onHome={onHome} />);
    fireEvent.click(screen.getByTestId('win-new-game'));
    fireEvent.click(screen.getByTestId('win-home'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
}

const firstWin = { score: 750, prevTotalScore: 4500, nextTotalScore: 5250, isNewScoreRecord: true };

describe('WinScreen — очки и прогресс', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reduced-motion: сразу итоговые очки, уровень и бейдж рекорда очков', () => {
    stubReducedMotion(true);
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
    expect(screen.getByTestId('score-record-badge')).toHaveTextContent('★ Рекорд очков');
  });

  it('тап по карточке — сразу финальное состояние', () => {
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
  });

  it('смена ранга: строка «Новый ранг» и новый значок', () => {
    render(
      <WinScreen
        {...baseProps}
        result="won"
        scoreSummary={{ score: 1500, prevTotalScore: 14000, nextTotalScore: 15500, isNewScoreRecord: false }}
      />,
    );
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.getByTestId('new-rank')).toHaveTextContent('Новый ранг: Ученик');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Ученик');
    expect(screen.getByTestId('rank-badge')).toHaveAttribute('data-rank', 'apprentice');
    expect(screen.queryByTestId('score-record-badge')).toBeNull();
  });

  it('без смены ранга строки нового ранга нет', () => {
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    fireEvent.click(screen.getByTestId('win-screen-won'));
    expect(screen.queryByTestId('new-rank')).toBeNull();
  });

  it('поражение: счёт зачёркнут с подписью, прогресс по старому балансу', () => {
    render(
      <WinScreen
        {...baseProps}
        result="lost"
        scoreSummary={{ score: 900, prevTotalScore: 89810, nextTotalScore: 89810, isNewScoreRecord: false }}
      />,
    );
    expect(screen.getByTestId('win-score-burned')).toHaveTextContent('900');
    expect(screen.getByTestId('win-screen')).toHaveTextContent('Очки сгорают при поражении');
    expect(screen.queryByTestId('win-score')).toBeNull();
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 6');
  });

  it('полная анимация по таймерам доходит до финала', () => {
    vi.useFakeTimers();
    // canvas в jsdom не реализован — getContext отдаёт null, движок просто не рисует.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<WinScreen {...baseProps} result="won" scoreSummary={firstWin} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 2');
    expect(screen.getByTestId('win-score')).toHaveTextContent('750');
  });
});
