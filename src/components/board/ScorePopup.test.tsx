// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ScorePopup from './ScorePopup';
import type { ScoreEvent } from '../../state/gameTypes';

afterEach(cleanup);

const NONE = { row: false, col: false, box: false };

function event(overrides: Partial<ScoreEvent>): ScoreEvent {
  return { id: 1, row: 2, col: 4, delta: 150, multiplier: 1, closedUnits: NONE, ...overrides };
}

describe('ScorePopup', () => {
  it('верная цифра — «+150», вид gain', () => {
    render(<ScorePopup event={event({})} />);
    const popup = screen.getByTestId('score-popup');
    expect(popup).toHaveTextContent('+150');
    expect(popup).toHaveAttribute('data-kind', 'gain');
  });

  it('закрытие юнита — «×5» и «+750», вид combo', () => {
    render(<ScorePopup event={event({ delta: 750, multiplier: 5 })} />);
    const popup = screen.getByTestId('score-popup');
    expect(popup).toHaveTextContent('×5');
    expect(popup).toHaveTextContent('+750');
    expect(popup).toHaveAttribute('data-kind', 'combo');
  });

  it('ошибка — «−150», вид loss', () => {
    render(<ScorePopup event={event({ delta: -150 })} />);
    expect(screen.getByTestId('score-popup')).toHaveTextContent('−150');
    expect(screen.getByTestId('score-popup')).toHaveAttribute('data-kind', 'loss');
  });

  it('стоит над своей клеткой', () => {
    render(<ScorePopup event={event({ row: 0, col: 0 })} />);
    expect(screen.getByTestId('score-popup').style.left).toBe(`${(0.5 / 9) * 100}%`);
  });
});
