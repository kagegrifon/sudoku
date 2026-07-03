// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import WinScreen from './WinScreen';

afterEach(cleanup);

describe('WinScreen', () => {
  it('режим победы показывает время', () => {
    render(<WinScreen result="won" elapsedSeconds={75} onNewGame={() => {}} />);
    expect(screen.getByTestId('win-screen-won')).toBeTruthy();
    expect(screen.getByTestId('win-screen').textContent).toContain('01:15');
  });
  it('режим поражения помечен своим testid', () => {
    render(<WinScreen result="lost" elapsedSeconds={40} onNewGame={() => {}} />);
    expect(screen.getByTestId('win-screen-lost')).toBeTruthy();
  });
  it('кнопка «Новая игра» вызывает onNewGame', () => {
    const onNewGame = vi.fn();
    render(<WinScreen result="won" elapsedSeconds={10} onNewGame={onNewGame} />);
    fireEvent.click(screen.getByTestId('win-new-game'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
