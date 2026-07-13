// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
