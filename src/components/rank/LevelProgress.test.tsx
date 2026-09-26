// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LevelProgress from './LevelProgress';

afterEach(cleanup);

describe('LevelProgress', () => {
  it('показывает уровень, ранг, значок и подпись', () => {
    render(<LevelProgress totalScore={89810} caption="подпись" />);
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 6');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Любитель');
    expect(screen.getByTestId('rank-badge')).toHaveAttribute('data-rank', 'amateur');
    expect(screen.getByTestId('level-progress')).toHaveTextContent('подпись');
  });

  it('пустой баланс — уровень 1, Новичок', () => {
    render(<LevelProgress totalScore={0} caption="" />);
    expect(screen.getByTestId('level-number')).toHaveTextContent('Уровень 1');
    expect(screen.getByTestId('rank-name')).toHaveTextContent('Новичок');
  });
});
